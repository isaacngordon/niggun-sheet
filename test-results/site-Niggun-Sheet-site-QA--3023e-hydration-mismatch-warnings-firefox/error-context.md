# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site.spec.ts >> Niggun Sheet site QA >> sheet builder loads controls without hydration mismatch warnings
- Location: e2e/site.spec.ts:88:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder('Search songs...')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByPlaceholder('Search songs...')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - banner [ref=e5]:
      - link "NIGGUN SHEET" [ref=e6] [cursor=pointer]:
        - /url: /
        - text: "||| NIGGUN SHEET"
      - navigation "Main" [ref=e7]:
        - link "Home" [ref=e8] [cursor=pointer]:
          - /url: /
        - link "Songs" [ref=e9] [cursor=pointer]:
          - /url: /songs
        - link "Sheet Builder" [ref=e10] [cursor=pointer]:
          - /url: /sheet-builder
        - link "Bencher" [ref=e11] [cursor=pointer]:
          - /url: /bencher
        - link "Contact" [ref=e12] [cursor=pointer]:
          - /url: /contact
      - generic [ref=e13]:
        - button "Sign in" [ref=e15] [cursor=pointer]
        - button "Download Sheet" [ref=e16] [cursor=pointer]
    - generic [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]:
            - button "Song Library" [ref=e21] [cursor=pointer]
            - button "My Songs" [ref=e22] [cursor=pointer]
          - generic [ref=e23]: 85 songs available
          - textbox "85 songs available" [ref=e24]:
            - /placeholder: Search by title or artist
        - generic [ref=e25]:
          - strong [ref=e26]: "Quick add:"
          - text: Double-click a song to add it fast, or drag it into the sheet to place it where you want.
        - generic [ref=e27]:
          - button "Acheinu D'veykus" [ref=e28]:
            - generic [ref=e29]:
              - generic: Acheinu
            - generic: D'veykus
          - button "Al Tira Miami" [ref=e30]:
            - generic [ref=e31]:
              - generic: Al Tira
            - generic: Miami
          - button "Al Zeh Hayah Sruli Hersh,Eli hersh" [ref=e32]:
            - generic [ref=e33]:
              - generic: Al Zeh Hayah
            - generic: Sruli Hersh,Eli hersh
          - button "Ana Hashem Carlebach" [ref=e34]:
            - generic [ref=e35]:
              - generic: Ana Hashem
            - generic: Carlebach
          - button "Ani Maamin Unknown" [ref=e36]:
            - generic [ref=e37]:
              - generic: Ani Maamin
            - generic: Unknown
          - button "Ani Maamin Abie Rottenberg" [ref=e38]:
            - generic [ref=e39]:
              - generic: Ani Maamin
            - generic: Abie Rottenberg
          - button "Ani Yishaina Pischi Li R Baruch Ber Liebowitz" [ref=e40]:
            - generic [ref=e41]:
              - generic: Ani Yishaina Pischi Li
            - generic: R Baruch Ber Liebowitz
          - button "Atoh Horaisa Ayn Kamocha Pinky Weber" [ref=e42]:
            - generic [ref=e43]:
              - generic: Atoh Horaisa Ayn Kamocha
            - generic: Pinky Weber
          - button "Avinu Av Harachaman Chaim Banet" [ref=e44]:
            - generic [ref=e45]:
              - generic: Avinu Av Harachaman
            - generic: Chaim Banet
          - button "B'shoh - Anovim Yaakov Schwekey" [ref=e46]:
            - generic [ref=e47]:
              - generic: B'shoh - Anovim
            - generic: Yaakov Schwekey
          - button "Baavur Avoseinu naftali kempeh" [ref=e48]:
            - generic [ref=e49]:
              - generic: Baavur Avoseinu
            - generic: naftali kempeh
          - button "Bilvovi Rav Yitzchok Hutner/R Brazil" [ref=e50]:
            - generic [ref=e51]:
              - generic: Bilvovi
            - generic: Rav Yitzchok Hutner/R Brazil
          - button "Bsheim Hashem Benny Friedman" [ref=e52]:
            - generic [ref=e53]:
              - generic: Bsheim Hashem
            - generic: Benny Friedman
          - button "Chamol R Akiva Homnick" [ref=e54]:
            - generic [ref=e55]:
              - generic: Chamol
            - generic: R Akiva Homnick
          - button "Chasoif Yaakov Schwekey" [ref=e56]:
            - generic [ref=e57]:
              - generic: Chasoif
            - generic: Yaakov Schwekey
          - button "Chazek Kiryasi Ari Goldwag" [ref=e58]:
            - generic [ref=e59]:
              - generic: Chazek Kiryasi
            - generic: Ari Goldwag
          - button "Chesed Yitzy Bald/NYBC" [ref=e60]:
            - generic [ref=e61]:
              - generic: Chesed
            - generic: Yitzy Bald/NYBC
          - button "Eilecha Carlebach" [ref=e62]:
            - generic [ref=e63]:
              - generic: Eilecha
            - generic: Carlebach
          - button "Ein Aroch Shalsheles" [ref=e64]:
            - generic [ref=e65]:
              - generic: Ein Aroch
            - generic: Shalsheles
          - button "Ekrah Shalsheles" [ref=e66]:
            - generic [ref=e67]:
              - generic: Ekrah
            - generic: Shalsheles
          - button "Elokai Baruch Levine" [ref=e68]:
            - generic [ref=e69]:
              - generic: Elokai
            - generic: Baruch Levine
          - button "Esa Einai Shalsheles" [ref=e70]:
            - generic [ref=e71]:
              - generic: Esa Einai
            - generic: Shalsheles
          - button "Gam Ki Eilech carlebach" [ref=e72]:
            - generic [ref=e73]:
              - generic: Gam Ki Eilech
            - generic: carlebach
          - button "Habein Yakir Li dveykus" [ref=e74]:
            - generic [ref=e75]:
              - generic: Habein Yakir Li
            - generic: dveykus
          - button "Habeit abie rotenberg" [ref=e76]:
            - generic [ref=e77]:
              - generic: Habeit
            - generic: abie rotenberg
          - button "Hamalach Unknown" [ref=e78]:
            - generic [ref=e79]:
              - generic: Hamalach
            - generic: Unknown
          - button "Hishbati shlomo yehudah rechnitz" [ref=e80]:
            - generic [ref=e81]:
              - generic: Hishbati
            - generic: shlomo yehudah rechnitz
          - button "Ich Vil Zein Shmuli unger" [ref=e82]:
            - generic [ref=e83]:
              - generic: Ich Vil Zein
            - generic: Shmuli unger
          - button "Ilan Ilan Abie Rottenberg" [ref=e84]:
            - generic [ref=e85]:
              - generic: Ilan Ilan
            - generic: Abie Rottenberg
          - button "Im Eshkochech Shwekey" [ref=e86]:
            - generic [ref=e87]:
              - generic: Im Eshkochech
            - generic: Shwekey
          - button "Im Hayu Mesikus Hatorah Yisroel Werdyger" [ref=e88]:
            - generic [ref=e89]:
              - generic: Im Hayu Mesikus Hatorah
            - generic: Yisroel Werdyger
          - button "Kad Yasvun Benny Friedman" [ref=e90]:
            - generic [ref=e91]:
              - generic: Kad Yasvun
            - generic: Benny Friedman
          - button "Keayol Taarog Unknown" [ref=e92]:
            - generic [ref=e93]:
              - generic: Keayol Taarog
            - generic: Unknown
          - button "Keser Isaac Honig" [ref=e94]:
            - generic [ref=e95]:
              - generic: Keser
            - generic: Isaac Honig
          - button "Ki Karov Eitan katz" [ref=e96]:
            - generic [ref=e97]:
              - generic: Ki Karov
            - generic: Eitan katz
          - button "Ki Lashem eitan katz?" [ref=e98]:
            - generic [ref=e99]:
              - generic: Ki Lashem
            - generic: eitan katz?
          - button "Koh Amar Mordechai Ben David" [ref=e100]:
            - generic [ref=e101]:
              - generic: Koh Amar
            - generic: Mordechai Ben David
          - button "Koili Shema YBC" [ref=e102]:
            - generic [ref=e103]:
              - generic: Koili Shema
            - generic: YBC
          - button "Kol Berama simcha leiner, dveykus" [ref=e104]:
            - generic [ref=e105]:
              - generic: Kol Berama
            - generic: simcha leiner, dveykus
          - button "Kol Haolam Kulo Rabbi Dovit Chait" [ref=e106]:
            - generic [ref=e107]:
              - generic: Kol Haolam Kulo
            - generic: Rabbi Dovit Chait
          - button "Lakol Z'man Vaeis Unknown" [ref=e108]:
            - generic [ref=e109]:
              - generic: Lakol Z'man Vaeis
            - generic: Unknown
          - button "Lecha Amar Libi Unknown" [ref=e110]:
            - generic [ref=e111]:
              - generic: Lecha Amar Libi
            - generic: Unknown
          - button "Lev Tahor Unknown" [ref=e112]:
            - generic [ref=e113]:
              - generic: Lev Tahor
            - generic: Unknown
          - button "Lmaan Achai Unknown" [ref=e114]:
            - generic [ref=e115]:
              - generic: Lmaan Achai
            - generic: Unknown
          - button "Lmaancha Eitan Katz" [ref=e116]:
            - generic [ref=e117]:
              - generic: Lmaancha
            - generic: Eitan Katz
          - button "Lulei Sorascha Carlebach" [ref=e118]:
            - generic [ref=e119]:
              - generic: Lulei Sorascha
            - generic: Carlebach
          - button "Machnisei Rchachamim mbd" [ref=e120]:
            - generic [ref=e121]:
              - generic: Machnisei Rchachamim
            - generic: mbd
          - button "Mamleches Kohanim Benny Friedman" [ref=e122]:
            - generic [ref=e123]:
              - generic: Mamleches Kohanim
            - generic: Benny Friedman
          - button "Maskil L'dovid Unknown" [ref=e124]:
            - generic [ref=e125]:
              - generic: Maskil L'dovid
            - generic: Unknown
          - button "Mehaira simcha leiner" [ref=e126]:
            - generic [ref=e127]:
              - generic: Mehaira
            - generic: simcha leiner
          - button "Mikolos Mayim Rabim Karlin" [ref=e128]:
            - generic [ref=e129]:
              - generic: Mikolos Mayim Rabim
            - generic: Karlin
          - button "Mimkomcha Unknown" [ref=e130]:
            - generic [ref=e131]:
              - generic: Mimkomcha
            - generic: Unknown
          - button "Naar Hayisi Unknown" [ref=e132]:
            - generic [ref=e133]:
              - generic: Naar Hayisi
            - generic: Unknown
          - button "Nafshi Rechnitz" [ref=e134]:
            - generic [ref=e135]:
              - generic: Nafshi
            - generic: Rechnitz
          - button "Nishmas Yehuda Green" [ref=e136]:
            - generic [ref=e137]:
              - generic: Nishmas
            - generic: Yehuda Green
          - button "Oid Yeishvu MBD" [ref=e138]:
            - generic [ref=e139]:
              - generic: Oid Yeishvu
            - generic: MBD
          - button "Olatz Libi Shalsheles" [ref=e140]:
            - generic [ref=e141]:
              - generic: Olatz Libi
            - generic: Shalsheles
          - button "Piha Pascha Dovid Hoffman" [ref=e142]:
            - generic [ref=e143]:
              - generic: Piha Pascha
            - generic: Dovid Hoffman
          - button "Pnei L'elbon Yosef Moshe Kahane" [ref=e144]:
            - generic [ref=e145]:
              - generic: Pnei L'elbon
            - generic: Yosef Moshe Kahane
          - button "Proik Modzitz" [ref=e146]:
            - generic [ref=e147]:
              - generic: Proik
            - generic: Modzitz
          - button "Rachamana benny friedman" [ref=e148]:
            - generic [ref=e149]:
              - generic: Rachamana
            - generic: benny friedman
          - button "Riboin Haoilamim Rechnitz" [ref=e150]:
            - generic [ref=e151]:
              - generic: Riboin Haoilamim
            - generic: Rechnitz
          - button "Ribon Kol Unknown" [ref=e152]:
            - generic [ref=e153]:
              - generic: Ribon Kol
            - generic: Unknown
          - button "Ribono Ari Goldwag" [ref=e154]:
            - generic [ref=e155]:
              - generic: Ribono
            - generic: Ari Goldwag
          - button "Shalom Rav Unknown" [ref=e156]:
            - generic [ref=e157]:
              - generic: Shalom Rav
            - generic: Unknown
          - button "Shifchi Kamayim Unknown" [ref=e158]:
            - generic [ref=e159]:
              - generic: Shifchi Kamayim
            - generic: Unknown
          - button "T'fila Leoni Unknown" [ref=e160]:
            - generic [ref=e161]:
              - generic: T'fila Leoni
            - generic: Unknown
          - button "Torah Hakdosha Mordechai Ben David" [ref=e162]:
            - generic [ref=e163]:
              - generic: Torah Hakdosha
            - generic: Mordechai Ben David
          - button "Tov Lehodos Unknown" [ref=e164]:
            - generic [ref=e165]:
              - generic: Tov Lehodos
            - generic: Unknown
          - button "Tzamah Nafshi Unknown" [ref=e166]:
            - generic [ref=e167]:
              - generic: Tzamah Nafshi
            - generic: Unknown
          - button "V'nacha Eitan Katz" [ref=e168]:
            - generic [ref=e169]:
              - generic: V'nacha
            - generic: Eitan Katz
          - button "Vaani Bechasdecha MBD" [ref=e170]:
            - generic [ref=e171]:
              - generic: Vaani Bechasdecha
            - generic: MBD
          - button "Vcho Mi Sheoskim Yehudah Green" [ref=e172]:
            - generic [ref=e173]:
              - generic: Vcho Mi Sheoskim
            - generic: Yehudah Green
          - button "Veafilu Bihastara Shaya Gross and Yoeli Klein" [ref=e174]:
            - generic [ref=e175]:
              - generic: Veafilu Bihastara
            - generic: Shaya Gross and Yoeli Klein
          - button "Vhareinu Unknown" [ref=e176]:
            - generic [ref=e177]:
              - generic: Vhareinu
            - generic: Unknown
          - button "Vhaviosim Shlomo Zolty" [ref=e178]:
            - generic [ref=e179]:
              - generic: Vhaviosim
            - generic: Shlomo Zolty
          - button "Vhi Sheamda Yaakov Shwekey" [ref=e180]:
            - generic [ref=e181]:
              - generic: Vhi Sheamda
            - generic: Yaakov Shwekey
          - button "Vhu Keili Baruch Levine" [ref=e182]:
            - generic [ref=e183]:
              - generic: Vhu Keili
            - generic: Baruch Levine
          - button "Vihi Ratzon Simcha Leiner" [ref=e184]:
            - generic [ref=e185]:
              - generic: Vihi Ratzon
            - generic: Simcha Leiner
          - button "Viyihu Zari Unknown" [ref=e186]:
            - generic [ref=e187]:
              - generic: Viyihu Zari
            - generic: Unknown
          - button "Vlirushalayim Unknown" [ref=e188]:
            - generic [ref=e189]:
              - generic: Vlirushalayim
            - generic: Unknown
          - button "Vseiarev Rechnitz" [ref=e190]:
            - generic [ref=e191]:
              - generic: Vseiarev
            - generic: Rechnitz
          - button "Vzakeini Baruch levine" [ref=e192]:
            - generic [ref=e193]:
              - generic: Vzakeini
            - generic: Baruch levine
          - button "Yaaleh MBD" [ref=e194]:
            - generic [ref=e195]:
              - generic: Yaaleh
            - generic: MBD
          - button "Yaaleh Vyavo Miami" [ref=e196]:
            - generic [ref=e197]:
              - generic: Yaaleh Vyavo
            - generic: Miami
      - generic [ref=e198]:
        - generic [ref=e200]:
          - generic [ref=e201]:
            - button "New Sheet" [ref=e202] [cursor=pointer]:
              - img [ref=e203]
            - button "Save Sheet" [disabled] [ref=e208]:
              - img [ref=e209]
            - button "Open Saved Sheets" [disabled] [ref=e213]:
              - img [ref=e214]
            - button "Print Sheet" [ref=e216] [cursor=pointer]:
              - img [ref=e217]
          - combobox "Column Layout" [ref=e223] [cursor=pointer]:
            - option "Auto Fit" [selected]
            - option "1 Column"
            - option "2 Columns"
            - option "3 Columns"
          - generic [ref=e225]:
            - button "Titles" [ref=e226] [cursor=pointer]:
              - generic [ref=e227]: Titles
            - button "Show Order Numbers" [ref=e228] [cursor=pointer]:
              - img [ref=e229]
            - button "Show Page Numbers" [ref=e236] [cursor=pointer]:
              - img [ref=e237]: "#"
          - status [ref=e241]:
            - text: Drag songs to the sheet
            - generic [ref=e242]: "• Titles, Page #"
        - generic [ref=e246]:
          - generic: "1"
  - status [ref=e251]
  - generic "Privacy settings" [ref=e252]:
    - button "Cookies" [ref=e253] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e259] [cursor=pointer]:
    - img [ref=e260]
  - alert [ref=e264]
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
> 95  |     await expect(page.getByPlaceholder('Search songs...')).toBeVisible();
      |                                                            ^ Error: expect(locator).toBeVisible() failed
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