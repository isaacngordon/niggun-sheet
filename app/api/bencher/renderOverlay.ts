import type { Browser } from 'puppeteer-core';

// Vector overlay renderer: prints a transparent HTML page to PDF via headless
// Chromium so Hebrew text (real text shaping) and ornament SVGs stay vector
// instead of being rasterized to PNG. In production this runs on
// @sparticuz/chromium (bundled Vercel-compatible binary); locally it falls
// back to the full `puppeteer` package's bundled Chromium.

const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = isServerless ? launchServerless() : launchLocal();
  }
  return browserPromise;
}

async function launchServerless(): Promise<Browser> {
  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = await import('puppeteer-core');
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

async function launchLocal(): Promise<Browser> {
  const puppeteer = await import('puppeteer');
  return puppeteer.launch({ headless: true }) as unknown as Promise<Browser>;
}

export async function renderOverlayPdf(html: string, widthPt: number, heightPt: number): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      width: `${widthPt / 72}in`,
      height: `${heightPt / 72}in`,
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    return pdf;
  } finally {
    await page.close();
  }
}
