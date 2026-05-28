import { expect, test } from '@playwright/test';

test.describe('Bencher builder', () => {
  test('renders exactly two pages with the logo and song drop zones in the required spaces', async ({ page }) => {
    await page.goto('/bencher');

    await expect(page).toHaveTitle('Bencher Builder | Niggun Sheet');
    await expect(page.getByRole('heading', { name: 'Bencher Builder' })).toBeVisible();
    await expect(page.getByTestId('bencher-page-1')).toBeVisible();
    await expect(page.getByTestId('bencher-page-2')).toBeVisible();
    await expect(page.locator('.bencher-page')).toHaveCount(2);

    const pageOne = await page.getByTestId('bencher-page-1').boundingBox();
    const pageTwo = await page.getByTestId('bencher-page-2').boundingBox();
    const logo = await page.getByTestId('bencher-logo-target').boundingBox();
    const dropZone = await page.getByTestId('bencher-song-drop-zone').boundingBox();

    expect(pageOne).not.toBeNull();
    expect(pageTwo).not.toBeNull();
    expect(logo).not.toBeNull();
    expect(dropZone).not.toBeNull();

    const pageOneBox = pageOne!;
    const pageTwoBox = pageTwo!;
    const logoBox = logo!;
    const dropBox = dropZone!;

    expect(logoBox.x).toBeGreaterThan(pageOneBox.x + pageOneBox.width * 0.6);
    expect(logoBox.y).toBeLessThan(pageOneBox.y + pageOneBox.height * 0.15);
    expect(logoBox.width).toBeGreaterThan(logoBox.height);
    expect(logoBox.x + logoBox.width).toBeLessThanOrEqual(pageOneBox.x + pageOneBox.width * 0.95);

    expect(dropBox.x).toBeLessThan(pageTwoBox.x + pageTwoBox.width * 0.1);
    expect(dropBox.width).toBeGreaterThan(pageTwoBox.width * 0.28);
    expect(dropBox.width).toBeLessThan(pageTwoBox.width * 0.35);
    expect(dropBox.x + dropBox.width).toBeLessThanOrEqual(pageTwoBox.x + pageTwoBox.width * 0.37);
    expect(dropBox.height).toBeGreaterThan(pageTwoBox.height * 0.85);
  });

  test('uses the Sheet Builder DnD components to add songs into the page two column', async ({ page }) => {
    await page.goto('/bencher');

    await expect(page.getByTestId('bencher-library-song').first()).toBeVisible();
    await expect(page.locator('.bencher-song-library .sb2-song-item').first()).toBeVisible();
    await expect(page.locator('.bencher-song-drop-zone .sb2-drop-slot')).toHaveCount(1);

    await page.locator('.bencher-song-library .sb2-song-item').first().dblclick();

    await expect(page.locator('.bencher-song-drop-zone .sb2-song-card')).toHaveCount(1);
    await expect(page.locator('.bencher-song-drop-zone .sb2-drop-slot')).toHaveCount(2);
    await expect(page.getByTestId('bencher-song-drop-zone')).toContainText('Avinu Av Harachaman');
  });

  test('accepts a dragged Sheet Builder library song into the page two left-third drop zone', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox synthetic mouse drag is unreliable with dnd-kit; Chromium covers pointer drag.');

    await page.goto('/bencher');

    const source = page.locator('.bencher-song-library .sb2-song-item').nth(1);
    const target = page.locator('.bencher-song-drop-zone .sb2-drop-slot-expanded').first();
    await expect(source).toBeVisible();
    await expect(target).toBeVisible();

    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, { steps: 15 });
    await page.mouse.up();

    await expect(page.locator('.bencher-song-drop-zone .sb2-song-card')).toHaveCount(1);
    await expect(page.getByTestId('bencher-song-drop-zone')).toContainText('Acheinu');
  });
});