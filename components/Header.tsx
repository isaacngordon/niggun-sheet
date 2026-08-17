'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import NiggunSheetDownloadButton from '@/components/NiggunSheetDownloadButton';

const HeaderAuthControls = dynamic(() => import('@/components/HeaderAuthControls'), {
  ssr: false,
  loading: () => <button disabled className="header-signin-btn">Loading...</button>,
});

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBetaVersion, setShowBetaVersion] = useState(false);
  const showSheetBuilderTour = pathname === '/sheet-builder';
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
  const betaAppVersion = process.env.NEXT_PUBLIC_APP_VERSION_BETA || '1.2';

  useEffect(() => {
    setShowBetaVersion(window.location.hostname === 'beta.niggunsheet.com');
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleStartSheetBuilderTour = () => {
    window.dispatchEvent(new CustomEvent('sheet-builder:start-tour'));
  };

  const navLinks: Array<{ href: string; label: string; badge?: string }> = [
    { href: '/songs', label: 'Song Directory' },
    { href: '/sheet-builder', label: 'Sheet Builder' },
    { href: '/bencher', label: 'Bencher' },
  ];

  return (
    <header className="site-header">
      <Link href="/" className="site-header-brand">
        <span aria-hidden="true">|||</span> NIGGUN SHEET
      </Link>
      <nav className="site-header-nav" aria-label="Main">
        <Link href="/" aria-current={isActive('/') ? 'page' : undefined}>Home</Link>
        <Link href="/songs" aria-current={isActive('/songs') ? 'page' : undefined}>Songs</Link>
        <Link href="/sheet-builder" aria-current={isActive('/sheet-builder') ? 'page' : undefined}>Sheet Builder</Link>
        <Link href="/bencher" aria-current={isActive('/bencher') ? 'page' : undefined}>Bencher</Link>
        <Link href="/contact" aria-current={isActive('/contact') ? 'page' : undefined}>Contact</Link>
      </nav>
      <div className="site-header-actions">
        <HeaderAuthControls />
        {!pathname.startsWith('/bencher') && (
        <NiggunSheetDownloadButton className="site-header-download">
          Download Sheet
        </NiggunSheetDownloadButton>
        )}
      </div>
    </header>
  );
}
