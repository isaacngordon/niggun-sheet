import React from 'react';
import Link from 'next/link';
import * as cheerio from 'cheerio';
import NiggunSheetDownloadButton from '@/components/NiggunSheetDownloadButton';
import CiscoAccordion from '@/components/CiscoAccordion';
import Header from '@/components/Header';

export const metadata = {
  title: 'Niggun Sheet | Tools for finding and building sheet music',
  description: 'Niggun Sheet is a simple and powerful platform offering song discovery, custom sheet building, printable benchers, and an interactive smartboard mode for your classroom or kumzitz.',
};

async function getTickerText() {
  try {
    const url = "https://docs.google.com/document/d/e/2PACX-1vTwUD2tGafam1L7ZL-RODWU8d9oHcG6DJLMagu2neORxoBCGpxb323W130bySiZts_9tfSeSP6-WuRX/pub";
    const res = await fetch(url, { next: { revalidate: 30 } }); // Cache hits revalidate every 30s
    if (!res.ok) return [{ text: "Welcome to Niggun Sheet | Exploring Jewish Music", isLink: false }];
    
    const html = await res.text();
    const $ = cheerio.load(html);
    const content = $('.doc-content').text().trim();
    if (!content) return [{ text: "Welcome to Niggun Sheet | Exploring Jewish Music", isLink: false }];

    // Parse {text{url}} blocks
    const regex = /\{([^{}]+)\{([^}]+)\}\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add preceding plain text
      if (match.index > lastIndex) {
        parts.push({ text: content.slice(lastIndex, match.index), isLink: false });
      }
      // Add the link
      let linkUrl = match[2].trim();
      if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://') && !linkUrl.startsWith('/')) {
        linkUrl = 'https://' + linkUrl;
      }
      parts.push({ text: match[1], url: linkUrl, isLink: true });
      lastIndex = regex.lastIndex;
    }

    // Add trailing plain text
    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex), isLink: false });
    }

    return parts;
  } catch (error) {
    console.error("Failed to parse ticker doc", error);
    return [{ text: "Welcome to Niggun Sheet | Exploring Jewish Music", isLink: false }];
  }
}

export default async function Home() {
  const tickerParts = await getTickerText();

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', fontFamily: 'Arial, sans-serif' }}>
      <Header />
      {/* Ticker Banner */}
      <section style={{ backgroundColor: '#fafafa', color: '#333', textAlign: 'center', padding: '0.6rem', borderBottom: '1px solid #e2e2e2' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.5px' }}>
          {tickerParts.map((part, i) => 
             part.isLink ? (
               <a key={i} href={part.url!} target="_blank" rel="noopener noreferrer" style={{ color: '#000', textDecoration: 'none', borderBottom: '2px solid #f2cb05', fontWeight: 'bold' }}>
                 {part.text}
               </a>
             ) : (
               <React.Fragment key={i}>{part.text}</React.Fragment>
             )
          )}
        </p>
      </section>

      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        padding: '6rem 2rem 4rem 2rem', 
        textAlign: 'left',
        color: '#fff',
        minHeight: '650px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundImage: 'url("/assets/background_small_greyscale.png")',
        backgroundSize: '1600px 650px',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000'
      }}>
        {/* Removed Glow/abstract background placeholder */}
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ maxWidth: '600px', marginBottom: '8rem' }}>
            <h1 style={{ fontSize: '4.5rem', fontWeight: 600, margin: '0 0 2rem 0', lineHeight: 1.1, letterSpacing: '-1px' }}>
              The website for<br/>kumzitz lovers
            </h1>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
               <Link href="/sheet-builder" legacyBehavior>
                 <button style={{ padding: '0.75rem 1.5rem', borderRadius: '30px', border: 'none', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                   Try the Sheet Builder
                 </button>
               </Link>
               <Link href="/songs" legacyBehavior>
                 <button style={{ padding: '0.75rem 1.5rem', borderRadius: '30px', border: '1px solid #fff', backgroundColor: 'transparent', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                   Browse Songs
                 </button>
               </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Badges Grid - Moved under the hero image section */}
      <section style={{ padding: '2rem', backgroundColor: '#000' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          {[
            { text: 'Niggun Sheet', url: '/songs' },
            { text: 'Simcha Sheet', url: '/sheet-builder' },
            { text: 'Song List', url: '/songs' },
            { text: 'Sheet Builder', url: '/sheet-builder' },
            { text: 'Bencher Builder', url: '/bencher' },
            { text: 'Smartboard Mode', url: '/smartboard-mode' }
          ].map((link, i) => (
            <Link key={link.text} href={link.url} legacyBehavior>
              <a style={{ 
                border: i === 3 ? '1px solid #f2cb05' : '1px solid rgba(255,255,255,0.2)', 
                boxShadow: i === 3 ? '0 0 15px rgba(242, 203, 5, 0.3)' : 'none',
                borderRadius: '8px', 
                padding: '1.25rem 1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.02)',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                color: '#fff',
                cursor: 'pointer'
              }}>
                <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{link.text}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>›</span>
              </a>
            </Link>
          ))}
        </div>
      </section>

      <CiscoAccordion />

      {/* Market-defining technologies */}
      <section style={{ padding: '5rem 1rem', backgroundColor: '#f8f9fa', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '3rem' }}>
          Market-defining technologies driving the future of AI
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
          {['Cloud Control', 'AgenticOps', 'AI networking', 'Silicon One', 'Hybrid Mesh Firewall', 'Cisco IQ'].map(tech => (
            <span key={tech} style={{ padding: '0.5rem 1rem', borderBottom: '2px solid transparent', cursor: 'pointer', fontWeight: 600 }}>
              {tech}
            </span>
          ))}
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'left', display: 'flex', flexWrap: 'wrap', gap: '4rem', alignItems: 'center' }}>
          <div style={{ flex: '1 1 500px' }}>
            <h3 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Cisco Cloud Control</h3>
            <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
              The unified platform with one shared view across every IT domain.
            </p>
            <Link href="#" style={{ color: '#f2cb05', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem' }}>
              Discover Cisco Cloud Control ›
            </Link>
          </div>
          <div style={{ flex: '1 1 500px', height: '300px', backgroundColor: '#e2e2e2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <span style={{ color: '#999' }}>[ Dashboard Screenshot Placeholder ]</span>
          </div>
        </div>
      </section>


      {/* Global Scale Numbers */}
      <section style={{ padding: '6rem 1rem', backgroundColor: '#081018', color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '4rem' }}>
          Global scale. Unified technology. Powered by AI.
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: '#f2cb05' }}>39M</div>
            <div style={{ fontSize: '1.1rem', color: '#a0a0a0' }}>Networking devices connected</div>
          </div>
          <div>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: '#f2cb05' }}>1B</div>
            <div style={{ fontSize: '1.1rem', color: '#a0a0a0' }}>Clients connecting monthly</div>
          </div>
          <div>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: '#f2cb05' }}>750B+</div>
            <div style={{ fontSize: '1.1rem', color: '#a0a0a0' }}>Security events observed daily</div>
          </div>
        </div>
      </section>

      {/* Innovation / Case Studies */}
      <section style={{ padding: '5rem 1rem', backgroundColor: '#f8f9fa' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '3rem' }}>
            Innovation in action: Real results powered by leading technology
          </h2>
          
          <div style={{ display: 'flex', gap: '4rem', alignItems: 'center', flexWrap: 'wrap' }}>
             <div style={{ flex: '1 1 400px' }}>
               <h3 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', lineHeight: 1.2 }}>
                 Brewing global connectivity and visibility for Nestlé
               </h3>
               <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem', lineHeight: 1.6 }}>
                 Nestlé depends on Cisco networking and assurance for connectivity, proactive troubleshooting, and full visibility across 1700 sites.
               </p>
               <Link href="#" style={{ color: '#f2cb05', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem' }}>
                 Learn about Nestlé ›
               </Link>
             </div>
             <div style={{ flex: '1 1 600px', height: '400px', backgroundColor: '#ccc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2rem', color: '#666', fontWeight: 'bold' }}>Nestlé</span>
             </div>
          </div>
        </div>
      </section>

    </div>
  );
}
