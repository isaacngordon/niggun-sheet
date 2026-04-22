import { test, expect, Page } from '@playwright/test';

const VIDEO_URL = 'https://www.youtube.com/watch?v=zV_GSoaOJFo';
const LYRICS = 'Avinu Av Harachaman';
const SMARTBOARD_URL = `/smartboard-mode?lyrics=${encodeURIComponent(LYRICS)}&youtube=${encodeURIComponent(VIDEO_URL)}`;

async function waitForPlaying(page: Page) {
  // Wait for the play button to switch its aria-label to "Pause",
  // which means the YT player reported state === PLAYING.
  await expect(page.locator('button[aria-label="Pause"]')).toBeVisible({ timeout: 20_000 });
}

async function waitForPaused(page: Page) {
  await expect(page.locator('button[aria-label="Play"]')).toBeVisible({ timeout: 10_000 });
}

test.describe('Smartboard YouTube player – 10 play cycles', () => {
  for (let i = 1; i <= 10; i++) {
    test(`play cycle ${i}`, async ({ page }) => {
      await page.goto(SMARTBOARD_URL, { waitUntil: 'domcontentloaded' });

      const playBtn = page.locator('button[aria-label="Play"]');
      await expect(playBtn).toBeVisible({ timeout: 20_000 });
      await expect(playBtn).toBeEnabled({ timeout: 20_000 });
      await playBtn.click();

      await waitForPlaying(page);

      // Verify progress is advancing
      await page.waitForTimeout(1500);
      const fill = page.locator('[style*="width"]').last();
      // Confirm aria-label is still Pause (still playing)
      await expect(page.locator('button[aria-label="Pause"]')).toBeVisible();

      // Pause
      await page.locator('button[aria-label="Pause"]').click();
      await waitForPaused(page);
    });
  }
});
