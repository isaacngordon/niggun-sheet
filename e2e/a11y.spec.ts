import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility audit across every public surface.
 *
 * Runs axe-core against WCAG 2.1 Level A + AA rules and reports violations
 * with the offending selector, impact and failure summary.
 *
 * Run:  npx playwright test e2e/a11y.spec.ts --project=chromium
 */

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/songs', name: 'songs-index' },
  { path: '/bencher', name: 'bencher' },
  { path: '/printonpoint', name: 'print-shop' },
  { path: '/sheet-builder', name: 'sheet-builder' },
  { path: '/sheet-builder-v2', name: 'sheet-builder-v2' },
  { path: '/smartboard-mode', name: 'smartboard' },
  { path: '/contact', name: 'contact' },
  { path: '/tracking-disclosure', name: 'tracking-disclosure' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

/** Rules disabled because they cannot be evaluated meaningfully in this setup. */
const DISABLED_RULES = [
  // Requires a full user journey; covered by manual review instead.
  'region',
];

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    test(`a11y: ${route.name} (${viewport.name})`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'chromium',
        'axe audit runs on chromium only',
      );

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(route.path, { waitUntil: 'networkidle' });
      // Let client-rendered panels settle before scanning.
      await page.waitForTimeout(750);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .disableRules(DISABLED_RULES)
        .analyze();

      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
        failure: v.nodes[0]?.failureSummary,
      }));

      if (summary.length > 0) {
        console.log(
          `\n${route.name} (${viewport.name}) — ${results.violations.length} violation types\n` +
            JSON.stringify(summary, null, 2),
        );
      }

      await testInfo.attach(`axe-${route.name}-${viewport.name}.json`, {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      });

      expect(
        summary.map((s) => `${s.id} (${s.nodes}x) ${s.help}`),
        `Accessibility violations on ${route.path} @ ${viewport.name}`,
      ).toEqual([]);
    });
  }
}
