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
    <header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      padding: '1rem 2rem', 
      backgroundColor: '#1a1a1a', 
      color: '#fff',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      <Link href="/" style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#f2cb05', marginRight: '2rem', textDecoration: 'none' }}>
        <span style={{ color: '#888' }}>|||</span> NIGGUN SHEET
      </Link>
      <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', flex: 1 }}>
        <Link href="/" style={{ color: '#e0e0e0', textDecoration: 'none' }}>Home</Link>
        <Link href="/songs" style={{ color: '#e0e0e0', textDecoration: 'none' }}>Songs</Link>
        <Link href="/sheet-builder-v2" style={{ color: '#e0e0e0', textDecoration: 'none' }}>Sheet Builder</Link>
        <Link href="/bencher" style={{ color: '#e0e0e0', textDecoration: 'none' }}>Bencher</Link>
        <Link href="/contact" style={{ color: '#e0e0e0', textDecoration: 'none' }}>Contact</Link>
      </nav>
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', alignItems: 'center' }}>
        <div>
          <HeaderAuthControls />
        </div>
        <NiggunSheetDownloadButton
          style={{ 
            borderRadius: '20px', 
            border: '1px solid #f2cb05', 
            color: '#1a1a1a', 
            backgroundColor: '#f2cb05',
            padding: '0.4rem 1rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Download Sheet
        </NiggunSheetDownloadButton>
      </div>
    </header>
  );
}
