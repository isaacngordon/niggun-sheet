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
    icon: 'search',
    title: 'Industry-leading DNS security',
    copy: 'DNS is at the heart of every internet connection request. Securing the DNS layer means blocking malicious domains, IP addresses, and cloud applications before a connection is ever established. More than 30,000 organizations use Umbrella DNS to deliver a fast, safe, and reliable internet experience that is simple to deploy and easy to manage.',
    href: '/songs',
    cta: 'Niggun Sheet Songs ›',
  },
  {
    icon: 'shield',
    title: 'Robust DNS security + more',
    copy: 'Get all Umbrella DNS features and much more for the same price. Backed by Cisco’s global network of recursive DNS resolvers and advanced AI-driven detection, Cisco Secure Access – DNS Defense delivers fast, comprehensive threat protection. Data Loss Prevention (DLP) safeguards sensitive data, built-in malware protection scans and removes malware from cloud file storage apps, and unified policy management makes deployment and management easy.',
    href: '/sheet-builder',
    cta: 'Secure Access - DNS Defense ›',
  },
  {
    icon: 'cloud',
    title: 'Secure Internet Access',
    copy: 'Everything in Umbrella SIG plus much more. Secure Internet Access (SIA) protects users and devices connecting to the internet. It combines DNS security, secure web gateway (SWG), cloud access security broker (CASB), Data Loss Prevention (DLP), malware protection, firewall as a service, and more in a single solution. AI-powered controls secure the use of generative AI tools, while built-in Experience Insights (digital experience monitoring based on ThousandEyes) provides deep visibility and faster troubleshooting.',
    href: '/bencher',
    cta: 'Secure Access SIA ›',
  },
  {
    icon: 'lock',
    title: 'Security Service Edge (SSE)',
    copy: 'The full Secure Access solution brings together Secure Internet Access (SIA) with Secure Private Access (SPA) for a complete SSE solution that securely connects users and IoT things to SaaS apps, private apps, and the internet. It features a unique, zero trust approach that combines Zero Trust Network Access (ZTNA) and VPN as a Service (VPNaaS), enabling users to automatically, transparently, and safely access all private applications (not just some) without extra steps or cumbersome verification tasks.',
    href: '/smartboard-mode',
    cta: 'Secure Access ›',
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
                Find your favorite niggunim, read the lyrics, and instantly generate pre-formatted PDFs or a Smartboard display for your class or kumzitz.
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
        <section className="home-routes-section" style={{ backgroundColor: '#ffffff', color: '#1a1a1a', padding: '5rem 0' }}>
          <div className="container">
            <div className="home-section-intro" style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '800px', margin: '0 auto 4rem' }}>
              <h2 className="home-section-title" style={{ fontSize: '2rem', fontWeight: 300, color: '#333' }}>
                From DNS-layer security to a full SSE solution,<br/>
                we've got you covered
              </h2>
              <p className="home-section-copy" style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
                Building on Cisco Umbrella's proven security, Cisco Secure Access now offers even more advanced protection
              </p>
            </div>

            <div className="home-route-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '4rem 6rem',
              maxWidth: '1000px',
              margin: '0 auto' 
            }}>
              {primaryPaths.map((path) => (
                <article
                  key={path.href}
                  className="home-route-card"
                  style={{ 
                    border: 'none', 
                    background: 'transparent', 
                    textAlign: 'center',
                    padding: 0,
                    gap: '1rem',
                  }}
                >
                  <div style={{ margin: '0 auto 1rem' }}>
                    {/* Placeholder for SVG icons matching the screenshot */}
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      border: '1.5px solid #666', 
                      borderRadius: '8px', 
                      margin: '0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666'
                    }}>
                      {/* Icon stand-in based on the object key */}
                      {path.icon === 'search' && '🔍'}
                      {path.icon === 'shield' && '🛡️'}
                      {path.icon === 'cloud' && '☁️'}
                      {path.icon === 'lock' && '🔒'}
                    </div>
                  </div>
                  <h3 className="home-route-title" style={{ fontSize: '1.25rem', fontWeight: 400, color: '#333' }}>
                    {path.title}
                  </h3>
                  <p className="home-route-copy" style={{ fontSize: '0.75rem', lineHeight: 1.6, color: '#666', flex: 1 }}>
                    {path.copy}
                  </p>
                  <Link href={path.href} className="home-route-link" style={{ 
                    background: 'transparent',
                    border: 'none',
                    color: '#0062cc',
                    padding: 0,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    justifyContent: 'center'
                  }}>
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
