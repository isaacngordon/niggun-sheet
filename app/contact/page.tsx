import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ContactForm } from '@/components/ContactForm';
import { ContactFormBackground } from '@/components/ContactFormBackground';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get in Touch | Niggun Sheet',
  description: 'Help us build the perfect niggun library for rebbeim and communities. Share feedback, suggest songs, or report issues.',
  openGraph: {
    title: 'Get in Touch | Niggun Sheet',
    description: 'Help us build the perfect niggun library for rebbeim and communities.',
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
            <h1>Get in Touch 🎵</h1>
            <p className="subtitle">
              Help us build the perfect niggun library for rebbeim and communities.<br />
              Share lyrics, suggest songs, report issues, or just say hello!
            </p>
          </div>

          <ContactForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
