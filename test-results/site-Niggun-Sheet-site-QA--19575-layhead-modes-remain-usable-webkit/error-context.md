# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site.spec.ts >> Niggun Sheet site QA >> smartboard regular and no-timing playhead modes remain usable
- Location: e2e/site.spec.ts:103:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Acheinu line 1 Acheinu line 2 Acheinu line 3')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Acheinu line 1 Acheinu line 2 Acheinu line 3')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e5]:
      - generic [ref=e6] [cursor=pointer]: Acheinu line 1
      - generic [ref=e7] [cursor=pointer]: Acheinu line 2
      - generic [ref=e8] [cursor=pointer]: Acheinu line 3
    - generic [ref=e9]:
      - generic [ref=e10]:
        - button "Back" [ref=e11] [cursor=pointer]
        - button "Start Playhead" [ref=e12] [cursor=pointer]
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Font
          - generic [ref=e17]:
            - button "Decrease font size" [ref=e18] [cursor=pointer]: −
            - button "Increase font size" [ref=e19] [cursor=pointer]: +
        - generic [ref=e20]:
          - generic [ref=e21]: Dark
          - generic [ref=e22]:
            - checkbox "Dark" [checked]
  - generic "Privacy settings" [ref=e25]:
    - button "Privacy" [ref=e26] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e32] [cursor=pointer]:
    - img [ref=e33]
  - alert [ref=e38]
```

# Test source

```ts
  7   |     const text = message.text();
  8   |     if (/hydration failed|hydration mismatch|server rendered html|did not match/i.test(text)) {
  9   |       messages.push(text);
  10  |     }
  11  |   });
  12  | 
  13  |   page.on('pageerror', (error) => {
  14  |     if (/hydration failed|hydration mismatch|server rendered html|did not match/i.test(error.message)) {
  15  |       messages.push(error.message);
  16  |     }
  17  |   });
  18  | 
  19  |   return () => expect(messages).toEqual([]);
  20  | }
  21  | 
  22  | test.describe('Niggun Sheet site QA', () => {
  23  |   test('homepage presents the intended hero, CTAs, footer links, and privacy control', async ({ page }) => {
  24  |     await page.goto('/');
  25  | 
  26  |     await expect(page).toHaveTitle('Niggun Sheet');
  27  |     await expect(page.getByRole('heading', { name: 'Discover Your Perfect Niggun' })).toBeVisible();
  28  |     await expect(page.getByText('Drag + Drop')).toBeVisible();
  29  |     await expect(page.getByRole('button', { name: 'Download Niggun Sheet' })).toBeVisible();
  30  |     await expect(page.getByRole('link', { name: 'Try Sheet Builder' })).toHaveAttribute('href', '/sheet-builder');
  31  |     await expect(page.getByRole('heading', { name: 'Smartboard Friendly Mode' })).toBeVisible();
  32  | 
  33  |     await expect(page.getByRole('contentinfo').getByRole('button', { name: 'Niggun Sheet' })).toBeVisible();
  34  |     await expect(page.getByRole('link', { name: 'Tracking Disclosure' })).toHaveAttribute('href', '/tracking-disclosure');
  35  |     await expect(page.getByRole('button', { name: 'Privacy' })).toBeVisible();
  36  |   });
  37  | 
  38  |   test('contact page has clean metadata and accessible form labels', async ({ page }) => {
  39  |     await page.goto('/contact');
  40  | 
  41  |     await expect(page).toHaveTitle('Get in Touch | Niggun Sheet');
  42  |     await expect(page.getByRole('heading', { name: 'Get in Touch' })).toBeVisible();
  43  |     await expect(page.getByLabel('Your Name or Yeshiva')).toBeVisible();
  44  |     await expect(page.getByLabel('Email')).toBeVisible();
  45  |     await expect(page.getByLabel("What's This About?")).toBeVisible();
  46  |     await expect(page.getByLabel('Message')).toBeVisible();
  47  |     await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  48  | 
  49  |     await expect(page.getByText('Get in Touch 🎵')).toHaveCount(0);
  50  |     await expect(page.locator('main[aria-hidden="true"]')).toHaveCount(0);
  51  |   });
  52  | 
  53  |   test('tracking disclosure page replaces old broken static policy link', async ({ page, request }) => {
  54  |     const response = await request.get('/tracking-disclosure');
  55  |     expect(response.status()).toBe(200);
  56  | 
  57  |     await page.goto('/tracking-disclosure');
  58  |     await expect(page).toHaveTitle('Tracking Disclosure | Niggun Sheet');
  59  |     await expect(page.getByRole('heading', { name: 'Tracking Disclosure' })).toBeVisible();
  60  |     await expect(page.getByText('Analytics are used as a count.')).toBeVisible();
  61  |     await expect(page.getByText('No personal data is sold, shared, or used for advertising profiles.')).toBeVisible();
  62  |   });
  63  | 
  64  |   test('song directory stays in list mode and supports searching/filtering', async ({ page }) => {
  65  |     await page.goto('/songs');
  66  | 
  67  |     await expect(page).toHaveTitle('Song Directory | Niggun Sheet');
  68  |     await expect(page.getByRole('heading', { name: 'Song Directory' })).toBeVisible();
  69  |     await expect(page.getByPlaceholder('Search by title, artist, or lyrics...')).toBeVisible();
  70  |     await expect(page.getByRole('button', { name: 'All Songs' })).toBeVisible();
  71  |     await expect(page.getByRole('button', { name: 'Library' })).toBeVisible();
  72  |     await expect(page.getByRole('button', { name: 'My Songs' })).toBeVisible();
  73  | 
  74  |     await expect(page.getByRole('button', { name: /grid/i })).toHaveCount(0);
  75  |     await page.getByPlaceholder('Search by title, artist, or lyrics...').fill('Acheinu');
  76  |     await expect(page.getByRole('link', { name: /Acheinu/ }).first()).toBeVisible();
  77  |     await expect(page.getByText(/Showing \d+ of 85 niggunim/)).toBeVisible();
  78  |   });
  79  | 
  80  |   test('song detail exposes lyrics and smartboard handoff without relying on external playback', async ({ page }) => {
  81  |     await page.goto('/songs/acheinu');
  82  | 
  83  |     await expect(page.getByRole('heading', { name: 'Acheinu' })).toBeVisible();
  84  |     await expect(page.getByText('D\'veykus')).toBeVisible();
  85  |     await expect(page.getByRole('link', { name: /Smartboard/i })).toHaveAttribute('href', /\/smartboard-mode\?/);
  86  |   });
  87  | 
  88  |   test('sheet builder loads controls without hydration mismatch warnings', async ({ page }) => {
  89  |     const assertNoHydrationErrors = watchForHydrationErrors(page);
  90  | 
  91  |     await page.goto('/sheet-builder', { waitUntil: 'commit' });
  92  |     await expect(page).toHaveTitle('Sheet Builder | Niggun Sheet');
  93  |     await expect(page.getByRole('button', { name: 'Song Library' })).toBeVisible();
  94  |     await expect(page.getByRole('button', { name: 'My Songs' })).toBeVisible();
  95  |     await expect(page.getByPlaceholder('Search songs...')).toBeVisible();
  96  |     await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
  97  |     await expect(page.locator('.sb2-status').getByText('Drag songs to the sheet', { exact: true })).toBeVisible();
  98  | 
  99  |     await page.waitForTimeout(500);
  100 |     assertNoHydrationErrors();
  101 |   });
  102 | 
  103 |   test('smartboard regular and no-timing playhead modes remain usable', async ({ page }) => {
  104 |     const lyrics = ['Acheinu line 1', 'Acheinu line 2', 'Acheinu line 3'].join('\n');
  105 |     await page.goto(`/smartboard-mode?slug=acheinu&lyrics=${encodeURIComponent(lyrics)}`);
  106 | 
> 107 |     await expect(page.getByText('Acheinu line 1 Acheinu line 2 Acheinu line 3')).toBeVisible();
      |                                                                                  ^ Error: expect(locator).toBeVisible() failed
  108 |     await expect(page.getByRole('button', { name: 'Start Playhead' })).toBeVisible();
  109 |     await expect(page.getByRole('button', { name: 'Decrease font size' })).toBeVisible();
  110 |     await expect(page.getByRole('button', { name: 'Increase font size' })).toBeVisible();
  111 | 
  112 |     await page.getByRole('button', { name: 'Start Playhead' }).click();
  113 |     await expect(page.getByRole('button', { name: 'Pause Playhead' })).toBeVisible();
  114 |     await expect(page.getByText('1 / 3')).toBeVisible();
  115 |     await expect(page.getByRole('button', { name: 'Acheinu line 2' }).first()).toBeVisible();
  116 |   });
  117 | 
  118 |   test('generated SEO routes are reachable', async ({ request }) => {
  119 |     const robots = await request.get('/robots.txt');
  120 |     expect(robots.status()).toBe(200);
  121 |     const robotsText = await robots.text();
  122 |     expect(robotsText).toContain('Sitemap:');
  123 |     expect(robotsText).toContain('/sitemap.xml');
  124 | 
  125 |     const sitemap = await request.get('/sitemap.xml');
  126 |     expect(sitemap.status()).toBe(200);
  127 |     const sitemapText = await sitemap.text();
  128 |     expect(sitemapText).toContain('<loc>https://niggunsheet.com/songs</loc>');
  129 |     expect(sitemapText).toContain('<loc>https://niggunsheet.com/sheet-builder</loc>');
  130 |   });
  131 | 
  132 |   test('API returns usable song records', async ({ request }) => {
  133 |     const response = await request.get('/api/songs');
  134 |     expect(response.status()).toBe(200);
  135 | 
  136 |     const songs = await response.json();
  137 |     expect(Array.isArray(songs)).toBe(true);
  138 |     expect(songs.length).toBeGreaterThan(50);
  139 |     expect(songs[0]).toEqual(
  140 |       expect.objectContaining({
  141 |         title: expect.any(String),
  142 |         lyrics: expect.any(String),
  143 |       }),
  144 |     );
  145 |   });
  146 | });
  147 | 
```