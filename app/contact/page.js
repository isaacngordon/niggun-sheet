'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    honeypot: ''
  });
  const [submitStatus, setSubmitStatus] = useState({ show: false, type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Honeypot check
    if (formData.honeypot) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ show: false, type: '', message: '' });

    try {
      const response = await fetch('https://formspree.io/f/xnnqbovj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      if (response.ok) {
        setSubmitStatus({
          show: true,
          type: 'success',
          message: 'Thank you! Your message has been sent successfully. We\'ll get back to you soon.'
        });
        setFormData({ name: '', email: '', subject: '', message: '', honeypot: '' });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      setSubmitStatus({
        show: true,
        type: 'error',
        message: 'Oops! Something went wrong. Please try again or email us directly.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        #contact-content {
          flex: 1;
          max-width: 600px;
          margin: 40px auto;
          padding: 30px;
          background: #fff;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
          border-radius: 10px;
          text-align: center;
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          color: #333;
        }

        .subtitle {
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 30px;
          color: #555;
        }

        #contact-form {
          text-align: left;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          color: #333;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
          background: #fff;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #f2cb05;
          box-shadow: 0 0 0 3px rgba(242, 203, 5, 0.2);
        }

        .form-group textarea {
          height: 150px;
          resize: vertical;
        }

        .submit-btn {
          width: 100%;
          background-color: #f2cb05;
          color: #000;
          padding: 14px;
          border: none;
          border-radius: 6px;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .submit-btn:hover:not(:disabled) {
          background-color: #d4a904;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          padding: 15px;
          margin-top: 20px;
          border-radius: 6px;
          display: none;
        }

        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .message.show {
          display: block;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .direct-contact {
          margin-top: 30px;
          padding-top: 25px;
          border-top: 1px solid #eee;
        }

        .direct-contact p {
          font-size: 0.95rem;
          color: #666;
          margin: 0;
        }

        .direct-contact a {
          color: #d4a904;
          text-decoration: none;
          font-weight: 600;
        }

        .direct-contact a:hover {
          text-decoration: underline;
        }

        .hp-field {
          position: absolute;
          left: -9999px;
        }
      `}</style>

      <div style={{
        backgroundImage: 'url(/assets/background_small.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Header />

        <div id="contact-content">
        <h1>Get In Touch</h1>
        <p className="subtitle">
          Have a question, suggestion, or just want to say hi? <br />
          We'd love to hear from you!
        </p>

        <form id="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Your Name *</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Your Email *</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject *</label>
            <select 
              id="subject" 
              name="subject" 
              required
              value={formData.subject}
              onChange={handleChange}
            >
              <option value="">-- Please choose --</option>
              <option value="feature-request">Feature Request</option>
              <option value="bug-report">Bug Report</option>
              <option value="song-suggestion">Song Suggestion</option>
              <option value="general-inquiry">General Inquiry</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="message">Message *</label>
            <textarea 
              id="message" 
              name="message" 
              required 
              placeholder="Your message here..."
              value={formData.message}
              onChange={handleChange}
            ></textarea>
          </div>

          <input 
            type="text" 
            name="honeypot" 
            className="hp-field" 
            tabIndex="-1"
            value={formData.honeypot}
            onChange={handleChange}
          />

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>

          {submitStatus.show && (
            <div className={`message ${submitStatus.type} show`}>
              {submitStatus.message}
            </div>
          )}
        </form>

        <div className="direct-contact">
          <p>
            Or email us directly at:{' '}
            <a href="mailto:yehudahjacobswork@gmail.com">yehudahjacobswork@gmail.com</a>
          </p>
        </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
