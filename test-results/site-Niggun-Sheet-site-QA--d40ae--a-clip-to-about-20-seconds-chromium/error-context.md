# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site.spec.ts >> Niggun Sheet site QA >> timing editor can drag a clip to about 20 seconds
- Location: e2e/site.spec.ts:43:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 22
Received:   43.6
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
            - link "Contact" [ref=e17] [cursor=pointer]:
              - /url: /contact
      - generic [ref=e18]:
        - generic "yehudahyjacobs@gmail.com" [ref=e20]:
          - img [ref=e21]
          - text: yehudahyjacobs
        - button "Download Sheet" [ref=e24] [cursor=pointer]
  - main [ref=e25]:
    - link "Back to Songs" [ref=e26] [cursor=pointer]:
      - /url: /songs
      - img [ref=e27]
      - text: Back to Songs
    - generic [ref=e29]:
      - generic [ref=e30]:
        - heading "Acheinu" [level=1] [ref=e31]
        - paragraph [ref=e32]: D'veykus
      - generic [ref=e34]:
        - iframe [ref=e35]:
          
        - button "Play" [ref=e36] [cursor=pointer]:
          - img [ref=e37]
        - generic [ref=e40]: "--:--"
      - generic [ref=e41]:
        - generic [ref=e42]:
          - generic [ref=e43]: Timing Editor
          - generic [ref=e44]: Paused
        - paragraph [ref=e45]: Drag the timeline to scrub the playhead. Press + or − to zoom. Click a verse card to add it at the playhead, drag clips to reposition them, or drag clip edges for fine timing.
        - generic [ref=e46]:
          - generic [ref=e47]: 12 clips on track, 8/8 verses used
          - generic [ref=e48]:
            - generic [ref=e49]:
              - checkbox "Use first/last card as song boundaries" [checked] [ref=e50]
              - text: Use first/last card as song boundaries
            - generic [ref=e51]: Timeline length 2:23.1
            - generic "Timeline zoom control" [ref=e52]:
              - generic [ref=e53]: Zoom
              - slider "Timeline zoom" [ref=e54]: "1"
              - generic [ref=e55]: 100%
        - generic [ref=e56]:
          - button "1 אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל 2 clips on track" [ref=e58] [cursor=pointer]:
            - generic [ref=e59]: "1"
            - generic [ref=e60]: אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל
            - generic [ref=e61]: 2 clips on track
          - button "2 הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה 2 clips on track" [ref=e63] [cursor=pointer]:
            - generic [ref=e64]: "2"
            - generic [ref=e65]: הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה
            - generic [ref=e66]: 2 clips on track
          - button "3 הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה 2 clips on track" [ref=e68] [cursor=pointer]:
            - generic [ref=e69]: "3"
            - generic [ref=e70]: הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה
            - generic [ref=e71]: 2 clips on track
          - button "4 הַמָּקוֹם יְרַחֵם עֲלֵיהֶם 1 clip on track" [ref=e73] [cursor=pointer]:
            - generic [ref=e74]: "4"
            - generic [ref=e75]: הַמָּקוֹם יְרַחֵם עֲלֵיהֶם
            - generic [ref=e76]: 1 clip on track
          - button "5 וְיוֹצִיאֵם מִצָּרָה לִרְוָחָה 1 clip on track" [ref=e78] [cursor=pointer]:
            - generic [ref=e79]: "5"
            - generic [ref=e80]: וְיוֹצִיאֵם מִצָּרָה לִרְוָחָה
            - generic [ref=e81]: 1 clip on track
          - button "6 וּמֵאֲפֵלָה לְאוֹרָה 1 clip on track" [ref=e83] [cursor=pointer]:
            - generic [ref=e84]: "6"
            - generic [ref=e85]: וּמֵאֲפֵלָה לְאוֹרָה
            - generic [ref=e86]: 1 clip on track
          - button "7 וּמִשִּׁעְבּוּד לִגְאֻלָּה 1 clip on track" [ref=e88] [cursor=pointer]:
            - generic [ref=e89]: "7"
            - generic [ref=e90]: וּמִשִּׁעְבּוּד לִגְאֻלָּה
            - generic [ref=e91]: 1 clip on track
          - button "8 הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב.. 1 clip on track" [ref=e93] [cursor=pointer]:
            - generic [ref=e94]: "8"
            - generic [ref=e95]: הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב..
            - generic [ref=e96]: 1 clip on track
          - button "P (Pause / blank) 1 clip on track" [ref=e98] [cursor=pointer]:
            - generic [ref=e99]: P
            - generic [ref=e100]: (Pause / blank)
            - generic [ref=e101]: 1 clip on track
        - generic [ref=e102]:
          - generic [ref=e103]:
            - generic [ref=e104]: V1
            - generic [ref=e105]: אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל
            - generic [ref=e106]: 0:43.6
          - generic [ref=e107]:
            - generic [ref=e108]:
              - generic [ref=e109]: 0:00.0
              - generic [ref=e110]: 0:20.0
              - generic [ref=e111]: 0:40.0
              - generic [ref=e112]: 1:00.0
              - generic [ref=e113]: 1:20.0
              - generic [ref=e114]: 1:40.0
              - generic [ref=e115]: 2:00.0
              - generic [ref=e116]: 2:20.0
              - generic [ref=e117]: 2:23.1
            - generic [ref=e118]:
              - generic:
                - generic: 0:00.0
              - button "In 0:43.6" [ref=e120] [cursor=pointer]:
                - generic [ref=e121]: In
                - generic [ref=e122]: 0:43.6
              - button "Out 2:19.1" [ref=e124] [cursor=pointer]:
                - generic [ref=e125]: Out
                - generic [ref=e126]: 2:19.1
              - generic [ref=e127]:
                - button "Adjust clip start" [ref=e128]
                - button "V1 אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל 0:43.6–0:56.6" [ref=e129]:
                  - generic [ref=e130]: V1
                  - generic "אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל" [ref=e131]:
                    - generic [ref=e132]: אחינו
                    - generic [ref=e133]: כל
                    - generic [ref=e134]: בית
                    - generic [ref=e135]: ישראל
                  - generic [ref=e136]: 0:43.6–0:56.6
                - button "Remove clip" [ref=e137] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e138]
              - generic [ref=e139]:
                - button "Adjust clip start" [ref=e140]
                - button "V2 הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה 0:56.6–1:03.9" [ref=e141]:
                  - generic [ref=e142]: V2
                  - generic "הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה" [ref=e143]:
                    - generic [ref=e144]: הנתונים
                    - generic [ref=e145]: בצרה
                    - generic [ref=e146]: ובשביה
                  - generic [ref=e147]: 0:56.6–1:03.9
                - button "Remove clip" [ref=e148] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e149]
              - generic [ref=e150]:
                - button "Adjust clip start" [ref=e151]
                - button "V3 הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה 1:03.9–1:13.1" [ref=e152]:
                  - generic [ref=e153]: V3
                  - generic "הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה" [ref=e154]:
                    - generic [ref=e155]: העומדים
                    - generic [ref=e156]: בין
                    - generic [ref=e157]: בים
                    - generic [ref=e158]: ובין
                  - generic [ref=e159]: 1:03.9–1:13.1
                - button "Remove clip" [ref=e160] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e161]
              - generic [ref=e162]:
                - button "Adjust clip start" [ref=e163]
                - button "V1 אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל 1:13.1–1:26.8" [ref=e164]:
                  - generic [ref=e165]: V1
                  - generic "אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל" [ref=e166]:
                    - generic [ref=e167]: אחינו
                    - generic [ref=e168]: כל
                    - generic [ref=e169]: בית
                    - generic [ref=e170]: ישראל
                  - generic [ref=e171]: 1:13.1–1:26.8
                - button "Remove clip" [ref=e172] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e173]
              - generic [ref=e174]:
                - button "Adjust clip start" [ref=e175]
                - button "V2 הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה 1:26.8–1:35.1" [ref=e176]:
                  - generic [ref=e177]: V2
                  - generic "הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה" [ref=e178]:
                    - generic [ref=e179]: הנתונים
                    - generic [ref=e180]: בצרה
                    - generic [ref=e181]: ובשביה
                  - generic [ref=e182]: 1:26.8–1:35.1
                - button "Remove clip" [ref=e183] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e184]
              - generic [ref=e185]:
                - button "Adjust clip start" [ref=e186]
                - button "V3 הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה 1:35.1–1:43.0" [ref=e187]:
                  - generic [ref=e188]: V3
                  - generic "הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה" [ref=e189]:
                    - generic [ref=e190]: העומדים
                    - generic [ref=e191]: בין
                    - generic [ref=e192]: בים
                    - generic [ref=e193]: ובין
                  - generic [ref=e194]: 1:35.1–1:43.0
                - button "Remove clip" [ref=e195] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e196]
              - generic [ref=e197]:
                - button "Adjust clip start" [ref=e198]
                - button "V4 הַמָּקוֹם יְרַחֵם עֲלֵיהֶם 1:43.0–1:50.0" [ref=e199]:
                  - generic [ref=e200]: V4
                  - generic "הַמָּקוֹם יְרַחֵם עֲלֵיהֶם" [ref=e201]:
                    - generic [ref=e202]: המקום
                    - generic [ref=e203]: ירחם
                    - generic [ref=e204]: עליהם
                  - generic [ref=e205]: 1:43.0–1:50.0
                - button "Remove clip" [ref=e206] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e207]
              - generic [ref=e208]:
                - button "Adjust clip start" [ref=e209]
                - button "V5 וְיוֹצִיאֵם מִצָּרָה לִרְוָחָה 1:50.0–1:57.2" [ref=e210]:
                  - generic [ref=e211]: V5
                  - generic "וְיוֹצִיאֵם מִצָּרָה לִרְוָחָה" [ref=e212]:
                    - generic [ref=e213]: ויוציאם
                    - generic [ref=e214]: מצרה
                    - generic [ref=e215]: לרוחה
                  - generic [ref=e216]: 1:50.0–1:57.2
                - button "Remove clip" [ref=e217] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e218]
              - generic [ref=e219]:
                - button "Adjust clip start" [ref=e220]
                - button "V6 וּמֵאֲפֵלָה לְאוֹרָה 1:57.2–2:00.2" [ref=e221]:
                  - generic [ref=e222]: V6
                  - generic "וּמֵאֲפֵלָה לְאוֹרָה" [ref=e223]:
                    - generic [ref=e224]: ומאפלה
                    - generic [ref=e225]: לאורה
                  - generic [ref=e226]: 1:57.2–2:00.2
                - button "Remove clip" [ref=e227] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e228]
              - generic [ref=e229]:
                - button "Adjust clip start" [ref=e230]
                - button "V7 וּמִשִּׁעְבּוּד לִגְאֻלָּה 2:00.2–2:04.3" [ref=e231]:
                  - generic [ref=e232]: V7
                  - generic "וּמִשִּׁעְבּוּד לִגְאֻלָּה" [ref=e233]:
                    - generic [ref=e234]: ומשעבוד
                    - generic [ref=e235]: לגאלה
                  - generic [ref=e236]: 2:00.2–2:04.3
                - button "Remove clip" [ref=e237] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e238]
              - generic [ref=e239]:
                - button "Adjust clip start" [ref=e240]
                - button "V8 הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב.. 2:04.3–2:13.1" [ref=e241]:
                  - generic [ref=e242]: V8
                  - generic "הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב.." [ref=e243]:
                    - generic [ref=e244]: השתא
                    - generic [ref=e245]: בעגלא
                    - generic [ref=e246]: ובזמן
                    - generic [ref=e247]: קריב..
                  - generic [ref=e248]: 2:04.3–2:13.1
                - button "Remove clip" [ref=e249] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e250]
              - generic [ref=e251]:
                - button "Adjust clip start" [ref=e252]
                - button "Pause (Pause / blank) 2:13.1–2:19.1" [ref=e253]:
                  - generic [ref=e254]: Pause
                  - generic "(Pause / blank)" [ref=e255]:
                    - generic [ref=e256]: Pause
                  - generic [ref=e257]: 2:13.1–2:19.1
                - button "Remove clip" [ref=e258] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e259]
        - generic [ref=e260]:
          - button "Save Timings" [ref=e261] [cursor=pointer]
          - button "Cancel" [ref=e262] [cursor=pointer]
      - link "Open for Smartboard" [ref=e264] [cursor=pointer]:
        - /url: /smartboard-mode?slug=acheinu&lyrics=%D7%90%D6%B7%D7%97%D6%B5%D7%99%D7%A0%D7%95%D6%BC%20%D7%9B%D6%B8%D6%BC%D7%9C%20%D7%91%D6%B5%D6%BC%D7%99%D7%AA%20%D7%99%D6%B4%D7%A9%D6%B0%D7%82%D7%A8%D6%B8%D7%90%D6%B5%D7%9C%0A%D7%94%D6%B7%D7%A0%D6%B0%D6%BC%D7%AA%D7%95%D6%BC%D7%A0%D6%B4%D7%99%D7%9D%20%D7%91%D6%B0%D6%BC%D7%A6%D6%B8%D7%A8%D6%B8%D7%94%20%D7%95%D6%BC%D7%91%D6%B7%D7%A9%D6%B4%D6%BC%D7%81%D7%91%D6%B0%D7%99%D6%B8%D7%94%0A%D7%94%D6%B8%D7%A2%D7%95%D6%B9%D7%9E%D6%B0%D7%93%D6%B4%D7%99%D7%9D%20%D7%91%D6%B5%D6%BC%D7%99%D7%9F%20%D7%91%D6%B7%D6%BC%D7%99%D6%B8%D6%BC%D7%9D%20%D7%95%D6%BC%D7%91%D6%B5%D7%99%D7%9F%20%D7%91%D6%B7%D6%BC%D7%99%D6%B7%D6%BC%D7%91%D6%B8%D6%BC%D7%A9%D6%B8%D7%81%D7%94%20%0A%D7%94%D6%B7%D7%9E%D6%B8%D6%BC%D7%A7%D7%95%D6%B9%D7%9D%20%D7%99%D6%B0%D7%A8%D6%B7%D7%97%D6%B5%D7%9D%20%D7%A2%D6%B2%D7%9C%D6%B5%D7%99%D7%94%D6%B6%D7%9D%0A%D7%95%D6%B0%D7%99%D7%95%D6%B9%D7%A6%D6%B4%D7%99%D7%90%D6%B5%D7%9D%20%D7%9E%D6%B4%D7%A6%D6%B8%D6%BC%D7%A8%D6%B8%D7%94%20%D7%9C%D6%B4%D7%A8%D6%B0%D7%95%D6%B8%D7%97%D6%B8%D7%94%0A%D7%95%D6%BC%D7%9E%D6%B5%D7%90%D6%B2%D7%A4%D6%B5%D7%9C%D6%B8%D7%94%20%D7%9C%D6%B0%D7%90%D7%95%D6%B9%D7%A8%D6%B8%D7%94%0A%D7%95%D6%BC%D7%9E%D6%B4%D7%A9%D6%B4%D6%BC%D7%81%D7%A2%D6%B0%D7%91%D6%BC%D7%95%D6%BC%D7%93%20%D7%9C%D6%B4%D7%92%D6%B0%D7%90%D6%BB%D7%9C%D6%B8%D6%BC%D7%94%20%0A%D7%94%D6%B7%D7%A9%D6%B0%D7%81%D7%AA%D6%B8%D6%BC%D7%90%20%D7%91%D6%B7%D6%BC%D7%A2%D6%B2%D7%92%D6%B8%D7%9C%D6%B8%D7%90%20%D7%95%D6%BC%D7%91%D6%B4%D7%96%D6%B0%D7%9E%D6%B7%D7%9F%20%D7%A7%D6%B8%D7%A8%D6%B4%D7%99%D7%91..&youtube=https%3A%2F%2Fyoutu.be%2Fq4PxCtN5BgE
        - img [ref=e265]
        - text: Open for Smartboard
  - contentinfo [ref=e267]:
    - generic [ref=e268]:
      - generic [ref=e269]:
        - generic [ref=e270]:
          - heading "Downloads" [level=4] [ref=e271]
          - button "Niggun Sheet" [ref=e272] [cursor=pointer]
          - link "Simcha Sheet" [ref=e273] [cursor=pointer]:
            - /url: https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link
        - generic [ref=e274]:
          - heading "Navigation" [level=4] [ref=e275]
          - link "Song Directory" [ref=e276] [cursor=pointer]:
            - /url: /songs
          - link "Sheet Builder" [ref=e277] [cursor=pointer]:
            - /url: /sheet-builder
          - link "Contact" [ref=e278] [cursor=pointer]:
            - /url: /contact
        - generic [ref=e279]:
          - heading "Legal" [level=4] [ref=e280]
          - link "Contact Us" [ref=e281] [cursor=pointer]:
            - /url: /contact
          - link "Tracking Disclosure" [ref=e282] [cursor=pointer]:
            - /url: /tracking-disclosure
          - paragraph [ref=e283]: Choose cookie-based or fallback analytics from the privacy control.
      - generic [ref=e284]:
        - paragraph [ref=e285]: © 2026 Yehudah Jacobs - The Niggun Sheet
        - paragraph [ref=e286]: Discover Your Perfect Niggun
  - button "Open Next.js Dev Tools" [ref=e292] [cursor=pointer]:
    - img [ref=e293]
  - alert [ref=e296]
  - generic "Privacy settings" [ref=e297]:
    - button "Privacy" [ref=e298] [cursor=pointer]
```

# Test source

```ts
  26  |   page.on('console', (message) => {
  27  |     const text = message.text();
  28  |     if (/hydration failed|hydration mismatch|server rendered html|did not match/i.test(text)) {
  29  |       messages.push(text);
  30  |     }
  31  |   });
  32  | 
  33  |   page.on('pageerror', (error) => {
  34  |     if (/hydration failed|hydration mismatch|server rendered html|did not match/i.test(error.message)) {
  35  |       messages.push(error.message);
  36  |     }
  37  |   });
  38  | 
  39  |   return () => expect(messages).toEqual([]);
  40  | }
  41  | 
  42  | test.describe('Niggun Sheet site QA', () => {
  43  |   test('timing editor can drag a clip to about 20 seconds', async ({ page }) => {
  44  |     await page.addInitScript((email) => {
  45  |       window.localStorage.setItem('niggunsheet-auth', '1');
  46  |       window.localStorage.setItem('niggunsheet-email', email);
  47  |     }, ADMIN_EMAIL);
  48  | 
  49  |     await page.goto('/songs/acheinu');
  50  | 
  51  |     await expect(page.getByRole('button', { name: /Edit Timings|Add Timings/ })).toBeVisible();
  52  |     await page.getByRole('button', { name: /Edit Timings|Add Timings/ }).click();
  53  | 
  54  |     const clip = page.locator('.timing-clip').first();
  55  |     const clipStartHandle = clip.locator('.timing-clip-handle-start');
  56  |     const clipRange = clip.locator('.timing-clip-range');
  57  |     const initialRange = await clipRange.textContent();
  58  |     expect(initialRange).toBeTruthy();
  59  |     const initialStartMatch = initialRange?.match(/^([^–]+)/);
  60  |     expect(initialStartMatch).toBeTruthy();
  61  |     const initialStart = parseRenderedSeconds(initialStartMatch?.[1] ?? '');
  62  |     expect(initialStart).toBeGreaterThan(43);
  63  |     expect(initialStart).toBeLessThan(44.5);
  64  | 
  65  |     const timeline = page.locator('.timing-timeline');
  66  |     const timelineBox = await timeline.boundingBox();
  67  |     const handleBox = await clipStartHandle.boundingBox();
  68  | 
  69  |     expect(timelineBox).not.toBeNull();
  70  |     expect(handleBox).not.toBeNull();
  71  | 
  72  |     if (!timelineBox || !handleBox) {
  73  |       throw new Error('Expected timeline and clip-handle bounding boxes to exist');
  74  |     }
  75  | 
  76  |     const editorDuration = 137.09;
  77  |     const targetSeconds = 20;
  78  |     const startX = handleBox.x + handleBox.width / 2;
  79  |     const pointerY = handleBox.y + handleBox.height / 2;
  80  |     const targetX = timelineBox.x + (targetSeconds / editorDuration) * timelineBox.width;
  81  | 
  82  |     await clipStartHandle.dispatchEvent('pointerdown', {
  83  |       button: 0,
  84  |       buttons: 1,
  85  |       clientX: startX,
  86  |       clientY: pointerY,
  87  |       pointerId: 1,
  88  |       pointerType: 'mouse',
  89  |       isPrimary: true,
  90  |     });
  91  |     await page.waitForTimeout(75);
  92  |     await page.evaluate(({ moveX, moveY }) => {
  93  |       window.dispatchEvent(new PointerEvent('pointermove', {
  94  |         bubbles: true,
  95  |         button: 0,
  96  |         buttons: 1,
  97  |         clientX: moveX,
  98  |         clientY: moveY,
  99  |         pointerId: 1,
  100 |         pointerType: 'mouse',
  101 |         isPrimary: true,
  102 |       }));
  103 |     }, { moveX: targetX, moveY: pointerY });
  104 |     await page.waitForTimeout(50);
  105 |     await page.evaluate(({ upX, upY }) => {
  106 |       window.dispatchEvent(new PointerEvent('pointerup', {
  107 |         bubbles: true,
  108 |         button: 0,
  109 |         buttons: 0,
  110 |         clientX: upX,
  111 |         clientY: upY,
  112 |         pointerId: 1,
  113 |         pointerType: 'mouse',
  114 |         isPrimary: true,
  115 |       }));
  116 |     }, { upX: targetX, upY: pointerY });
  117 | 
  118 |     const updatedRange = await clipRange.textContent();
  119 |     expect(updatedRange).toBeTruthy();
  120 | 
  121 |     const matchedStart = updatedRange?.match(/^([^–]+)/);
  122 |     expect(matchedStart).toBeTruthy();
  123 | 
  124 |     const movedStart = parseRenderedSeconds(matchedStart?.[1] ?? '');
  125 |     expect(movedStart).toBeGreaterThan(18);
> 126 |     expect(movedStart).toBeLessThan(22);
      |                        ^ Error: expect(received).toBeLessThan(expected)
  127 |   });
  128 | 
  129 |   test('homepage presents the intended hero, CTAs, footer links, and privacy control', async ({ page }) => {
  130 |     await page.goto('/');
  131 | 
  132 |     await expect(page).toHaveTitle('Niggun Sheet');
  133 |     await expect(page.getByRole('heading', { name: 'Discover Your Perfect Niggun' })).toBeVisible();
  134 |     await expect(page.getByText('Drag + Drop')).toBeVisible();
  135 |     await expect(page.getByRole('button', { name: 'Download Niggun Sheet' })).toBeVisible();
  136 |     await expect(page.getByRole('link', { name: 'Try Sheet Builder' })).toHaveAttribute('href', '/sheet-builder');
  137 |     await expect(page.getByRole('heading', { name: 'Smartboard Friendly Mode' })).toBeVisible();
  138 | 
  139 |     await expect(page.getByRole('contentinfo').getByRole('button', { name: 'Niggun Sheet' })).toBeVisible();
  140 |     await expect(page.getByRole('link', { name: 'Tracking Disclosure' })).toHaveAttribute('href', '/tracking-disclosure');
  141 |     await expect(page.getByRole('button', { name: 'Privacy' })).toBeVisible();
  142 |   });
  143 | 
  144 |   test('contact page has clean metadata and accessible form labels', async ({ page }) => {
  145 |     await page.goto('/contact');
  146 | 
  147 |     await expect(page).toHaveTitle('Get in Touch | Niggun Sheet');
  148 |     await expect(page.getByRole('heading', { name: 'Get in Touch' })).toBeVisible();
  149 |     await expect(page.getByLabel('Your Name or Yeshiva')).toBeVisible();
  150 |     await expect(page.getByLabel('Email')).toBeVisible();
  151 |     await expect(page.getByLabel("What's This About?")).toBeVisible();
  152 |     await expect(page.getByLabel('Message')).toBeVisible();
  153 |     await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  154 | 
  155 |     await expect(page.getByText('Get in Touch 🎵')).toHaveCount(0);
  156 |     await expect(page.locator('main[aria-hidden="true"]')).toHaveCount(0);
  157 |   });
  158 | 
  159 |   test('tracking disclosure page replaces old broken static policy link', async ({ page, request }) => {
  160 |     const response = await request.get('/tracking-disclosure');
  161 |     expect(response.status()).toBe(200);
  162 | 
  163 |     await page.goto('/tracking-disclosure');
  164 |     await expect(page).toHaveTitle('Tracking Disclosure | Niggun Sheet');
  165 |     await expect(page.getByRole('heading', { name: 'Tracking Disclosure' })).toBeVisible();
  166 |     await expect(page.getByText('Analytics are used as a count.')).toBeVisible();
  167 |     await expect(page.getByText('No personal data is sold, shared, or used for advertising profiles.')).toBeVisible();
  168 |   });
  169 | 
  170 |   test('song directory stays in list mode and supports searching/filtering', async ({ page }) => {
  171 |     await page.goto('/songs');
  172 | 
  173 |     await expect(page).toHaveTitle('Song Directory | Niggun Sheet');
  174 |     await expect(page.getByRole('heading', { name: 'Song Directory' })).toBeVisible();
  175 |     await expect(page.getByPlaceholder('Search by title, artist, or lyrics...')).toBeVisible();
  176 |     await expect(page.getByRole('button', { name: 'All Songs' })).toBeVisible();
  177 |     await expect(page.getByRole('button', { name: 'Library' })).toBeVisible();
  178 |     await expect(page.getByRole('button', { name: 'My Songs' })).toBeVisible();
  179 | 
  180 |     await expect(page.getByRole('button', { name: /grid/i })).toHaveCount(0);
  181 |     await page.getByPlaceholder('Search by title, artist, or lyrics...').fill('Acheinu');
  182 |     await expect(page.getByRole('link', { name: /Acheinu/ }).first()).toBeVisible();
  183 |     await expect(page.getByText(/Showing \d+ of 85 niggunim/)).toBeVisible();
  184 |   });
  185 | 
  186 |   test('song detail exposes lyrics and smartboard handoff without relying on external playback', async ({ page }) => {
  187 |     await page.goto('/songs/acheinu');
  188 | 
  189 |     await expect(page.getByRole('heading', { name: 'Acheinu' })).toBeVisible();
  190 |     await expect(page.getByText('D\'veykus')).toBeVisible();
  191 |     await expect(page.getByRole('link', { name: /Smartboard/i })).toHaveAttribute('href', /\/smartboard-mode\?/);
  192 |   });
  193 | 
  194 |   test('sheet builder loads controls without hydration mismatch warnings', async ({ page }) => {
  195 |     const assertNoHydrationErrors = watchForHydrationErrors(page);
  196 | 
  197 |     await page.goto('/sheet-builder', { waitUntil: 'commit' });
  198 |     await expect(page).toHaveTitle('Sheet Builder | Niggun Sheet');
  199 |     await expect(page.getByRole('button', { name: 'Song Library' })).toBeVisible();
  200 |     await expect(page.getByRole('button', { name: 'My Songs' })).toBeVisible();
  201 |     await expect(page.getByPlaceholder('Search songs...')).toBeVisible();
  202 |     await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
  203 |     await expect(page.locator('.sb2-status').getByText('Drag songs to the sheet', { exact: true })).toBeVisible();
  204 | 
  205 |     await page.waitForTimeout(500);
  206 |     assertNoHydrationErrors();
  207 |   });
  208 | 
  209 |   test('smartboard regular and no-timing playhead modes remain usable', async ({ page }) => {
  210 |     const lyrics = ['Acheinu line 1', 'Acheinu line 2', 'Acheinu line 3'].join('\n');
  211 |     await page.goto(`/smartboard-mode?slug=acheinu&lyrics=${encodeURIComponent(lyrics)}`);
  212 | 
  213 |     await expect(page.getByText('Acheinu line 1 Acheinu line 2 Acheinu line 3')).toBeVisible();
  214 |     await expect(page.getByRole('button', { name: 'Start Playhead' })).toBeVisible();
  215 |     await expect(page.getByRole('button', { name: 'Decrease font size' })).toBeVisible();
  216 |     await expect(page.getByRole('button', { name: 'Increase font size' })).toBeVisible();
  217 | 
  218 |     await page.getByRole('button', { name: 'Start Playhead' }).click();
  219 |     await expect(page.getByRole('button', { name: 'Pause Playhead' })).toBeVisible();
  220 |     await expect(page.getByText('1 / 3')).toBeVisible();
  221 |     await expect(page.getByRole('button', { name: 'Acheinu line 2' }).first()).toBeVisible();
  222 |   });
  223 | 
  224 |   test('generated SEO routes are reachable', async ({ request }) => {
  225 |     const robots = await request.get('/robots.txt');
  226 |     expect(robots.status()).toBe(200);
```