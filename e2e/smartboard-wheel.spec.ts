import { test, expect, Locator } from '@playwright/test';

const TIMED_LYRICS = [
  'Acheinu line 1',
  'Acheinu line 2',
  'Acheinu line 3',
  'Acheinu line 4',
  'Acheinu line 5',
  'Acheinu line 6',
  'Acheinu line 7',
  'Acheinu line 8',
].join('\n');

const SMARTBOARD_WHEEL_URL = `/smartboard-mode?slug=acheinu&lyrics=${encodeURIComponent(TIMED_LYRICS)}`;

async function getRequiredBoundingBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

test.describe('Smartboard wheel', () => {
  test('clicking a lower verse moves it into focus', async ({ page }) => {
    await page.goto(SMARTBOARD_WHEEL_URL, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Start Playhead' }).click();

    const wheel = page.getByTestId('smartboard-wheel');
    const lowerVerse = page.getByTestId('smartboard-verse-3');

    await expect(wheel).toBeVisible();
    await expect(lowerVerse).toBeVisible();
    await expect(lowerVerse).toHaveAttribute('data-current', 'false');

    const beforeBox = await getRequiredBoundingBox(lowerVerse);

    await lowerVerse.click();

    await expect(lowerVerse).toHaveAttribute('data-current', 'true');

    const afterBox = await getRequiredBoundingBox(lowerVerse);
    expect(beforeBox.y - afterBox.y).toBeGreaterThan(100);
  });
});