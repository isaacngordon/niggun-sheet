'use client';

import Link from 'next/link';
import { useNiggunSheetDownload } from '@/components/NiggunSheetDownload';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { download } = useNiggunSheetDownload();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <div className="footer-section">
            <h4>Downloads</h4>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); download(); }}
            >
              Niggun Sheet
            </a>
            <a
              href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Simcha Sheet
            </a>
          </div>
          
          <div className="footer-section">
            <h4>Navigation</h4>
            <Link href="/songs">Song Directory</Link>
            <Link href="/sheet-builder">Sheet Builder</Link>
            <Link href="/contact">Contact</Link>
          </div>
          
          <div className="footer-section">
            <h4>Legal</h4>
            <Link href="/contact">Contact Us</Link>
            <a href="/tracking-disclosure.html">Tracking Disclosure</a>
            <p className="footer-helper-text">
              Choose cookie-based or fallback analytics from the privacy control.
            </p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Yehudah Jacobs - The Niggun Sheet
          </p>
          <p className="footer-tagline">
            Discover Your Perfect Niggun
          </p>
        </div>
      </div>
    </footer>
  );
}
