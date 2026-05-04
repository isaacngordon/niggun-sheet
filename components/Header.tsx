'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import NiggunSheetDownloadButton from '@/components/NiggunSheetDownloadButton';

const HeaderAuthControls = dynamic(() => import('@/components/HeaderAuthControls'), {
  ssr: false,
  loading: () => <button disabled className="header-signin-btn">Sign In</button>,
});

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showSheetBuilderTour = pathname === '/sheet-builder';

  const isActive = (path: string) => pathname === path;

  const handleStartSheetBuilderTour = () => {
    window.dispatchEvent(new CustomEvent('sheet-builder:start-tour'));
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/songs', label: 'Song Directory' },
    { href: '/sheet-builder', label: 'Sheet Builder', badge: 'new' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo */}
        <div className="header-logo">
          <Link href="/">
            <Image
              className="header-logo-image"
              src="/assets/Niggun_Sheet_Header_Logo.png"
              alt="Niggun Sheet"
              width={220}
              height={36}
              priority={pathname === '/'}
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link 
                  href={link.href}
                  className={isActive(link.href) ? 'active' : ''}
                >
                  {link.label}
                  {link.badge && <span className="nav-badge">{link.badge}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Actions */}
        <div className="header-actions">
          {showSheetBuilderTour && (
            <button className="header-tour-btn" onClick={handleStartSheetBuilderTour}>Tour</button>
          )}
          <HeaderAuthControls />
          <NiggunSheetDownloadButton className="btn-primary header-download-btn">
            Download Sheet
          </NiggunSheetDownloadButton>
          
          {/* Mobile menu button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="mobile-nav">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link 
                  href={link.href}
                  className={isActive(link.href) ? 'active' : ''}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                  {link.badge && <span className="nav-badge">{link.badge}</span>}
                </Link>
              </li>
            ))}
            <li className="mobile-nav-auth">
              {showSheetBuilderTour && (
                <button
                  className="mobile-nav-signin mobile-nav-tour-btn"
                  onClick={() => {
                    handleStartSheetBuilderTour();
                    setMobileMenuOpen(false);
                  }}
                >
                  Tour
                </button>
              )}
              <HeaderAuthControls mobile onDone={() => setMobileMenuOpen(false)} />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
