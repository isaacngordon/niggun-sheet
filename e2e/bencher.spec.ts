import { expect, type Page, test } from '@playwright/test';

test.describe('Bencher builder', () => {
  const switchBencherMode = async (page: Page, mode: '2-page' | '4-page') => {
    const modeButton = page.getByTestId(`bencher-mode-${mode}`);

    if (await modeButton.getAttribute('aria-pressed') !== 'true') {
      await modeButton.click();
    }

    await expect(modeButton).toHaveAttribute('aria-pressed', 'true');
  };

  const expectActiveBencherPage = async (page: Page, pageNumber: number) => {
    await expect(page.getByRole('button', { name: `Show page ${pageNumber}` })).toHaveAttribute('aria-pressed', 'true');
  };

  const expectBencherPageArt = async (page: Page, pageNumber: number, mode: '2-page' | '4-page') => {
    const prefix = mode === '2-page' ? 'Bencher-2pg' : 'Bencher-4pg';
    await expect
      .poll(async () => page.getByTestId(`bencher-page-${pageNumber}`).locator('.bencher-page-art').getAttribute('src'))
      .toContain(`/assets/bencher/${prefix}-p${pageNumber}.svg`);
  };

  const showBencherPage = async (page: Page, pageNumber: number) => {
    const pageButton = page.getByRole('button', { name: `Show page ${pageNumber}` });

    if (await pageButton.getAttribute('aria-pressed') !== 'true') {
      await pageButton.click();
    }

    await expectActiveBencherPage(page, pageNumber);
    await expect(page.getByTestId(`bencher-page-${pageNumber}`)).toBeVisible();
  };

  const clickPageTurnButton = async (page: Page, direction: 'left' | 'right') => {
    const button = page.getByTestId(direction === 'left' ? 'bencher-turn-left-button' : 'bencher-turn-right-button');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
  };

  const dragAcrossBencherPage = async (page: Page, pageNumber: number, direction: 'left' | 'right') => {
    const pageElement = page.getByTestId(`bencher-page-${pageNumber}`);
    await expect(pageElement).toBeVisible();

    const box = await pageElement.boundingBox();
    expect(box).not.toBeNull();

    const startX = direction === 'left' ? box!.x + box!.width * 0.88 : box!.x + box!.width * 0.12;
    const endX = direction === 'left' ? box!.x + box!.width * 0.12 : box!.x + box!.width * 0.88;
    const y = box!.y + box!.height * 0.25;

    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps: 24 });
    await page.mouse.up();
  };

  test('supports both four-page and two-page modes with the logo and song drop zones in the required spaces', async ({ page }) => {
    await page.goto('/bencher');

    await expect(page).toHaveTitle('Bencher Builder | Niggun Sheet');
    await expect(page.getByRole('heading', { name: 'Bencher Builder' })).toBeVisible();
    await expect(page.getByTestId('bencher-page-1')).toBeVisible();
    await expect(page.locator('.bencher-page')).toHaveCount(4);
    await expectBencherPageArt(page, 1, '4-page');

    const pageOne = await page.getByTestId('bencher-page-1').boundingBox();
    const logo = await page.getByTestId('bencher-logo-target').boundingBox();
    await showBencherPage(page, 4);
    await expectBencherPageArt(page, 4, '4-page');
    const pageFour = await page.getByTestId('bencher-page-4').boundingBox();
    const dropZone = await page.getByTestId('bencher-song-drop-zone').boundingBox();

    expect(pageOne).not.toBeNull();
    expect(pageFour).not.toBeNull();
    expect(logo).not.toBeNull();
    expect(dropZone).not.toBeNull();

    const pageOneBox = pageOne!;
    const pageFourBox = pageFour!;
    const logoBox = logo!;
    const dropBox = dropZone!;

    expect(logoBox.x).toBeGreaterThan(pageOneBox.x + pageOneBox.width * 0.48);
    expect(logoBox.y).toBeLessThan(pageOneBox.y + pageOneBox.height * 0.1);
    expect(logoBox.width).toBeGreaterThan(pageOneBox.width * 0.42);
    expect(logoBox.x + logoBox.width).toBeLessThanOrEqual(pageOneBox.x + pageOneBox.width * 0.97);
    expect(logoBox.height).toBeGreaterThan(pageOneBox.height * 0.08);
    expect(logoBox.height).toBeLessThan(pageOneBox.height * 0.14);

    expect(dropBox.x).toBeLessThan(pageFourBox.x + pageFourBox.width * 0.12);
    expect(dropBox.y).toBeLessThan(pageFourBox.y + pageFourBox.height * 0.1);
    expect(dropBox.width).toBeGreaterThan(pageFourBox.width * 0.42);
    expect(dropBox.x + dropBox.width).toBeLessThanOrEqual(pageFourBox.x + pageFourBox.width * 0.55);
    expect(dropBox.height).toBeGreaterThan(pageFourBox.height * 0.85);

    await switchBencherMode(page, '2-page');
    await expect(page.locator('.bencher-page')).toHaveCount(2);
    await expectBencherPageArt(page, 1, '2-page');
    await showBencherPage(page, 2);
    await expectBencherPageArt(page, 2, '2-page');
    await expect(page.getByRole('button', { name: 'Show page 3' })).toHaveCount(0);
  });

  test('uses the Sheet Builder DnD components to add songs into the page four song area', async ({ page }) => {
    await page.goto('/bencher');
    await showBencherPage(page, 4);

    await expect(page.getByTestId('bencher-library-song').first()).toBeVisible();
    await expect(page.locator('.bencher-song-library .sb2-song-item').first()).toBeVisible();
    await expect(page.locator('.bencher-song-drop-zone .sb2-drop-slot')).toHaveCount(1);

    await page.locator('.bencher-song-library .sb2-song-item').first().dblclick();
    await expectActiveBencherPage(page, 4);

    await expect(page.locator('.bencher-song-drop-zone .sb2-song-card')).toHaveCount(1);
    await expect(page.locator('.bencher-song-drop-zone .sb2-drop-slot')).toHaveCount(2);
    await expect(page.getByTestId('bencher-song-drop-zone')).toContainText('Avinu Av Harachaman');
  });

  test('accepts a dragged Sheet Builder library song into the page four song area', async ({ page }) => {
    await page.goto('/bencher');
    await showBencherPage(page, 4);

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

  test('keeps bencher song text proportional when the preview scale changes', async ({ page }) => {
    const readSongScale = async () => {
      const pageBox = await page.getByTestId('bencher-page-4').boundingBox();
      const fontSize = await page.locator('.bencher-song-drop-zone .sb2-song-card-lyrics').evaluate((element) => {
        return Number.parseFloat(window.getComputedStyle(element).fontSize);
      });

      expect(pageBox).not.toBeNull();

      return {
        pageWidth: pageBox!.width,
        fontSize,
        ratio: fontSize / pageBox!.width,
      };
    };

    await page.setViewportSize({ width: 1200, height: 780 });
    await page.goto('/bencher');
    await showBencherPage(page, 4);
    await page.locator('.bencher-song-library .sb2-song-item').first().dblclick();
    await expect(page.locator('.bencher-song-drop-zone .sb2-song-card')).toHaveCount(1);

    const compactScale = await readSongScale();

    await page.setViewportSize({ width: 1600, height: 980 });
    await expect
      .poll(async () => (await page.getByTestId('bencher-page-4').boundingBox())?.width ?? 0)
      .toBeGreaterThan(compactScale.pageWidth + 20);

    const expandedScale = await readSongScale();

    expect(expandedScale.fontSize).toBeGreaterThan(compactScale.fontSize);
    expect(Math.abs(expandedScale.ratio - compactScale.ratio)).toBeLessThan(0.0015);
  });

  test('briefly steps through intermediate pages when skipping across multiple pages', async ({ page }) => {
    await page.goto('/bencher');

    await expectActiveBencherPage(page, 1);
    await page.getByRole('button', { name: 'Show page 4' }).click();

    await expect.poll(async () => page.getByRole('button', { name: 'Show page 2' }).getAttribute('aria-pressed')).toBe('true');
    await page.waitForTimeout(130);
    await expect.poll(async () => page.getByRole('button', { name: 'Show page 3' }).getAttribute('aria-pressed')).toBe('true');
    await expect.poll(async () => page.getByRole('button', { name: 'Show page 4' }).getAttribute('aria-pressed')).toBe('true');
  });

  test('keeps page turn buttons outside the page and uses them to turn pages', async ({ page }) => {
    await page.goto('/bencher');

    await expectActiveBencherPage(page, 1);

    const pageOne = await page.getByTestId('bencher-page-1').boundingBox();
    const leftButton = await page.getByTestId('bencher-turn-left-button').boundingBox();
    const rightButton = await page.getByTestId('bencher-turn-right-button').boundingBox();

    expect(pageOne).not.toBeNull();
    expect(leftButton).not.toBeNull();
    expect(rightButton).not.toBeNull();

    expect(leftButton!.x + leftButton!.width).toBeLessThan(pageOne!.x);
    expect(rightButton!.x).toBeGreaterThan(pageOne!.x + pageOne!.width);

    await clickPageTurnButton(page, 'right');
    await expectActiveBencherPage(page, 2);

    await clickPageTurnButton(page, 'right');
    await expectActiveBencherPage(page, 3);

    await clickPageTurnButton(page, 'right');
    await expectActiveBencherPage(page, 4);

    await clickPageTurnButton(page, 'left');
    await expectActiveBencherPage(page, 3);
  });

  test('does not turn pages by dragging the flipbook surface', async ({ page }) => {
    await page.goto('/bencher');

    await expectActiveBencherPage(page, 1);
    await dragAcrossBencherPage(page, 1, 'left');
    await page.waitForTimeout(1000);
    await expectActiveBencherPage(page, 1);

    await clickPageTurnButton(page, 'right');
    await expectActiveBencherPage(page, 2);
    await dragAcrossBencherPage(page, 2, 'right');
    await page.waitForTimeout(1000);
    await expectActiveBencherPage(page, 2);
  });

  test('keeps page two active briefly before finishing the return to page one', async ({ page }) => {
    await page.goto('/bencher');

    await showBencherPage(page, 2);
    await page.getByRole('button', { name: 'Flip to page 1' }).click();

    await page.waitForTimeout(120);
    await expectActiveBencherPage(page, 2);
    await expectActiveBencherPage(page, 1);
  });
});