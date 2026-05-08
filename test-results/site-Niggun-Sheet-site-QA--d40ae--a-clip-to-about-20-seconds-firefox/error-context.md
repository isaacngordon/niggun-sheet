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
    - generic [ref=e30]:
      - generic [ref=e31]:
        - heading "Acheinu" [level=1] [ref=e32]
        - paragraph [ref=e33]: D'veykus
      - generic [ref=e35]:
        - iframe [ref=e36]:
          - generic [active] [ref=f1e1]:
            - generic "YouTube Video Player" [ref=f1e3]
            - generic [ref=f1e5]:
              - generic:
                - generic:
                  - button "Play video" [ref=f1e10] [cursor=pointer]
                  - button "Hide player controls" [ref=f1e12] [cursor=pointer]
                  - generic [ref=f1e19]:
                    - generic [ref=f1e20]:
                      - link "Acheinu" [ref=f1e21] [cursor=pointer]:
                        - /url: https://www.youtube.com/watch?v=q4PxCtN5BgE
                      - link "Abie Rotenberg - Topic" [ref=f1e22] [cursor=pointer]:
                        - /url: /channel/UCBvLn9kkWL9AZUUNRADY4cA
                        - generic [ref=f1e23]: Abie Rotenberg - Topic
                    - generic [ref=f1e24]:
                      - button [ref=f1e25] [cursor=pointer]
                      - generic [ref=f1e26]:
                        - generic [ref=f1e27]:
                          - generic: Abie Rotenberg - Topic
                          - generic: 3.04K subscribers
                        - button "Subscribe" [ref=f1e39] [cursor=pointer]:
                          - generic [ref=f1e40]: Subscribe
        - button "Play" [ref=e37] [cursor=pointer]:
          - img [ref=e38]
        - generic [ref=e41]: "--:--"
      - generic [ref=e42]:
        - generic [ref=e43]:
          - generic [ref=e44]: Timing Editor
          - generic [ref=e45]: Paused
        - paragraph [ref=e46]: Drag the timeline to scrub the playhead. Press + or − to zoom. Click a verse card to add it at the playhead, drag clips to reposition them, or drag clip edges for fine timing.
        - generic [ref=e47]:
          - generic [ref=e48]: 12 clips on track, 8/8 verses used
          - generic [ref=e49]:
            - generic [ref=e50]:
              - checkbox "Use first/last card as song boundaries" [checked] [ref=e51]
              - text: Use first/last card as song boundaries
            - generic [ref=e52]: Timeline length 2:23.1
            - generic "Timeline zoom control" [ref=e53]:
              - generic [ref=e54]: Zoom
              - slider "Timeline zoom" [ref=e55]: "1"
              - generic [ref=e56]: 100%
        - generic [ref=e57]:
          - button "1 אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל 2 clips on track" [ref=e59] [cursor=pointer]:
            - generic [ref=e60]: "1"
            - generic [ref=e61]: אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל
            - generic [ref=e62]: 2 clips on track
          - button "2 הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה 2 clips on track" [ref=e64] [cursor=pointer]:
            - generic [ref=e65]: "2"
            - generic [ref=e66]: הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה
            - generic [ref=e67]: 2 clips on track
          - button "3 הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה 2 clips on track" [ref=e69] [cursor=pointer]:
            - generic [ref=e70]: "3"
            - generic [ref=e71]: הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה
            - generic [ref=e72]: 2 clips on track
          - button "4 הַמָּקוֹם יְרַחֵם עֲלֵיהֶם 1 clip on track" [ref=e74] [cursor=pointer]:
            - generic [ref=e75]: "4"
            - generic [ref=e76]: הַמָּקוֹם יְרַחֵם עֲלֵיהֶם
            - generic [ref=e77]: 1 clip on track
          - button "5 וְיוֹצִיאֵם מִצָּרָה לִרְוָחָה 1 clip on track" [ref=e79] [cursor=pointer]:
            - generic [ref=e80]: "5"
            - generic [ref=e81]: וְיוֹצִיאֵם מִצָּרָה לִרְוָחָה
            - generic [ref=e82]: 1 clip on track
          - button "6 וּמֵאֲפֵלָה לְאוֹרָה 1 clip on track" [ref=e84] [cursor=pointer]:
            - generic [ref=e85]: "6"
            - generic [ref=e86]: וּמֵאֲפֵלָה לְאוֹרָה
            - generic [ref=e87]: 1 clip on track
          - button "7 וּמִשִּׁעְבּוּד לִגְאֻלָּה 1 clip on track" [ref=e89] [cursor=pointer]:
            - generic [ref=e90]: "7"
            - generic [ref=e91]: וּמִשִּׁעְבּוּד לִגְאֻלָּה
            - generic [ref=e92]: 1 clip on track
          - button "8 הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב.. 1 clip on track" [ref=e94] [cursor=pointer]:
            - generic [ref=e95]: "8"
            - generic [ref=e96]: הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב..
            - generic [ref=e97]: 1 clip on track
          - button "P (Pause / blank) 1 clip on track" [ref=e99] [cursor=pointer]:
            - generic [ref=e100]: P
            - generic [ref=e101]: (Pause / blank)
            - generic [ref=e102]: 1 clip on track
        - generic [ref=e103]:
          - generic [ref=e104]:
            - generic [ref=e105]: V1
            - generic [ref=e106]: אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל
            - generic [ref=e107]: 0:43.6
          - generic [ref=e108]:
            - generic [ref=e109]:
              - generic [ref=e110]: 0:00.0
              - generic [ref=e111]: 0:20.0
              - generic [ref=e112]: 0:40.0
              - generic [ref=e113]: 1:00.0
              - generic [ref=e114]: 1:20.0
              - generic [ref=e115]: 1:40.0
              - generic [ref=e116]: 2:00.0
              - generic [ref=e117]: 2:20.0
              - generic [ref=e118]: 2:23.1
            - generic [ref=e119]:
              - generic:
                - generic: 0:00.0
              - button "In 0:43.6" [ref=e121] [cursor=pointer]:
                - generic [ref=e122]: In
                - generic [ref=e123]: 0:43.6
              - button "Out 2:19.1" [ref=e125] [cursor=pointer]:
                - generic [ref=e126]: Out
                - generic [ref=e127]: 2:19.1
              - generic [ref=e128]:
                - button "Adjust clip start" [ref=e129]
                - button "V1 אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל 0:43.6–0:56.6" [ref=e130]:
                  - generic [ref=e131]: V1
                  - generic "אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל" [ref=e132]:
                    - generic [ref=e133]: אחינו
                    - generic [ref=e134]: כל
                    - generic [ref=e135]: בית
                    - generic [ref=e136]: ישראל
                  - generic [ref=e137]: 0:43.6–0:56.6
                - button "Remove clip" [ref=e138] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e139]
              - generic [ref=e140]:
                - button "Adjust clip start" [ref=e141]
                - button "V2 הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה 0:56.6–1:03.9" [ref=e142]:
                  - generic [ref=e143]: V2
                  - generic "הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה" [ref=e144]:
                    - generic [ref=e145]: הנתונים
                    - generic [ref=e146]: בצרה
                    - generic [ref=e147]: ובשביה
                  - generic [ref=e148]: 0:56.6–1:03.9
                - button "Remove clip" [ref=e149] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e150]
              - generic [ref=e151]:
                - button "Adjust clip start" [ref=e152]
                - button "V3 הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה 1:03.9–1:13.1" [ref=e153]:
                  - generic [ref=e154]: V3
                  - generic "הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה" [ref=e155]:
                    - generic [ref=e156]: העומדים
                    - generic [ref=e157]: בין
                    - generic [ref=e158]: בים
                    - generic [ref=e159]: ובין
                  - generic [ref=e160]: 1:03.9–1:13.1
                - button "Remove clip" [ref=e161] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e162]
              - generic [ref=e163]:
                - button "Adjust clip start" [ref=e164]
                - button "V1 אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל 1:13.1–1:26.8" [ref=e165]:
                  - generic [ref=e166]: V1
                  - generic "אַחֵינוּ כָּל בֵּית יִשְׂרָאֵל" [ref=e167]:
                    - generic [ref=e168]: אחינו
                    - generic [ref=e169]: כל
                    - generic [ref=e170]: בית
                    - generic [ref=e171]: ישראל
                  - generic [ref=e172]: 1:13.1–1:26.8
                - button "Remove clip" [ref=e173] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e174]
              - generic [ref=e175]:
                - button "Adjust clip start" [ref=e176]
                - button "V2 הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה 1:26.8–1:35.1" [ref=e177]:
                  - generic [ref=e178]: V2
                  - generic "הַנְּתוּנִים בְּצָרָה וּבַשִּׁבְיָה" [ref=e179]:
                    - generic [ref=e180]: הנתונים
                    - generic [ref=e181]: בצרה
                    - generic [ref=e182]: ובשביה
                  - generic [ref=e183]: 1:26.8–1:35.1
                - button "Remove clip" [ref=e184] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e185]
              - generic [ref=e186]:
                - button "Adjust clip start" [ref=e187]
                - button "V3 הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה 1:35.1–1:43.0" [ref=e188]:
                  - generic [ref=e189]: V3
                  - generic "הָעוֹמְדִים בֵּין בַּיָּם וּבֵין בַּיַּבָּשָׁה" [ref=e190]:
                    - generic [ref=e191]: העומדים
                    - generic [ref=e192]: בין
                    - generic [ref=e193]: בים
                    - generic [ref=e194]: ובין
                  - generic [ref=e195]: 1:35.1–1:43.0
                - button "Remove clip" [ref=e196] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e197]
              - generic [ref=e198]:
                - button "Adjust clip start" [ref=e199]
                - button "V4 הַמָּקוֹם יְרַחֵם עֲלֵיהֶם 1:43.0–1:50.0" [ref=e200]:
                  - generic [ref=e201]: V4
                  - generic "הַמָּקוֹם יְרַחֵם עֲלֵיהֶם" [ref=e202]:
                    - generic [ref=e203]: המקום
                    - generic [ref=e204]: ירחם
                    - generic [ref=e205]: עליהם
                  - generic [ref=e206]: 1:43.0–1:50.0
                - button "Remove clip" [ref=e207] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e208]
              - generic [ref=e209]:
                - button "Adjust clip start" [ref=e210]
                - button "V5 וְיוֹצִיאֵם מִצָּרָה לִרְוָחָה 1:50.0–1:57.2" [ref=e211]:
                  - generic [ref=e212]: V5
                  - generic "וְיוֹצִיאֵם מִצָּרָה לִרְוָחָה" [ref=e213]:
                    - generic [ref=e214]: ויוציאם
                    - generic [ref=e215]: מצרה
                    - generic [ref=e216]: לרוחה
                  - generic [ref=e217]: 1:50.0–1:57.2
                - button "Remove clip" [ref=e218] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e219]
              - generic [ref=e220]:
                - button "Adjust clip start" [ref=e221]
                - button "V6 וּמֵאֲפֵלָה לְאוֹרָה 1:57.2–2:00.2" [ref=e222]:
                  - generic [ref=e223]: V6
                  - generic "וּמֵאֲפֵלָה לְאוֹרָה" [ref=e224]:
                    - generic [ref=e225]: ומאפלה
                    - generic [ref=e226]: לאורה
                  - generic [ref=e227]: 1:57.2–2:00.2
                - button "Remove clip" [ref=e228] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e229]
              - generic [ref=e230]:
                - button "Adjust clip start" [ref=e231]
                - button "V7 וּמִשִּׁעְבּוּד לִגְאֻלָּה 2:00.2–2:04.3" [ref=e232]:
                  - generic [ref=e233]: V7
                  - generic "וּמִשִּׁעְבּוּד לִגְאֻלָּה" [ref=e234]:
                    - generic [ref=e235]: ומשעבוד
                    - generic [ref=e236]: לגאלה
                  - generic [ref=e237]: 2:00.2–2:04.3
                - button "Remove clip" [ref=e238] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e239]
              - generic [ref=e240]:
                - button "Adjust clip start" [ref=e241]
                - button "V8 הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב.. 2:04.3–2:13.1" [ref=e242]:
                  - generic [ref=e243]: V8
                  - generic "הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב.." [ref=e244]:
                    - generic [ref=e245]: השתא
                    - generic [ref=e246]: בעגלא
                    - generic [ref=e247]: ובזמן
                    - generic [ref=e248]: קריב..
                  - generic [ref=e249]: 2:04.3–2:13.1
                - button "Remove clip" [ref=e250] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e251]
              - generic [ref=e252]:
                - button "Adjust clip start" [ref=e253]
                - button "Pause (Pause / blank) 2:13.1–2:19.1" [ref=e254]:
                  - generic [ref=e255]: Pause
                  - generic "(Pause / blank)" [ref=e256]:
                    - generic [ref=e257]: Pause
                  - generic [ref=e258]: 2:13.1–2:19.1
                - button "Remove clip" [ref=e259] [cursor=pointer]: ×
                - button "Adjust clip end" [ref=e260]
        - generic [ref=e261]:
          - button "Save Timings" [ref=e262] [cursor=pointer]
          - button "Cancel" [ref=e263] [cursor=pointer]
      - link "Open for Smartboard" [ref=e265] [cursor=pointer]:
        - /url: /smartboard-mode?slug=acheinu&lyrics=%D7%90%D6%B7%D7%97%D6%B5%D7%99%D7%A0%D7%95%D6%BC%20%D7%9B%D6%B8%D6%BC%D7%9C%20%D7%91%D6%B5%D6%BC%D7%99%D7%AA%20%D7%99%D6%B4%D7%A9%D6%B0%D7%82%D7%A8%D6%B8%D7%90%D6%B5%D7%9C%0A%D7%94%D6%B7%D7%A0%D6%B0%D6%BC%D7%AA%D7%95%D6%BC%D7%A0%D6%B4%D7%99%D7%9D%20%D7%91%D6%B0%D6%BC%D7%A6%D6%B8%D7%A8%D6%B8%D7%94%20%D7%95%D6%BC%D7%91%D6%B7%D7%A9%D6%B4%D6%BC%D7%81%D7%91%D6%B0%D7%99%D6%B8%D7%94%0A%D7%94%D6%B8%D7%A2%D7%95%D6%B9%D7%9E%D6%B0%D7%93%D6%B4%D7%99%D7%9D%20%D7%91%D6%B5%D6%BC%D7%99%D7%9F%20%D7%91%D6%B7%D6%BC%D7%99%D6%B8%D6%BC%D7%9D%20%D7%95%D6%BC%D7%91%D6%B5%D7%99%D7%9F%20%D7%91%D6%B7%D6%BC%D7%99%D6%B7%D6%BC%D7%91%D6%B8%D6%BC%D7%A9%D6%B8%D7%81%D7%94%20%0A%D7%94%D6%B7%D7%9E%D6%B8%D6%BC%D7%A7%D7%95%D6%B9%D7%9D%20%D7%99%D6%B0%D7%A8%D6%B7%D7%97%D6%B5%D7%9D%20%D7%A2%D6%B2%D7%9C%D6%B5%D7%99%D7%94%D6%B6%D7%9D%0A%D7%95%D6%B0%D7%99%D7%95%D6%B9%D7%A6%D6%B4%D7%99%D7%90%D6%B5%D7%9D%20%D7%9E%D6%B4%D7%A6%D6%B8%D6%BC%D7%A8%D6%B8%D7%94%20%D7%9C%D6%B4%D7%A8%D6%B0%D7%95%D6%B8%D7%97%D6%B8%D7%94%0A%D7%95%D6%BC%D7%9E%D6%B5%D7%90%D6%B2%D7%A4%D6%B5%D7%9C%D6%B8%D7%94%20%D7%9C%D6%B0%D7%90%D7%95%D6%B9%D7%A8%D6%B8%D7%94%0A%D7%95%D6%BC%D7%9E%D6%B4%D7%A9%D6%B4%D6%BC%D7%81%D7%A2%D6%B0%D7%91%D6%BC%D7%95%D6%BC%D7%93%20%D7%9C%D6%B4%D7%92%D6%B0%D7%90%D6%BB%D7%9C%D6%B8%D6%BC%D7%94%20%0A%D7%94%D6%B7%D7%A9%D6%B0%D7%81%D7%AA%D6%B8%D6%BC%D7%90%20%D7%91%D6%B7%D6%BC%D7%A2%D6%B2%D7%92%D6%B8%D7%9C%D6%B8%D7%90%20%D7%95%D6%BC%D7%91%D6%B4%D7%96%D6%B0%D7%9E%D6%B7%D7%9F%20%D7%A7%D6%B8%D7%A8%D6%B4%D7%99%D7%91..&youtube=https%3A%2F%2Fyoutu.be%2Fq4PxCtN5BgE
        - img [ref=e266]
        - text: Open for Smartboard
  - contentinfo [ref=e270]:
    - generic [ref=e271]:
      - generic [ref=e272]:
        - generic [ref=e273]:
          - heading "Downloads" [level=4] [ref=e274]
          - button "Niggun Sheet" [ref=e275] [cursor=pointer]
          - link "Simcha Sheet" [ref=e276] [cursor=pointer]:
            - /url: https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link
        - generic [ref=e277]:
          - heading "Navigation" [level=4] [ref=e278]
          - link "Song Directory" [ref=e279] [cursor=pointer]:
            - /url: /songs
          - link "Sheet Builder" [ref=e280] [cursor=pointer]:
            - /url: /sheet-builder
          - link "Contact" [ref=e281] [cursor=pointer]:
            - /url: /contact
        - generic [ref=e282]:
          - heading "Legal" [level=4] [ref=e283]
          - link "Contact Us" [ref=e284] [cursor=pointer]:
            - /url: /contact
          - link "Tracking Disclosure" [ref=e285] [cursor=pointer]:
            - /url: /tracking-disclosure
          - paragraph [ref=e286]: Choose cookie-based or fallback analytics from the privacy control.
      - generic [ref=e287]:
        - paragraph [ref=e288]: © 2026 Yehudah Jacobs - The Niggun Sheet
        - paragraph [ref=e289]: Discover Your Perfect Niggun
  - button "Open Next.js Dev Tools" [ref=e295] [cursor=pointer]:
    - img [ref=e296]
  - alert [ref=e300]
  - generic "Privacy settings" [ref=e301]:
    - button "Privacy" [ref=e302] [cursor=pointer]
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