# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site.spec.ts >> Niggun Sheet site QA >> song directory stays in list mode and supports searching/filtering
- Location: e2e/site.spec.ts:64:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Showing \d+ of 85 niggunim/)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/Showing \d+ of 85 niggunim/)

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "Niggun Sheet" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "Niggun Sheet" [ref=e6]
      - navigation [ref=e7]:
        - list [ref=e8]:
          - listitem [ref=e9]:
            - link "Home" [ref=e10] [cursor=pointer]:
              - /url: /
          - listitem [ref=e11]:
            - link "Song Directory" [ref=e12] [cursor=pointer]:
              - /url: /songs
          - listitem [ref=e13]:
            - link "Sheet Builder new" [ref=e14] [cursor=pointer]:
              - /url: /sheet-builder
              - text: Sheet Builder
              - generic [ref=e15]: new
          - listitem [ref=e16]:
            - link "Bencher Creator" [ref=e17] [cursor=pointer]:
              - /url: /bencher
          - listitem [ref=e18]:
            - link "Contact" [ref=e19] [cursor=pointer]:
              - /url: /contact
      - generic [ref=e20]:
        - button "[dbg]" [ref=e21] [cursor=pointer]
        - button "Sign In" [disabled] [ref=e23]
        - button "Download Sheet" [ref=e24] [cursor=pointer]
  - main [ref=e25]:
    - heading "Song Directory" [level=1] [ref=e26]
    - searchbox "Search by title, artist, or lyrics..." [active] [ref=e28]: Acheinu
    - generic [ref=e30]:
      - button "All Songs" [ref=e31] [cursor=pointer]
      - button "Library" [ref=e32] [cursor=pointer]
      - button "My Songs" [ref=e33] [cursor=pointer]
    - paragraph [ref=e34]: Showing 1 entry from 1 song
    - generic [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: Track
        - generic [ref=e38]: Playback + Actions
      - generic [ref=e39]:
        - link "01 Acheinu D'veykus" [ref=e40] [cursor=pointer]:
          - /url: /songs/acheinu?timingSource=youtube%3Aq4PxCtN5BgE
          - generic [ref=e41]:
            - generic [ref=e42]: "01"
            - generic [ref=e43]:
              - heading "Acheinu" [level=3] [ref=e44]
              - paragraph [ref=e45]: D'veykus
        - paragraph [ref=e46]: אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה
        - generic [ref=e47]:
          - generic [ref=e49]:
            - button "Play" [ref=e50] [cursor=pointer]:
              - img [ref=e51]
            - generic [ref=e54]: "--:--"
          - link "Smartboard" [ref=e56] [cursor=pointer]:
            - /url: /smartboard-mode?slug=acheinu&lyrics=%D7%90%D6%B7%D7%97%D6%B5%D7%99%D7%A0%D7%95%D6%BC%20%D7%9B%D6%B8%D6%BC%D7%9C%20%D7%91%D6%B5%D6%BC%D7%99%D7%AA%20%D7%99%D6%B4%D7%A9%D6%B0%D7%82%D7%A8%D6%B8%D7%90%D6%B5%D7%9C%0A%D7%94%D6%B7%D7%A0%D6%B0%D6%BC%D7%AA%D7%95%D6%BC%D7%A0%D6%B4%D7%99%D7%9D%20%D7%91%D6%B0%D6%BC%D7%A6%D6%B8%D7%A8%D6%B8%D7%94%20%D7%95%D6%BC%D7%91%D6%B7%D7%A9%D6%B4%D6%BC%D7%81%D7%91%D6%B0%D7%99%D6%B8%D7%94%0A%D7%94%D6%B8%D7%A2%D7%95%D6%B9%D7%9E%D6%B0%D7%93%D6%B4%D7%99%D7%9D%20%D7%91%D6%B5%D6%BC%D7%99%D7%9F%20%D7%91%D6%B7%D6%BC%D7%99%D6%B8%D6%BC%D7%9D%20%D7%95%D6%BC%D7%91%D6%B5%D7%99%D7%9F%20%D7%91%D6%B7%D6%BC%D7%99%D6%B7%D6%BC%D7%91%D6%B8%D6%BC%D7%A9%D6%B8%D7%81%D7%94%20%0A%D7%94%D6%B7%D7%9E%D6%B8%D6%BC%D7%A7%D7%95%D6%B9%D7%9D%20%D7%99%D6%B0%D7%A8%D6%B7%D7%97%D6%B5%D7%9D%20%D7%A2%D6%B2%D7%9C%D6%B5%D7%99%D7%94%D6%B6%D7%9D%0A%D7%95%D6%B0%D7%99%D7%95%D6%B9%D7%A6%D6%B4%D7%99%D7%90%D6%B5%D7%9D%20%D7%9E%D6%B4%D7%A6%D6%B8%D6%BC%D7%A8%D6%B8%D7%94%20%D7%9C%D6%B4%D7%A8%D6%B0%D7%95%D6%B8%D7%97%D6%B8%D7%94%0A%D7%95%D6%BC%D7%9E%D6%B5%D7%90%D6%B2%D7%A4%D6%B5%D7%9C%D6%B8%D7%94%20%D7%9C%D6%B0%D7%90%D7%95%D6%B9%D7%A8%D6%B8%D7%94%0A%D7%95%D6%BC%D7%9E%D6%B4%D7%A9%D6%B4%D6%BC%D7%81%D7%A2%D6%B0%D7%91%D6%BC%D7%95%D6%BC%D7%93%20%D7%9C%D6%B4%D7%92%D6%B0%D7%90%D6%BB%D7%9C%D6%B8%D6%BC%D7%94%20%0A%D7%94%D6%B7%D7%A9%D6%B0%D7%81%D7%AA%D6%B8%D6%BC%D7%90%20%D7%91%D6%B7%D6%BC%D7%A2%D6%B2%D7%92%D6%B8%D7%9C%D6%B8%D7%90%20%D7%95%D6%BC%D7%91%D6%B4%D7%96%D6%B0%D7%9E%D6%B7%D7%9F%20%D7%A7%D6%B8%D7%A8%D6%B4%D7%99%D7%91..&youtube=https%3A%2F%2Fyoutu.be%2Fq4PxCtN5BgE&timingSource=youtube%3Aq4PxCtN5BgE
            - img [ref=e57]
            - generic [ref=e61]: Smartboard
  - contentinfo [ref=e62]:
    - generic [ref=e63]:
      - generic [ref=e64]:
        - generic [ref=e65]:
          - heading "Downloads" [level=4] [ref=e66]
          - button "Niggun Sheet" [ref=e67] [cursor=pointer]
          - link "Simcha Sheet" [ref=e68] [cursor=pointer]:
            - /url: https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link
        - generic [ref=e69]:
          - heading "Navigation" [level=4] [ref=e70]
          - link "Song Directory" [ref=e71] [cursor=pointer]:
            - /url: /songs
          - link "Sheet Builder" [ref=e72] [cursor=pointer]:
            - /url: /sheet-builder
          - link "Contact" [ref=e73] [cursor=pointer]:
            - /url: /contact
        - generic [ref=e74]:
          - heading "Legal" [level=4] [ref=e75]
          - link "Contact Us" [ref=e76] [cursor=pointer]:
            - /url: /contact
          - link "Tracking Disclosure" [ref=e77] [cursor=pointer]:
            - /url: /tracking-disclosure
          - paragraph [ref=e78]: Choose cookie-based or fallback analytics from the privacy control.
      - generic [ref=e79]:
        - paragraph [ref=e80]: © 2026 Yehudah Jacobs - The Niggun Sheet
        - paragraph [ref=e81]: Discover Your Perfect Niggun
  - generic "Privacy settings" [ref=e82]:
    - button "Privacy" [ref=e83] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e89] [cursor=pointer]:
    - img [ref=e90]
  - alert [ref=e94]
```

# Test source

```ts
  1   | import { expect, Page, test } from '@playwright/test';
  2   | 
  3   | function watchForHydrationErrors(page: Page) {
  4   |   const messages: string[] = [];
  5   | 
  6   |   page.on('console', (message) => {
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
> 77  |     await expect(page.getByText(/Showing \d+ of 85 niggunim/)).toBeVisible();
      |                                                                ^ Error: expect(locator).toBeVisible() failed
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
  107 |     await expect(page.getByText('Acheinu line 1 Acheinu line 2 Acheinu line 3')).toBeVisible();
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