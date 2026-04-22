import { test, expect, Page } from '@playwright/test';

async function waitForPlaying(page: Page) {
  await expect(
    page.locator('.yt-audio-player button[aria-label="Pause"]').first()
  ).toBeVisible({ timeout: 20_000 });
}

async function waitForPaused(page: Page) {
  await expect(
    page.locator('.yt-audio-player button[aria-label="Play"]').first()
  ).toBeVisible({ timeout: 10_000 });
}

test.describe('Songs list YouTube player – 10 play cycles', () => {
  for (let i = 1; i <= 10; i++) {
    test(`play cycle ${i}`, async ({ page }) => {
      await page.goto('/songs', { waitUntil: 'domcontentloaded' });

      // Find the first song card that has a YouTube player
      const firstPlayer = page.locator('.yt-audio-player').first();
      await expect(firstPlayer).toBeVisible({ timeout: 15_000 });

      const playBtn = firstPlayer.locator('.yt-play-btn');
      await expect(playBtn).toBeEnabled({ timeout: 10_000 });
      await playBtn.click();

      await waitForPlaying(page);

      // Let it play briefly and confirm still going
      await page.waitForTimeout(1500);
      await expect(
        page.locator('.yt-audio-player button[aria-label="Pause"]').first()
      ).toBeVisible();

      // Pause
      await page.locator('.yt-audio-player button[aria-label="Pause"]').first().click();
      await waitForPaused(page);
    });
  }
});
