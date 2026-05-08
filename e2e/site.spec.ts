import { expect, Page, test } from '@playwright/test';

function watchForHydrationErrors(page: Page) {
  const messages: string[] = [];

  page.on('console', (message) => {
    const text = message.text();
    if (/hydration failed|hydration mismatch|server rendered html|did not match/i.test(text)) {
      messages.push(text);
    }
  });

  page.on('pageerror', (error) => {
    if (/hydration failed|hydration mismatch|server rendered html|did not match/i.test(error.message)) {
      messages.push(error.message);
    }
  });

  return () => expect(messages).toEqual([]);
}

test.describe('Niggun Sheet site QA', () => {
  test('homepage presents the intended hero, CTAs, footer links, and privacy control', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Niggun Sheet');
    await expect(page.getByRole('heading', { name: 'Discover Your Perfect Niggun' })).toBeVisible();
    await expect(page.getByText('Drag + Drop')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download Niggun Sheet' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try Sheet Builder' })).toHaveAttribute('href', '/sheet-builder');
    await expect(page.getByRole('heading', { name: 'Smartboard Friendly Mode' })).toBeVisible();

    await expect(page.getByRole('contentinfo').getByRole('button', { name: 'Niggun Sheet' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tracking Disclosure' })).toHaveAttribute('href', '/tracking-disclosure');
    await expect(page.getByRole('button', { name: 'Privacy' })).toBeVisible();
  });

  test('contact page has clean metadata and accessible form labels', async ({ page }) => {
    await page.goto('/contact');

    await expect(page).toHaveTitle('Get in Touch | Niggun Sheet');
    await expect(page.getByRole('heading', { name: 'Get in Touch' })).toBeVisible();
    await expect(page.getByLabel('Your Name or Yeshiva')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel("What's This About?")).toBeVisible();
    await expect(page.getByLabel('Message')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();

    await expect(page.getByText('Get in Touch 🎵')).toHaveCount(0);
    await expect(page.locator('main[aria-hidden="true"]')).toHaveCount(0);
  });

  test('tracking disclosure page replaces old broken static policy link', async ({ page, request }) => {
    const response = await request.get('/tracking-disclosure');
    expect(response.status()).toBe(200);

    await page.goto('/tracking-disclosure');
    await expect(page).toHaveTitle('Tracking Disclosure | Niggun Sheet');
    await expect(page.getByRole('heading', { name: 'Tracking Disclosure' })).toBeVisible();
    await expect(page.getByText('Analytics are used as a count.')).toBeVisible();
    await expect(page.getByText('No personal data is sold, shared, or used for advertising profiles.')).toBeVisible();
  });

  test('song directory stays in list mode and supports searching/filtering', async ({ page }) => {
    await page.goto('/songs');

    await expect(page).toHaveTitle('Song Directory | Niggun Sheet');
    await expect(page.getByRole('heading', { name: 'Song Directory' })).toBeVisible();
    await expect(page.getByPlaceholder('Search by title, artist, or lyrics...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All Songs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Library' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'My Songs' })).toBeVisible();

    await expect(page.getByRole('button', { name: /grid/i })).toHaveCount(0);
    await page.getByPlaceholder('Search by title, artist, or lyrics...').fill('Acheinu');
    await expect(page.getByRole('link', { name: /Acheinu/ }).first()).toBeVisible();
    await expect(page.getByText(/Showing \d+ of 85 niggunim/)).toBeVisible();
  });

  test('song detail exposes lyrics and smartboard handoff without relying on external playback', async ({ page }) => {
    await page.goto('/songs/acheinu');

    await expect(page.getByRole('heading', { name: 'Acheinu' })).toBeVisible();
    await expect(page.getByText('D\'veykus')).toBeVisible();
    await expect(page.getByRole('link', { name: /Smartboard/i })).toHaveAttribute('href', /\/smartboard-mode\?/);
  });

  test('sheet builder loads controls without hydration mismatch warnings', async ({ page }) => {
    const assertNoHydrationErrors = watchForHydrationErrors(page);

    await page.goto('/sheet-builder', { waitUntil: 'commit' });
    await expect(page).toHaveTitle('Sheet Builder | Niggun Sheet');
    await expect(page.getByRole('button', { name: 'Song Library' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'My Songs' })).toBeVisible();
    await expect(page.getByPlaceholder('Search songs...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
    await expect(page.locator('.sb2-status').getByText('Drag songs to the sheet', { exact: true })).toBeVisible();

    await page.waitForTimeout(500);
    assertNoHydrationErrors();
  });

  test('smartboard regular and no-timing playhead modes remain usable', async ({ page }) => {
    const lyrics = ['Acheinu line 1', 'Acheinu line 2', 'Acheinu line 3'].join('\n');
    await page.goto(`/smartboard-mode?slug=acheinu&lyrics=${encodeURIComponent(lyrics)}`);

    await expect(page.getByText('Acheinu line 1 Acheinu line 2 Acheinu line 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Playhead' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Decrease font size' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Increase font size' })).toBeVisible();

    await page.getByRole('button', { name: 'Start Playhead' }).click();
    await expect(page.getByRole('button', { name: 'Pause Playhead' })).toBeVisible();
    await expect(page.getByText('1 / 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acheinu line 2' }).first()).toBeVisible();
  });

  test('generated SEO routes are reachable', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const robotsText = await robots.text();
    expect(robotsText).toContain('Sitemap:');
    expect(robotsText).toContain('/sitemap.xml');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain('<loc>https://niggunsheet.com/songs</loc>');
    expect(sitemapText).toContain('<loc>https://niggunsheet.com/sheet-builder</loc>');
  });

  test('API returns usable song records', async ({ request }) => {
    const response = await request.get('/api/songs');
    expect(response.status()).toBe(200);

    const songs = await response.json();
    expect(Array.isArray(songs)).toBe(true);
    expect(songs.length).toBeGreaterThan(50);
    expect(songs[0]).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        lyrics: expect.any(String),
      }),
    );
  });
});
