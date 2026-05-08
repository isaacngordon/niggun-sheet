import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NiggunSheetDownloadButton from '@/components/NiggunSheetDownloadButton';

const builderSteps = [
  'Find your song',
  'Tap to focus on a line',
  'Enter playhead mode',
  'Watch as the auto-timed lyrics do the rest',
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="home-shell">
        <section className="home-hero">
          <div className="container home-hero-grid">
            <div className="home-copy">
              <div className="home-kicker">Built for the kumzitz</div>
              <h1 className="home-title">Add your songs. Build your sheet. Run the room.</h1>
              <p className="home-summary">
                Niggun Sheet isnt a streaming site, its not a lyrics site, its a combination of
                both. Letting you read, practice, print your own, or show it in your classroom.
                This site is built for anyone who wants to learn or share a niggun
              </p>
              <div className="home-search-shell">
                <BuilderMotionPreview />
              </div>
              <div className="home-primary-actions">
                <Link href="/sheet-builder" className="home-button home-button-primary">
                  Open Sheet Builder
                </Link>
                <Link href="/songs" className="home-button home-button-secondary">
                  Browse Song Directory
                </Link>
              </div>
              <div className="home-download-strip">
                <span className="home-download-label">Need the ready-made sheets?</span>
                <div className="home-download-actions">
                  <NiggunSheetDownloadButton className="home-mini-button home-mini-button-primary">
                    Niggun Sheet PDF
                  </NiggunSheetDownloadButton>
                  <a
                    href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="home-mini-button home-mini-button-secondary"
                  >
                    Simcha Sheet PDF
                  </a>
                </div>
              </div>
            </div>

            <div className="home-preview-panel" aria-hidden="true">
              <div className="home-preview-window">
                <div className="home-preview-topbar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="home-preview-card home-preview-stage-card">
                  <div className="home-preview-stage-head">
                    <span className="home-preview-eyebrow">Smartboard mode</span>
                    <span className="home-preview-status">Live</span>
                  </div>
                  <div className="home-preview-stage-screen">
                    <div className="home-preview-stage-glow" />
                    <div className="home-preview-stage-scan" />
                    <div className="home-preview-stage-line home-preview-stage-line-current">
                      כִּי קָרוֹב אֵלֶיךָ הַדָּבָר מְאֹד
                    </div>
                    <div className="home-preview-stage-line home-preview-stage-line-next">
                      בְּפִיךָ וּבִלְבָבְךָ לַעֲשֹׂתוֹ
                    </div>
                    <div className="home-preview-stage-caption">Ki Karov in smartboard mode</div>
                  </div>
                  <div className="home-preview-progress home-preview-progress-animated">
                    <span className="filled" />
                  </div>
                </div>

                <div className="home-preview-columns">
                  <div className="home-preview-card home-preview-library">
                    <div className="home-preview-eyebrow">Song library</div>
                    <div className="home-preview-search">Search: ki karov</div>
                    <div className="home-preview-song-list">
                      <div className="home-preview-song-row active">
                        <strong>Ki Karov</strong>
                        <span>Eitan Katz</span>
                      </div>
                      <div className="home-preview-song-row">
                        <strong>Kol Haolam Kulo</strong>
                        <span>Rabbi Dovit Chait</span>
                      </div>
                      <div className="home-preview-song-row">
                        <strong>Keser</strong>
                        <span>Isaac Honig</span>
                      </div>
                    </div>
                  </div>

                  <div className="home-preview-card home-preview-sheet">
                    <div className="home-preview-eyebrow">Live sheet</div>
                    <div className="home-preview-sheet-title">Motzaei Shabbos Set</div>
                    <ol className="home-preview-setlist">
                      <li>Ki Karov</li>
                      <li>Kol Haolam Kulo</li>
                      <li>Keser</li>
                      <li>Lev Tahor</li>
                    </ol>
                    <div className="home-preview-layout-note">2 columns. English titles. Compact spacing.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="home-routes-section">
          <div className="container">
            <div className="home-section-intro">
              <div className="home-section-kicker home-section-kicker-sentence">start from the beginning</div>
              <h2 className="home-section-title">the core features</h2>
              <p className="home-section-copy">
                The three parts that make up this project
              </p>
            </div>

            <div className="home-route-grid">
              <article className="home-route-card">
                <div className="home-route-number">01</div>
                <h3 className="home-route-title">Find the song</h3>
                <p className="home-route-copy">
                  Open the database to see lyrics and music put together
                  for a learning experience like no other
                </p>
                <Link href="/songs" className="home-route-link">
                  Open Song Directory
                </Link>
              </article>

              <article className="home-route-card featured">
                <div className="home-route-number">02</div>
                <h3 className="home-route-title">Build Your Own</h3>
                <p className="home-route-copy">
                  Use the drag-and-drop builder to make your very own kumzits sheet
                </p>
                <Link href="/sheet-builder" className="home-route-link">
                  Open Sheet Builder
                </Link>
              </article>

              <article className="home-route-card">
                <div className="home-route-number">03</div>
                <h3 className="home-route-title">Grab a ready-made sheet</h3>
                <p className="home-route-copy">
                  If you want the whole shebang, download the ready made sheet with all you need for a kumzits
                </p>
                <NiggunSheetDownloadButton className="home-route-button">
                  Download Niggun Sheet
                </NiggunSheetDownloadButton>
              </article>
            </div>
          </div>
        </section>

        <section className="home-builder-section">
          <div className="container home-builder-grid">
            <div className="home-builder-copy">
              <div className="home-section-kicker">Why the smarboard mode?</div>
              <h2 className="home-section-title">geared for classrooms. Easy to navigate on the fly.</h2>
              <p className="home-section-copy">
                Gone are the days of copy and pasting from online and fumbling with word processors
                to show something on the board. This one&apos;s purpose built.
              </p>
            </div>

            <ol className="home-builder-steps">
              {builderSteps.map((step, index) => (
                <li key={step} className="home-builder-step">
                  <span className="home-builder-step-number">{index + 1}</span>
                  <span className="home-builder-step-copy">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function BuilderMotionPreview() {
  return (
    <div className="home-builder-gif" aria-hidden="true">
      <div className="home-builder-gif-window">
        <div className="home-builder-gif-header">
          <span />
          <span />
          <span />
          <div className="home-builder-gif-label">Sheet Builder in action</div>
        </div>
        <div className="home-builder-gif-body">
          <div className="home-builder-gif-library-panel">
            <div className="home-builder-gif-library-tabs">
              <div className="home-builder-gif-library-tab active">Song Library</div>
              <div className="home-builder-gif-library-tab">My Songs</div>
            </div>
            <div className="home-builder-gif-search">Search: ki karov</div>
            <div className="home-builder-gif-tip">
              <strong>Tip:</strong> Drag songs to the sheet or double-click to add them.
            </div>
            <div className="home-builder-gif-song home-builder-gif-song-1">
              <span>Ki Karov</span>
              <small>Eitan Katz</small>
            </div>
            <div className="home-builder-gif-song home-builder-gif-song-2">
              <span>Kol Haolam Kulo</span>
              <small>Rabbi Dovit Chait</small>
            </div>
            <div className="home-builder-gif-song home-builder-gif-song-3">
              <span>Keser</span>
              <small>Isaac Honig</small>
            </div>
            <div className="home-builder-gif-song home-builder-gif-song-4">
              <span>Lev Tahor</span>
              <small>Yeedle Werdyger</small>
            </div>
          </div>
          <div className="home-builder-gif-flow" />
          <div className="home-builder-gif-sheet-panel">
            <div className="home-builder-gif-sheet-toolbar">
              <div className="home-builder-gif-toolbar-pill active">Auto-fit</div>
              <div className="home-builder-gif-toolbar-pill">2 columns</div>
              <div className="home-builder-gif-toolbar-pill">Titles</div>
            </div>
            <div className="home-builder-gif-sheet-browser">
              <div className="home-builder-gif-sheet-page">
                <div className="home-builder-gif-sheet-page-label">Page 1</div>
                <div className="home-builder-gif-sheet-stage">
                  <div className="home-builder-gif-sheet-shadow" />
                  <div className="home-builder-gif-paper home-builder-gif-paper-back" />
                  <div className="home-builder-gif-paper">
                    <div className="home-builder-gif-paper-content">
                      <div className="home-builder-gif-paper-kicker">Kummzitz Sheet</div>
                      <div className="home-builder-gif-paper-grid">
                        <div className="home-builder-gif-paper-column">
                          <div className="home-builder-gif-paper-song home-builder-gif-paper-song-1">
                            <div className="home-builder-gif-paper-song-title-row">
                              <span className="home-builder-gif-paper-song-order">1</span>
                              <span className="home-builder-gif-paper-song-title">Ki Karov</span>
                            </div>
                            <div className="home-builder-gif-paper-song-lines">
                              <div>כִּי קָרוֹב אֵלֶיךָ הַדָבָר מְאוֹד</div>
                              <div>בְּפִיךָ וּבִלְבָבְךָ לַעֲשׂוֹתוֹ</div>
                            </div>
                          </div>
                          <div className="home-builder-gif-paper-song home-builder-gif-paper-song-3">
                            <div className="home-builder-gif-paper-song-title-row">
                              <span className="home-builder-gif-paper-song-order">3</span>
                              <span className="home-builder-gif-paper-song-title">Keser</span>
                            </div>
                            <div className="home-builder-gif-paper-song-lines">
                              <div>כֶּתֶר יִתְּנוּ לְךָ</div>
                            </div>
                          </div>
                        </div>
                        <div className="home-builder-gif-paper-column">
                          <div className="home-builder-gif-paper-song home-builder-gif-paper-song-2">
                            <div className="home-builder-gif-paper-song-title-row">
                              <span className="home-builder-gif-paper-song-order">2</span>
                              <span className="home-builder-gif-paper-song-title">Kol Haolam Kulo</span>
                            </div>
                            <div className="home-builder-gif-paper-song-lines">
                              <div>כָּל הָעוֹלָם כּוּלוֹ גֶּשֶׁר צַר מְאֹד</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="home-builder-gif-drag home-builder-gif-drag-1">
            <span>Ki Karov</span>
            <small>Eitan Katz</small>
          </div>
          <div className="home-builder-gif-drag home-builder-gif-drag-2">
            <span>Kol Haolam Kulo</span>
            <small>Rabbi Dovit Chait</small>
          </div>
          <div className="home-builder-gif-drag home-builder-gif-drag-3">
            <span>Keser</span>
            <small>Isaac Honig</small>
          </div>
        </div>
        <div className="home-builder-gif-footer">
          <div className="home-builder-gif-pill">Search songs</div>
          <div className="home-builder-gif-pill">Drag to sheet</div>
          <div className="home-builder-gif-pill">Download PDF</div>
        </div>
      </div>
    </div>
  );
}
