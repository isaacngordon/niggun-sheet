'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import KumzitzSheetDownloadButton from '@/components/KumzitzSheetDownloadButton';
import { usePrintShopMode } from '@/hooks/usePrintShopMode';

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
  // Print shop mode persists as the visitor browses the whole site.
  const { shop: printShop } = usePrintShopMode();

  useEffect(() => {
    setShowBetaVersion(window.location.hostname === 'beta.kumzitzsheet.com');
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleStartSheetBuilderTour = () => {
    window.dispatchEvent(new CustomEvent('sheet-builder:start-tour'));
  };

  const navLinks: Array<{ href: string; label: string; badge?: string }> = [
    { href: '/songs', label: 'Song Directory' },
    { href: '/sheet-builder', label: 'Sheet Builder' },
  ];

  return (
    <header className="site-header">
      <Link href="/" className="site-header-brand">
        <span aria-hidden="true">|||</span> KUMZITZ SHEET
      </Link>
      {printShop?.logoPath ? (
        <div className="site-header-shop-badge" aria-label={`${printShop.name} mode active`}>
          <Image
            src={printShop.logoPath}
            alt={printShop.logoAlt || `${printShop.name} logo`}
            width={116}
            height={66}
            className="site-header-shop-logo"
          />
          <div className="site-header-shop-copy">
            <span className="site-header-shop-label">Print partner</span>
            <span className="site-header-shop-name">{printShop.name}</span>
          </div>
        </div>
      ) : null}
      <nav className="site-header-nav" aria-label="Main">
        <Link href="/" aria-current={isActive('/') ? 'page' : undefined}>Home</Link>
        <Link href="/songs" aria-current={isActive('/songs') ? 'page' : undefined}>Songs</Link>
        <Link href="/sheet-builder" aria-current={isActive('/sheet-builder') ? 'page' : undefined}>Sheet Builder</Link>
        <Link href="/contact" aria-current={isActive('/contact') ? 'page' : undefined}>Contact</Link>
      </nav>
      <div className="site-header-actions">
        <HeaderAuthControls />
        {!pathname.startsWith('/bencher') && (
        <KumzitzSheetDownloadButton className="site-header-download">
          Download Sheet
        </KumzitzSheetDownloadButton>
        )}
      </div>
    </header>
  );
}
