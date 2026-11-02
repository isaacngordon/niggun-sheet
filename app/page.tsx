import React from 'react';
import Link from 'next/link';
import * as cheerio from 'cheerio';
import CiscoAccordion from '@/components/CiscoAccordion';
import Header from '@/components/Header';
import KumzitzSheetDownloadButton from '@/components/KumzitzSheetDownloadButton';
import './home.css';

export const metadata = {
  title: 'Kumzitz Sheet | Kumzits songs, kumzits PDFs, and a kumzits guide',
  description: 'Kumzitz Sheet is a simple and powerful platform offering song discovery, custom sheet building, and an interactive smartboard mode for your classroom or kumzitz. Learn kumzits songs, build a kumzits PDF, or read the kumzits guide.',
  keywords: [
    'kumzits',
    'kumzits pdf',
    'kumzits guide',
    'learn kumzits songs',
    'how to make a kumzits',
    'kumzitz',
    'kumzitz songs',
    'kumzitz pdf',
    'kumzitz sheet',
  ],
};

async function getTickerText() {
  try {
    const url = "https://docs.google.com/document/d/e/2PACX-1vTwUD2tGafam1L7ZL-RODWU8d9oHcG6DJLMagu2neORxoBCGpxb323W130bySiZts_9tfSeSP6-WuRX/pub";
    const res = await fetch(url, { next: { revalidate: 30 } }); // Cache hits revalidate every 30s
    if (!res.ok) return [{ text: "Welcome to Kumzitz Sheet | Exploring Jewish Music", isLink: false }];

    const html = await res.text();
    const $ = cheerio.load(html);
    let content = $('.doc-content').text().trim();
    if (!content) return [{ text: "Welcome to Kumzitz Sheet | Exploring Jewish Music", isLink: false }];

    // Strip out "Tab 1", "Tab 2", etc.
    content = content.replace(/Tab \d+/g, '').trim();

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
    return [{ text: "Welcome to Kumzitz Sheet | Exploring Jewish Music", isLink: false }];
  }
}

const TOOLS = [
  {
    href: '/songs',
    name: 'Song Directory',
    desc: 'Browse a curated list of classic and contemporary kumzitz songs.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    href: '/sheet-builder',
    name: 'Sheet Builder',
    desc: 'Drag and drop songs to make a custom kumzitz printout with lyrics.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    href: '/smartboard-mode',
    name: 'Smartboard Mode',
    desc: 'Project any song full screen, sized for a classroom or a kumzitz.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

export default async function Home() {
  const tickerParts = await getTickerText();

  return (
    <div className="hp-page">
      <Header />

      <section className="hp-ticker" aria-label="Site announcement">
        <p>
          {tickerParts.map((part, i) =>
            part.isLink ? (
              <a key={i} href={part.url!} target="_blank" rel="noopener noreferrer">
                {part.text}
              </a>
            ) : (
              <React.Fragment key={i}>{part.text}</React.Fragment>
            )
          )}
        </p>
      </section>

      <main id="main">
        <section className="hp-hero" aria-labelledby="home-title">
          <div className="hp-hero-media">
            <img
              src="/assets/background_small_greyscale.png"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
            />
          </div>

          <div className="hp-inner">
            <div className="hp-hero-copy">
              <p className="hp-eyebrow">Kumzitz Sheet</p>
              <h1 className="hp-title" id="home-title">
                The website for kumzitz lovers
              </h1>
              <p className="hp-lede">
                All the songs you thought you knew.
              </p>
              <div className="hp-cta-row">
                <Link href="/sheet-builder" className="hp-btn hp-btn-primary">
                  Try the Sheet Builder
                </Link>
                <KumzitzSheetDownloadButton className="hp-btn hp-btn-secondary">
                  View all
                </KumzitzSheetDownloadButton>
              </div>
            </div>
          </div>
        </section>

        <section className="hp-section" aria-labelledby="home-tools-title">
          <div className="hp-inner">
            <div className="hp-section-head">
              <h2 className="hp-h2" id="home-tools-title">Explore the tools</h2>
              <p className="hp-section-lede">
                Three ways to use Kumzitz Sheet. Each one works on its own — start
                wherever you like.
              </p>
            </div>

            <ul className="hp-tools">
              {TOOLS.map((tool) => (
                <li key={tool.href}>
                  <Link href={tool.href} className="hp-tool">
                    <span className="hp-tool-icon">{tool.icon}</span>
                    <h3 className="hp-tool-name">{tool.name}</h3>
                    <p className="hp-tool-desc">{tool.desc}</p>
                    <span className="hp-tool-more">
                      Open <span aria-hidden="true">›</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CiscoAccordion />
      </main>
    </div>
  );
}
