import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Contact | Niggun Sheet',
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="contact-container">
        <div className="contact-card">
          <h1>Contact Us</h1>
          <p className="subtitle">
            Have a question, suggestion, or want to contribute?<br />
            We&apos;d love to hear from you!
          </p>

          <form
            action="https://formsubmit.co/yehudahyjacobs@gmail.com"
            method="POST"
          >
            <input type="hidden" name="_subject" value="New Contact Form Submission - Niggun Sheet" />
            <input type="hidden" name="_captcha" value="true" />
            <input type="hidden" name="_next" value="https://niggunsheet.com/contact?submitted=true" />

            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                name="name"
                required
                className="form-input"
                placeholder="Your name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                required
                className="form-input"
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <select name="subject" required className="form-select">
                <option value="">Select a subject...</option>
                <option value="suggestion">Song Suggestion</option>
                <option value="correction">Correction/Typo</option>
                <option value="feedback">General Feedback</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                name="message"
                required
                className="form-textarea"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            <button type="submit" className="form-submit">
              Send Message
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
