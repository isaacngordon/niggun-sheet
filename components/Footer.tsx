import Link from 'next/link';
import NiggunSheetDownloadButton from '@/components/NiggunSheetDownloadButton';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <div className="footer-section">
            <h4>Start Here</h4>
            <Link href="/songs">Song Directory</Link>
            <Link href="/sheet-builder">Sheet Builder</Link>
            <Link href="/bencher">Bencher</Link>
          </div>

          <div className="footer-section">
            <h4>Downloads</h4>
            <NiggunSheetDownloadButton type="button" className="footer-link-button">
              Get Niggun Sheet
            </NiggunSheetDownloadButton>
            <a
              href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Simcha Sheet
            </a>
          </div>
          
          <div className="footer-section">
                      <h4>Help</h4>
            <Link href="/contact">Contact Us</Link>
            <Link href="/tracking-disclosure">Cookie Info</Link>
            <p className="footer-helper-text">
                        Use the privacy button at any time to change cookie settings.
            </p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Yehudah Jacobs - The Niggun Sheet
          </p>
          <p className="footer-tagline">
            Search, build, and project the right niggun
          </p>
        </div>
      </div>
    </footer>
  );
}
