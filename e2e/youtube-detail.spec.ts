import { test, expect, Page } from '@playwright/test';

// Song with a known YouTube link in the CSV
const SONG_SLUG = 'acheinu';

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

test.describe('Song detail YouTube player – 10 play cycles', () => {
  for (let i = 1; i <= 10; i++) {
    test(`play cycle ${i}`, async ({ page }) => {
      await page.goto(`/songs/${SONG_SLUG}`, { waitUntil: 'domcontentloaded' });

      const playBtn = page.locator('.yt-play-btn').first();
      await expect(playBtn).toBeVisible({ timeout: 15_000 });
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
