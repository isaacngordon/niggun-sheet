# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site.spec.ts >> Niggun Sheet site QA >> homepage presents the intended hero, CTAs, footer links, and privacy control
- Location: e2e/site.spec.ts:23:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Discover Your Perfect Niggun' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Discover Your Perfect Niggun' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "Niggun Sheet" [ref=e5]:
        - /url: /
        - img "Niggun Sheet" [ref=e6]
      - navigation [ref=e7]:
        - list [ref=e8]:
          - listitem [ref=e9]:
            - link "Home" [ref=e10]:
              - /url: /
          - listitem [ref=e11]:
            - link "Song Directory" [ref=e12]:
              - /url: /songs
          - listitem [ref=e13]:
            - link "Sheet Builder new" [ref=e14]:
              - /url: /sheet-builder
              - text: Sheet Builder
              - generic [ref=e15]: new
          - listitem [ref=e16]:
            - link "Bencher Creator" [ref=e17]:
              - /url: /bencher
          - listitem [ref=e18]:
            - link "Contact" [ref=e19]:
              - /url: /contact
      - generic [ref=e20]:
        - button "[dbg]" [ref=e21] [cursor=pointer]
        - button "Sign In" [ref=e23] [cursor=pointer]
        - button "Download Sheet" [ref=e24] [cursor=pointer]
  - main [ref=e25]:
    - generic [ref=e27]:
      - generic [ref=e28]:
        - generic [ref=e29]: Built for the kumzitz
        - heading "Add your songs. Build your sheet. Run the room." [level=1] [ref=e30]
        - paragraph [ref=e31]: Niggun Sheet isnt a streaming site, its not a lyrics site, its a combination of both. Letting you read, practice, print your own, or show it in your classroom. This site is built for anyone who wants to learn or share a niggun
        - generic [ref=e34]:
          - generic [ref=e39]: Sheet Builder in action
          - generic [ref=e40]:
            - generic [ref=e41]:
              - generic [ref=e42]:
                - generic [ref=e43]: Song Library
                - generic [ref=e44]: My Songs
              - generic [ref=e45]: "Search: ki karov"
              - generic [ref=e46]:
                - strong [ref=e47]: "Tip:"
                - text: Drag songs to the sheet or double-click to add them.
              - generic [ref=e48]:
                - generic [ref=e49]: Ki Karov
                - generic [ref=e50]: Eitan Katz
              - generic [ref=e51]:
                - generic [ref=e52]: Kol Haolam Kulo
                - generic [ref=e53]: Rabbi Dovit Chait
              - generic [ref=e54]:
                - generic [ref=e55]: Keser
                - generic [ref=e56]: Isaac Honig
              - generic [ref=e57]:
                - generic [ref=e58]: Lev Tahor
                - generic [ref=e59]: Yeedle Werdyger
            - generic [ref=e61]:
              - generic [ref=e62]:
                - generic [ref=e63]: Auto-fit
                - generic [ref=e64]: 2 columns
                - generic [ref=e65]: Titles
              - generic [ref=e67]:
                - generic [ref=e68]: Page 1
                - generic [ref=e73]:
                  - generic [ref=e74]: Kummzitz Sheet
                  - generic [ref=e75]:
                    - generic [ref=e76]:
                      - generic [ref=e77]:
                        - generic [ref=e78]:
                          - generic [ref=e79]: "1"
                          - generic [ref=e80]: Ki Karov
                        - generic [ref=e81]:
                          - generic [ref=e82]: כִּי קָרוֹב אֵלֶיךָ הַדָבָר מְאוֹד
                          - generic [ref=e83]: בְּפִיךָ וּבִלְבָבְךָ לַעֲשׂוֹתוֹ
                      - generic [ref=e84]:
                        - generic [ref=e85]:
                          - generic [ref=e86]: "3"
                          - generic [ref=e87]: Keser
                        - generic [ref=e89]: כֶּתֶר יִתְּנוּ לְךָ
                    - generic [ref=e91]:
                      - generic [ref=e92]:
                        - generic [ref=e93]: "2"
                        - generic [ref=e94]: Kol Haolam Kulo
                      - generic [ref=e96]: כָּל הָעוֹלָם כּוּלוֹ גֶּשֶׁר צַר מְאֹד
            - generic:
              - generic: Ki Karov
              - generic: Eitan Katz
            - generic:
              - generic: Kol Haolam Kulo
              - generic: Rabbi Dovit Chait
            - generic:
              - generic: Keser
              - generic: Isaac Honig
          - generic [ref=e97]:
            - generic [ref=e98]: Search songs
            - generic [ref=e99]: Drag to sheet
            - generic [ref=e100]: Download PDF
        - generic [ref=e101]:
          - link "Open Sheet Builder" [ref=e102]:
            - /url: /sheet-builder
          - link "Browse Song Directory" [ref=e103]:
            - /url: /songs
        - generic [ref=e104]:
          - generic [ref=e105]: Need the ready-made sheets?
          - generic [ref=e106]:
            - button "Niggun Sheet PDF" [ref=e107]
            - link "Simcha Sheet PDF" [ref=e108]:
              - /url: https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link
      - generic [ref=e110]:
        - generic [ref=e115]:
          - generic [ref=e116]:
            - generic [ref=e117]: Smartboard mode
            - generic [ref=e118]: Live
          - generic [ref=e119]:
            - generic [ref=e120]: כִּי קָרוֹב אֵלֶיךָ הַדָּבָר מְאֹד
            - generic [ref=e121]: בְּפִיךָ וּבִלְבָבְךָ לַעֲשֹׂתוֹ
            - generic [ref=e122]: Ki Karov in smartboard mode
        - generic [ref=e125]:
          - generic [ref=e126]:
            - generic [ref=e127]: Song library
            - generic [ref=e128]: "Search: ki karov"
            - generic [ref=e129]:
              - generic [ref=e130]:
                - strong [ref=e131]: Ki Karov
                - generic [ref=e132]: Eitan Katz
              - generic [ref=e133]:
                - strong [ref=e134]: Kol Haolam Kulo
                - generic [ref=e135]: Rabbi Dovit Chait
              - generic [ref=e136]:
                - strong [ref=e137]: Keser
                - generic [ref=e138]: Isaac Honig
          - generic [ref=e139]:
            - generic [ref=e140]: Live sheet
            - generic [ref=e141]: Motzaei Shabbos Set
            - list [ref=e142]:
              - listitem [ref=e143]: Ki Karov
              - listitem [ref=e144]: Kol Haolam Kulo
              - listitem [ref=e145]: Keser
              - listitem [ref=e146]: Lev Tahor
            - generic [ref=e147]: 2 columns. English titles. Compact spacing.
    - generic [ref=e149]:
      - generic [ref=e150]:
        - generic [ref=e151]: start from the beginning
        - heading "the core features" [level=2] [ref=e152]
        - paragraph [ref=e153]: The three parts that make up this project
      - generic [ref=e154]:
        - article [ref=e155]:
          - generic [ref=e156]: "01"
          - heading "Find the song" [level=3] [ref=e157]
          - paragraph [ref=e158]: Open the database to see lyrics and music put together for a learning experience like no other
          - link "Open Song Directory" [ref=e159]:
            - /url: /songs
        - article [ref=e160]:
          - generic [ref=e161]: "02"
          - heading "Build Your Own" [level=3] [ref=e162]
          - paragraph [ref=e163]: Use the drag-and-drop builder to make your very own kumzits sheet
          - link "Open Sheet Builder" [ref=e164]:
            - /url: /sheet-builder
        - article [ref=e165]:
          - generic [ref=e166]: "03"
          - heading "Grab a ready-made sheet" [level=3] [ref=e167]
          - paragraph [ref=e168]: If you want the whole shebang, download the ready made sheet with all you need for a kumzits
          - button "Download Niggun Sheet" [ref=e169]
    - generic [ref=e171]:
      - generic [ref=e172]:
        - generic [ref=e173]: Why the smarboard mode?
        - heading "geared for classrooms. Easy to navigate on the fly." [level=2] [ref=e174]
        - paragraph [ref=e175]: Gone are the days of copy and pasting from online and fumbling with word processors to show something on the board. This one's purpose built.
      - list [ref=e176]:
        - listitem [ref=e177]:
          - generic [ref=e178]: "1"
          - generic [ref=e179]: Find your song
        - listitem [ref=e180]:
          - generic [ref=e181]: "2"
          - generic [ref=e182]: Tap to focus on a line
        - listitem [ref=e183]:
          - generic [ref=e184]: "3"
          - generic [ref=e185]: Enter playhead mode
        - listitem [ref=e186]:
          - generic [ref=e187]: "4"
          - generic [ref=e188]: Watch as the auto-timed lyrics do the rest
  - contentinfo [ref=e189]:
    - generic [ref=e190]:
      - generic [ref=e191]:
        - generic [ref=e192]:
          - heading "Downloads" [level=4] [ref=e193]
          - button "Niggun Sheet" [ref=e194] [cursor=pointer]
          - link "Simcha Sheet" [ref=e195]:
            - /url: https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link
        - generic [ref=e196]:
          - heading "Navigation" [level=4] [ref=e197]
          - link "Song Directory" [ref=e198]:
            - /url: /songs
          - link "Sheet Builder" [ref=e199]:
            - /url: /sheet-builder
          - link "Contact" [ref=e200]:
            - /url: /contact
        - generic [ref=e201]:
          - heading "Legal" [level=4] [ref=e202]
          - link "Contact Us" [ref=e203]:
            - /url: /contact
          - link "Tracking Disclosure" [ref=e204]:
            - /url: /tracking-disclosure
          - paragraph [ref=e205]: Choose cookie-based or fallback analytics from the privacy control.
      - generic [ref=e206]:
        - paragraph [ref=e207]: © 2026 Yehudah Jacobs - The Niggun Sheet
        - paragraph [ref=e208]: Discover Your Perfect Niggun
  - generic "Privacy settings" [ref=e209]:
    - button "Privacy" [ref=e210] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e216] [cursor=pointer]:
    - img [ref=e217]
  - alert [ref=e222]
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
> 27  |     await expect(page.getByRole('heading', { name: 'Discover Your Perfect Niggun' })).toBeVisible();
      |                                                                                       ^ Error: expect(locator).toBeVisible() failed
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
```