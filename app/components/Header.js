'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-gray-900 sticky top-0 z-50">
      <div className="relative z-50 flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo positioned at far left */}
        <div className="flex items-center">
          <Link href="/" className="mr-8">
            <img src="/assets/Niggun_Sheet_Header_Logo.png" alt="Niggun Sheet" className="h-10" />
          </Link>
        </div>
        
        {/* Mobile menu button (only visible on mobile) */}
        <div className="flex lg:hidden ml-auto">
          <button 
            type="button" 
            className="block text-white" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="bars" className="svg-inline--fa fa-bars" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="24" height="24">
              <path fill="currentColor" d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"></path>
            </svg>
          </button>
        </div>
        
        {/* Desktop Navigation (now positioned after logo) */}
        <div className="hidden lg:flex lg:items-center lg:flex-1 lg:justify-center">
          <ul className="flex h-full items-center gap-8">
            <Link className="flex items-center px-3 py-3 text-base font-normal text-header-link hover:text-white whitespace-nowrap" href="/">Home</Link>
            <Link className="flex items-center px-3 py-3 text-base font-normal text-header-link hover:text-white whitespace-nowrap" href="/songs">Song Directory</Link>
            <Link className="flex items-center px-3 py-3 text-base font-normal text-header-link hover:text-white whitespace-nowrap" href="/sheet-builder">
              Sheet Builder
              <span className="ml-2.5 rounded-sm bg-yellow-400 p-1 text-xs font-bold uppercase leading-none text-gray-900">new</span>
            </Link>
            <Link className="flex items-center px-3 py-3 text-base font-normal text-header-link hover:text-white whitespace-nowrap" href="/contact">Contact</Link>
          </ul>
        </div>
        
        {/* User Action Buttons */}
        <div className="flex h-full min-h-8 shrink-0 items-center justify-end">
          <button type="button" className="flex justify-center items-center font-bold rounded-full transition-colors bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-1.5 px-5 text-sm">
            <span className="relative flex min-h-5 items-center justify-center">
              <span className="whitespace-nowrap">Download Sheet</span>
            </span>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu (hidden by default) */}
      <div className={mobileMenuOpen ? 'lg:hidden' : 'hidden lg:hidden'}>
        <div className="space-y-1 px-4 pb-3 pt-2">
          <Link href="/" className="block px-3 py-2 text-base font-medium text-header-link hover:text-white">Home</Link>
          <Link href="/songs" className="block px-3 py-2 text-base font-medium text-header-link hover:text-white">Song Directory</Link>
          <Link href="/sheet-builder" className="block px-3 py-2 text-base font-medium text-header-link hover:text-white">
            Sheet Builder <span className="ml-2 rounded-sm bg-yellow-400 p-1 text-xs font-bold uppercase leading-none text-gray-900">new</span>
          </Link>
          <Link href="/contact" className="block px-3 py-2 text-base font-medium text-header-link hover:text-white">Contact</Link>
        </div>
      </div>
    </header>
  );
}
