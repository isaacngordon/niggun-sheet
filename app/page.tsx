import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NiggunSheetDownloadButton from '@/components/NiggunSheetDownloadButton';

const builderSteps = [
  'Search the library and open the song you need.',
  'Add it to a printable sheet and choose the layout you want.',
  'Put it on screen, karaoke style, when the room needs to follow along.',
  'Reuse the same set for practice, class, or a kumzitz.',
];

const primaryPaths = [
  {
    number: '01',
    eyebrow: 'Fastest route',
    title: 'Find the song',
    copy: 'Open the database to see lyrics and music put together for a learning experience like no other.',
    href: '/songs',
    cta: 'Open Song Directory',
  },
  {
    number: '02',
    eyebrow: 'Most flexible',
    title: 'Build Your Own',
    copy: 'Use the drag-and-drop builder to make your very own kumzits sheet.',
    href: '/sheet-builder',
    cta: 'Open Sheet Builder',
    featured: true,
  },
  {
    number: '03',
    eyebrow: 'Print-first',
    title: 'Grab a ready-made sheet',
    copy: 'If you want the whole shebang, download the ready-made sheet with all you need for a kumzits.',
    href: '/bencher',
    cta: 'Get the ready-made sheet',
  },
];

const heroPills = ['Song library', 'Sheet builder', 'Smartboard mode'];

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content" className="home-shell">
        <section className="home-hero">
          <div className="container home-hero-grid" style={{ alignItems: 'center' }}>
            <div className="home-copy">
              <div className="home-kicker">The Jewish Music Resource</div>
              <h1 className="home-title">Create printable kumzitz sheets and project lyrics on-screen.</h1>
              <p className="home-summary">
                Find your favorite niggunim, read the lyrics, and instantly generate formatting-ready PDFs or a Smartboard display for your class or kumzitz.
              </p>
              
              {/* Applying Hick's Law: Simplify the primary call to action to reduce cognitive load */}
              <div className="home-primary-actions" style={{ marginTop: '2rem' }}>
                <Link href="/sheet-builder" className="home-button home-button-primary" style={{ padding: '1rem 2rem', fontSize: '1.25rem' }}>
                  Start a New Sheet
                </Link>
                <Link href="/songs" className="home-button home-button-secondary" style={{ padding: '1rem 2rem', fontSize: '1.25rem' }}>
                  Search the Song Library
                </Link>
              </div>
            </div>

            <div className="home-preview-panel" aria-hidden="true">
              <HomeWorkflowPreview />
            </div>
          </div>
        </section>

        {/* Applying Miller's Law & Chunking: Organize features into distinct, scannable units */}
        <section className="home-routes-section" style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '5rem 0' }}>
          <div className="container">
            <div className="home-section-intro" style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '800px', margin: '0 auto 4rem' }}>
              <div className="home-section-kicker">Choose Your Path</div>
              <h2 className="home-section-title">What do you need to do today?</h2>
              <p className="home-section-copy">
                Whether you need a quick lyric check or a full printout for 100 people, simply pick the tool you need.
              </p>
            </div>

            <div className="home-route-grid">
              {primaryPaths.map((path) => (
                <article
                  key={path.href}
                  className={`home-route-card${path.featured ? ' featured' : ''}`}
                >
                  <div className="home-route-number">{path.number}</div>
                  <div className="home-route-eyebrow">{path.eyebrow}</div>
                  <h3 className="home-route-title">{path.title}</h3>
                  <p className="home-route-copy">{path.copy}</p>
                  <Link href={path.href} className="home-route-link">
                    {path.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-builder-section">
          <div className="container home-builder-grid">
            <div className="home-builder-copy">
              <div className="home-section-kicker">What happens after you open the builder?</div>
              <h2 className="home-section-title">The workflow stays in the same order every time.</h2>
              <p className="home-section-copy">
                Search, add, arrange, then present. The interface is built so the next useful
                action stays close to the one you just finished.
              </p>
            </div>

            <div className="home-builder-side">
              <ol className="home-builder-steps">
                {builderSteps.map((step, index) => (
                  <li key={step} className="home-builder-step">
                    <span className="home-builder-step-number">{index + 1}</span>
                    <span className="home-builder-step-copy">{step}</span>
                  </li>
                ))}
              </ol>

              <article className="home-support-card">
                <div className="home-support-kicker">Also available</div>
                <h3 className="home-support-title">Need benching instead of a song sheet?</h3>
                <p className="home-support-copy">
                  Bencher mode starts with the print layout, so you can focus on the logo, format,
                  and back-page songs instead of building from scratch.
                </p>
                <Link href="/bencher" className="home-route-link">
                  Open Bencher Builder
                </Link>
              </article>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function HomeWorkflowPreview() {
  return (
    <div className="home-workflow">
      <div className="home-workflow-header">
        <div>
          <div className="home-preview-eyebrow">Typical workflow</div>
          <div className="home-workflow-title">From search to classroom in one pass</div>
        </div>
        <div className="home-workflow-badge">3 core steps</div>
      </div>

      <div className="home-workflow-grid">
        <article className="home-workflow-step">
          <span className="home-workflow-step-number">1</span>
          <div>
            <h3 className="home-workflow-step-title">Search</h3>
            <p className="home-workflow-step-copy">
              Find the song and confirm the words, audio, and timing.
            </p>
          </div>
        </article>

        <article className="home-workflow-step featured">
          <span className="home-workflow-step-number">2</span>
          <div>
            <h3 className="home-workflow-step-title">Build</h3>
            <p className="home-workflow-step-copy">
              Add only what you need, choose the layout, and keep the page readable.
            </p>
          </div>
        </article>

        <article className="home-workflow-step">
          <span className="home-workflow-step-number">3</span>
          <div>
            <h3 className="home-workflow-step-title">Present</h3>
            <p className="home-workflow-step-copy">
              Put the lyrics on screen, karaoke style.
            </p>
          </div>
        </article>
      </div>

      <div className="home-workflow-footnote">
        Need something faster? Use the ready-made PDF or open Bencher mode when the layout is the
        whole job.
      </div>
    </div>
  );
}
