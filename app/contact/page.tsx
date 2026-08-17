import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ContactForm } from '@/components/ContactForm';
import { ContactFormBackground } from '@/components/ContactFormBackground';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Send lyrics fixes, song ideas, bug reports, or questions.',
  openGraph: {
    title: 'Contact Us | Niggun Sheet',
    description: 'Send lyrics fixes, song ideas, bug reports, or questions.',
    type: 'website',
  },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="contact-container">
        <div className="contact-card">
          <ContactFormBackground />
          <div className="contact-header">
            <h1>Contact Us</h1>
            <p className="subtitle">
              Need help, found a problem, or want to share a song?<br />
              Send us a message here.
            </p>
          </div>

          <ContactForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
