import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Tracking Disclosure',
  description: 'How Niggun Sheet uses privacy-conscious analytics to count site visits.',
  alternates: {
    canonical: '/tracking-disclosure',
  },
};

export default function TrackingDisclosurePage() {
  return (
    <>
      <Header />
      <main className="policy-page">
        <section className="policy-card">
          <h1>Tracking Disclosure</h1>
          <p>
            Niggun Sheet uses analytics only to understand basic site usage, such as page visits and
            feature engagement. This helps improve the site for rebbeim, communities, and anyone
            building or projecting niggun sheets.
          </p>
          <p>
            Analytics are used as a count. No personal data is sold, shared, or used for advertising
            profiles. You can change your cookie preference at any time from the Privacy button on
            the site.
          </p>
          <h2>Your choices</h2>
          <ul>
            <li>Cookie mode allows privacy-conscious analytics cookies.</li>
            <li>Opt-out mode turns analytics cookies off.</li>
            <li>The preference is saved locally in your browser.</li>
          </ul>
          <h2>Contact</h2>
          <p>
            If you have questions about privacy or analytics, use the contact page to get in touch.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
