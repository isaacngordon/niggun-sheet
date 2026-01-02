'use client';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function TrackingDisclosurePage() {
  return (
    <>
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          background-color: white;
          color: #333;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        h1 {
          color: #0d0d0d;
          margin-bottom: 20px;
        }

        p {
          line-height: 1.6;
          margin-bottom: 15px;
        }
      `}</style>

      <Header />

      <div className="container">
        <h1>Tracking Disclosure</h1>
        <p>
          This website uses Google Analytics to collect anonymous usage data to help us improve the user experience.
        </p>
        <p>
          No personally identifiable information is collected without your explicit consent.
        </p>
      </div>

      <Footer />
    </>
  );
}
