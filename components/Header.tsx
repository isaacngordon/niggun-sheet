'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useNiggunSheetDownload } from '@/components/NiggunSheetDownload';
import { useGoogleAuth } from '@/components/GoogleAuthProvider';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { download, downloading } = useNiggunSheetDownload();
  const { user, signIn, signOut, loading: authLoading, restoring, ready: authReady } = useGoogleAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isActive = (path: string) => pathname === path;

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
            <img src="/assets/Niggun_Sheet_Header_Logo.png" alt="Niggun Sheet" />
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
          {mounted && user ? (
            <div className="header-user-menu">
              <span className="header-signed-in" title={user.email} style={restoring ? { opacity: 0.6 } : undefined}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                {user.email.split('@')[0]}
              </span>
              {!restoring && <button onClick={signOut} className="header-signout-btn">Sign Out</button>}
            </div>
          ) : (
            <button
              onClick={signIn}
              disabled={mounted && (authLoading || !authReady)}
              className="header-signin-btn"
            >
              {authLoading ? 'Signing in...' : 'Sign In'}
            </button>
          )}
          <button
            onClick={download}
            disabled={downloading}
            className="btn-primary header-download-btn"
          >
            Download Sheet
          </button>
          
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
              {mounted && user ? (
                <>
                  <span className="mobile-nav-user" style={restoring ? { opacity: 0.6 } : undefined}>{user.email}</span>
                  {!restoring && <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="mobile-nav-signout">Sign Out</button>}
                </>
              ) : (
                <button onClick={() => { signIn(); setMobileMenuOpen(false); }} disabled={mounted && (authLoading || !authReady)} className="mobile-nav-signin">
                  {authLoading ? 'Signing in...' : 'Sign In with Google'}
                </button>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
