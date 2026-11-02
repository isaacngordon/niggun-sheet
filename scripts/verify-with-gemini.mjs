#!/usr/bin/env node
/**
 * Visual verification harness.
 *
 * Captures screenshots of the running app with Playwright, then asks the Gemini
 * API to review them against a task description and report layout/UX problems.
 *
 * Configuration comes from `.env.local` (never hardcode secrets here):
 *
 *   GEMINI_API_KEY     required - API key for the Gemini API
 *   GEMINI_MODEL       optional - defaults to `gemini-3.1-pro`
 *   VERIFY_BASE_URL    optional - defaults to `http://127.0.0.1:3000`
 *   VERIFY_COOKIE      optional - raw `Cookie:` header value for signed-in pages
 *   VERIFY_DEVICE      optional - Playwright device name, defaults to `iPhone 13`
 *   VERIFY_PATHS       optional - comma-separated paths, defaults below
 *
 * Usage:
 *   node scripts/verify-with-gemini.mjs
 *   node scripts/verify-with-gemini.mjs --prompt "Check the smartphone layout"
 *   node scripts/verify-with-gemini.mjs --full-page
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { chromium, devices } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });

const API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const MODEL = (process.env.GEMINI_MODEL || 'gemini-3.1-pro').trim();
const BASE_URL = (process.env.VERIFY_BASE_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
const COOKIE = (process.env.VERIFY_COOKIE || '').trim();
const DEVICE = (process.env.VERIFY_DEVICE || 'iPhone 13').trim();
const DEFAULT_PATHS = '/songs,/bencher,/sheet-builder';
const PATHS = (process.env.VERIFY_PATHS || DEFAULT_PATHS)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const argv = process.argv.slice(2);
const flagIndex = argv.findIndex((arg) => arg === '--prompt');
const FULL_PAGE = argv.includes('--full-page');
const DEFAULT_PROMPT =
  'You are reviewing screenshots of a Next.js app for layout and UX defects. ' +
  'Report concrete, specific problems: elements that look cramped, overlapping, clipped, ' +
  'misaligned, inconsistently sized, or hard to tap on a phone. ' +
  'For each issue give the visible symptom and the region of the screen. ' +
  'Be blunt and skip praise. If a screen looks fine, say so in one line.';
const PROMPT = flagIndex !== -1 && argv[flagIndex + 1] ? argv[flagIndex + 1] : DEFAULT_PROMPT;

const OUT_DIR = path.join(ROOT, 'test-results', 'gemini-verify');

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function slugifyPath(target) {
  return target.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'root';
}

async function capture(page, target) {
  const url = `${BASE_URL}${target}`;
  const file = path.join(OUT_DIR, `${slugifyPath(target)}.png`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 }).catch(async () => {
    // networkidle can stall on pages that poll; fall back to a settled load.
    await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: file, fullPage: FULL_PAGE });

  return { target, url, file, bytes: fs.readFileSync(file) };
}

async function review(shots) {
  const parts = [{ text: `${PROMPT}\n\nScreenshots below, in order.` }];

  for (const shot of shots) {
    parts.push({ text: `\n[${shot.target}] (${shot.url})` });
    parts.push({ inline_data: { mime_type: 'image/png', data: shot.bytes.toString('base64') } });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload?.error?.message || `HTTP ${response.status}`;
    if (response.status === 404) {
      throw new Error(
        `Model "${MODEL}" not found for this key. Set GEMINI_MODEL in .env.local to a model your key can use. (${detail})`,
      );
    }
    throw new Error(`Gemini request failed: ${detail}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n');

  return text || '(Gemini returned no text output.)';
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const device = devices[DEVICE];
  if (!device) {
    fail(`Unknown Playwright device "${DEVICE}". Set VERIFY_DEVICE in .env.local to a valid device name.`);
  }

  console.log(`Capturing ${PATHS.length} page(s) at ${BASE_URL}`);
  console.log(`Device: ${DEVICE}${FULL_PAGE ? ' (full page)' : ''}  |  Model: ${MODEL}`);
  console.log(`Auth cookie: ${COOKIE ? 'provided' : 'not set (public pages only)'}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...device,
    ...(COOKIE ? { extraHTTPHeaders: { Cookie: COOKIE } } : {}),
  });
  const page = await context.newPage();

  const shots = [];
  try {
    for (const target of PATHS) {
      const shot = await capture(page, target);
      console.log(`captured ${target} -> ${path.relative(ROOT, shot.file)}`);
      shots.push(shot);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nScreenshots written to ${path.relative(ROOT, OUT_DIR)}/`);

  if (!API_KEY) {
    fail(
      'GEMINI_API_KEY is empty in .env.local, so the screenshots were captured but not reviewed.\n' +
        'Add your key there (and optionally GEMINI_MODEL), then re-run:\n' +
        '  npm run verify:gemini',
    );
  }

  console.log('\nSending to Gemini for review...\n');
  const reviewText = await review(shots);

  console.log('===== Gemini review =====\n');
  console.log(reviewText);
  console.log('\n=========================');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
