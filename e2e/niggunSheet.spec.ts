import { test, expect } from '@playwright/test';

test.describe('Niggun Sheet E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  /* ─── Homepage ──────────────────────────────────────────── */

  test('homepage loads with hero content', async ({ page }) => {
    await expect(page.locator('.hero-title')).toBeVisible();
    await expect(page.locator('text=Download Niggun Sheet')).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    const nav = page.locator('.header-nav');
    await expect(nav.locator('text=Home')).toBeVisible();
    await expect(nav.locator('text=Song Directory')).toBeVisible();
    await expect(nav.locator('text=Sheet Builder')).toBeVisible();
    await expect(nav.locator('text=Contact')).toBeVisible();
  });

  /* ─── Preview overlay flow ──────────────────────────────── */

  test('clicking Download Niggun Sheet opens the preview overlay', async ({ page }) => {
    // Click the hero download button
    await page.locator('.hero-buttons >> text=Download Niggun Sheet').click();

    // The overlay should appear (loading state first)
    const overlay = page.locator('.ns-preview-overlay');
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    // Wait for PDF to generate — the iframe should eventually appear
    const iframe = page.locator('.ns-preview-iframe');
    await expect(iframe).toBeVisible({ timeout: 30_000 });
  });

  test('preview overlay has toolbar with checkboxes and buttons', async ({ page }) => {
    await page.locator('.hero-buttons >> text=Download Niggun Sheet').click();

    // Wait for ready state (iframe visible)
    await expect(page.locator('.ns-preview-iframe')).toBeVisible({ timeout: 30_000 });

    // Toolbar elements
    const toolbar = page.locator('.ns-preview-toolbar');
    await expect(toolbar.locator('text=Niggun Sheet Preview')).toBeVisible();
    await expect(toolbar.locator('text=Show Titles')).toBeVisible();
    await expect(toolbar.locator('text=Set List')).toBeVisible();
    await expect(toolbar.locator('text=Download PDF')).toBeVisible();
    await expect(toolbar.locator('text=Close')).toBeVisible();
  });

  test('Show Titles checkbox is checked by default', async ({ page }) => {
    await page.locator('.hero-buttons >> text=Download Niggun Sheet').click();
    await expect(page.locator('.ns-preview-iframe')).toBeVisible({ timeout: 30_000 });

    const showTitlesCheckbox = page.locator('.ns-preview-checkbox').filter({ hasText: 'Show Titles' }).locator('input[type="checkbox"]');
    await expect(showTitlesCheckbox).toBeChecked();
  });

  test('Set List checkbox is unchecked by default', async ({ page }) => {
    await page.locator('.hero-buttons >> text=Download Niggun Sheet').click();
    await expect(page.locator('.ns-preview-iframe')).toBeVisible({ timeout: 30_000 });

    const setListCheckbox = page.locator('.ns-preview-checkbox').filter({ hasText: 'Set List' }).locator('input[type="checkbox"]');
    await expect(setListCheckbox).not.toBeChecked();
  });

  test('checking Set List disables Show Titles', async ({ page }) => {
    await page.locator('.hero-buttons >> text=Download Niggun Sheet').click();
    await expect(page.locator('.ns-preview-iframe')).toBeVisible({ timeout: 30_000 });

    // Check Set List
    const setListCheckbox = page.locator('.ns-preview-checkbox').filter({ hasText: 'Set List' }).locator('input[type="checkbox"]');
    await setListCheckbox.check();

    // Show Titles should now be disabled
    const showTitlesCheckbox = page.locator('.ns-preview-checkbox').filter({ hasText: 'Show Titles' }).locator('input[type="checkbox"]');
    await expect(showTitlesCheckbox).toBeChecked();
    await expect(showTitlesCheckbox).toBeDisabled();
  });

  test('toggling Show Titles regenerates the preview', async ({ page }) => {
    await page.locator('.hero-buttons >> text=Download Niggun Sheet').click();
    const iframe = page.locator('.ns-preview-iframe');
    await expect(iframe).toBeVisible({ timeout: 30_000 });

    // Grab original blob URL
    const srcBefore = await iframe.getAttribute('src');

    // Uncheck Show Titles
    const showTitlesCheckbox = page.locator('.ns-preview-checkbox').filter({ hasText: 'Show Titles' }).locator('input[type="checkbox"]');
    await showTitlesCheckbox.uncheck();

    // Wait for new PDF (iframe src changes)
    await expect(iframe).toBeVisible({ timeout: 30_000 });
    // After regeneration, src should be different (new blob URL)
    await page.waitForFunction(
      (oldSrc) => {
        const f = document.querySelector('.ns-preview-iframe') as HTMLIFrameElement;
        return f && f.src !== oldSrc;
      },
      srcBefore,
      { timeout: 30_000 },
    );
  });

  test('Close button closes the preview overlay', async ({ page }) => {
    await page.locator('.hero-buttons >> text=Download Niggun Sheet').click();
    await expect(page.locator('.ns-preview-iframe')).toBeVisible({ timeout: 30_000 });

    // Click close
    await page.locator('.ns-preview-btn-close').click();

    // Overlay should disappear
    await expect(page.locator('.ns-preview-overlay')).not.toBeVisible();
  });

  /* ─── Navigation ────────────────────────────────────────── */

  test('Song Directory page loads', async ({ page }) => {
    await page.locator('.header-nav >> text=Song Directory').click();
    await expect(page).toHaveURL(/\/songs/);
  });

  test('Contact page loads', async ({ page }) => {
    await page.locator('.header-nav >> text=Contact').click();
    await expect(page).toHaveURL(/\/contact/);
  });

  /* ─── Header download button ────────────────────────────── */

  test('header Download Sheet button opens preview', async ({ page }) => {
    await page.locator('.header-download-btn').click();
    const overlay = page.locator('.ns-preview-overlay');
    await expect(overlay).toBeVisible({ timeout: 10_000 });
  });

  /* ─── API route ─────────────────────────────────────────── */

  test('API /api/songs returns JSON array', async ({ request }) => {
    const res = await request.get('/api/songs');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    // Each song should have title and lyrics
    expect(body[0]).toHaveProperty('title');
    expect(body[0]).toHaveProperty('lyrics');
  });
});
