import Image from "next/image";
import Link from "next/link";
import { SearchInput, CornerBanner } from "./InteractiveComponents";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <header className="bg-gray-900 sticky top-0 z-50">
        <div className="relative z-50 flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link href="/" className="mr-8">
              <Image src="/assets/Niggun_Sheet_Header_Logo.png" alt="Niggun Sheet" width={40} height={40} />
            </Link>
          </div>
          <div className="flex lg:hidden ml-auto">
            <button type="button" className="block text-white" id="mobile-menu-button">
              <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="bars" className="svg-inline--fa fa-bars" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="24" height="24">
                <path fill="currentColor" d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"></path>
              </svg>
            </button>
          </div>
          <div className="hidden lg:flex lg:items-center lg:flex-1 lg:justify-center">
            <ul className="flex h-full items-center gap-8">
              <Link href="/" className="flex items-center px-3 py-3 text-base font-normal text-header-link hover:text-white whitespace-nowrap">Home</Link>
              <Link href="/songs.html" className="flex items-center px-3 py-3 text-base font-normal text-header-link hover:text-white whitespace-nowrap">Song Directory</Link>
              <Link href="/sheet-builder.html" className="flex items-center px-3 py-3 text-base font-normal text-header-link hover:text-white whitespace-nowrap">Sheet Builder
                <span className="ml-2.5 rounded-sm bg-yellow-400 p-1 text-xs font-bold uppercase leading-none text-gray-900">new</span>
              </Link>
              <Link href="/contact.html" className="flex items-center px-3 py-3 text-base font-normal text-header-link hover:text-white whitespace-nowrap">Contact</Link>
            </ul>
          </div>
          <div className="flex h-full min-h-8 shrink-0 items-center justify-end">
            <button type="button" className="flex justify-center items-center font-bold rounded-full transition-colors bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-1.5 px-5 text-sm">
              <span className="relative flex min-h-5 items-center justify-center">
                <span className="whitespace-nowrap">Download Sheet</span>
              </span>
            </button>
          </div>
        </div>
        <div id="mobile-menu" className="hidden lg:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            <Link href="/" className="block px-3 py-2 text-base font-medium text-header-link hover:text-white">Home</Link>
            <Link href="/songs.html" className="block px-3 py-2 text-base font-medium text-header-link hover:text-white">Song Directory</Link>
            <Link href="/sheet-builder.html" className="block px-3 py-2 text-base font-medium text-header-link hover:text-white">Sheet Builder <span className="ml-2 rounded-sm bg-yellow-400 p-1 text-xs font-bold uppercase leading-none text-gray-900">new</span></Link>
            <Link href="/contact.html" className="block px-3 py-2 text-base font-medium text-header-link hover:text-white">Contact</Link>
          </div>
        </div>
      </header>
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <section className="hero-section">
          <div className="container">
            <div className="hero-content">
              <h1 className="hero-title">Discover Your Perfect Niggun</h1>
              <p className="hero-description">
                Goodbye Copy and Paste, Hello Drag and Drop <br />
                the next generation of Kumzits Sheets has arrived
              </p>
              <div className="hero-search">
                <SearchInput />
              </div>
              <div className="hero-buttons">
                <Link href="https://drive.google.com/file/d/1X_aY7tb7E9RxKVyXDYkGAC_wMGznGJe6/view?usp=drive_link" target="_blank" className="hero-button primary-button">Download Niggun Sheet</Link>
                <Link href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link" target="_blank" className="hero-button secondary-button">Download Simcha Sheet</Link>
              </div>
            </div>
          </div>
        </section>
        <section className="subhero-section">
          <div className="container">
            <div className="subhero-content">
              <h2 className="subhero-title">Create Your Own Sheet</h2>
              <p className="subhero-description">
                This is where you can save hours of time looking for the songs you need<br />just drag and drop and you're good to go
              </p>
              <Link href="/sheet-builder.html" className="hero-button primary-button">Try Sheet Builder</Link>
            </div>
          </div>
        </section>
        <CornerBanner />
      </main>
      <footer id="footer">
        <Link href="https://drive.google.com/file/d/1X_aY7tb7E9RxKVyXDYkGAC_wMGznGJe6/view?usp=drive_link" target="_blank">Download Niggun Sheet</Link>
        <Link href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link" target="_blank">Download Simcha Sheet</Link>
        <div className="footer-copyright">© 2025 Yehudah Jacobs - The Niggun Sheet</div>
      </footer>
    </div>
  );
}
