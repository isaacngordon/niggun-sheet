import Link from 'next/link';
import KumzitzSheetDownloadButton from '@/components/KumzitzSheetDownloadButton';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <div className="footer-section">
            <h2>Start Here</h2>
            <Link href="/songs">Song Directory</Link>
            <Link href="/sheet-builder">Sheet Builder</Link>
          </div>

          <div className="footer-section">
            <h2>Downloads</h2>
            <KumzitzSheetDownloadButton type="button" className="footer-link-button">
              Get Kumzitz Sheet
            </KumzitzSheetDownloadButton>
            <a
              href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Simcha Sheet
            </a>
          </div>
          
          <div className="footer-section">
                      <h2>Help</h2>
            <Link href="/contact">Contact Us</Link>
            <Link href="/tracking-disclosure">Cookie Info</Link>
            <p className="footer-helper-text">
                        Use the privacy button at any time to change cookie settings.
            </p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Yehudah Jacobs - The Kumzitz Sheet
          </p>
          <p className="footer-tagline">
            Search, build, and project the right kumzitz
          </p>
        </div>
      </div>
    </footer>
  );
}
