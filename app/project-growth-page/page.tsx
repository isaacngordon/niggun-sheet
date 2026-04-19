import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Growing Our Project | Niggun Sheet',
};

export default function ProjectGrowthPage() {
  return (
    <>
      <Header />
      <div
        style={{
          backgroundColor: '#0d0d0d',
          color: 'white',
          textAlign: 'center',
          padding: '80px 20px',
          position: 'relative',
        }}
      >
        <h1 style={{ fontSize: '2.5rem', marginBottom: 20 }}>Growing Our Project</h1>
        <div
          style={{
            backgroundColor: 'rgb(255, 218, 42)',
            height: 5,
            width: 100,
            margin: '0 auto 30px',
          }}
        />
        <p>Bringing back the kumzitz</p>
      </div>

      <div
        style={{
          maxWidth: 800,
          margin: '40px auto',
          padding: 20,
          backgroundColor: 'white',
          borderRadius: 4,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        }}
      >
        <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#333', marginBottom: 30 }}>
          There are many lyrics and streaming websites out there. What sets this one apart from the
          rest is that it aims to be neither—simply to preserve the history of Jewish music and give
          it a place in the future. Every song in the list was added for a purpose. Most of them
          would have been at home in a yeshiva gym with the lights turned off and everyone in a
          circle singing. I find that these beautiful songs are slowly fading away, to be replaced
          with songs ever more strongly influenced by the outside world. My goal is to keep them
          where they belong.
          <br />
          <br />
          This website has three functions: The first is a run-of-the-mill lyrics website. Click on
          any song to see its author, name, and lyrics along with recordings to match. These were
          sung for us by the amazing ----------.
          <br />
          <br />
          The second is the Smartboard Mode, activated by the switch on the right side of the song
          directory. This lets rebbeim, teachers, or anyone with a screen bring up the lyrics
          on-screen with nothing else but a play button to hear the example, and + and − buttons to
          adjust the size of the words on-screen.
          <br />
          The final function is the Sheet Builder. Anywhere you see a song, there will be a button
          that reads &ldquo;Add to Sheet.&rdquo; Click that and they will be saved on the sheet. The
          Sheet Builder page has a unique ability to auto-adjust to the songs and to finally print at
          the touch of a button—perfect for remembering those songs you wanted to sing at the sheva
          brachos, running a kumzitz at a bar mitzvah, or bringing along as a singer to know and
          remember your set list as more than just song names.
          <br />
          This project didn&apos;t come along by itself. It took me and my friend Tzachi, who has a
          lot of experience coding. I&apos;ve been working on this on and off for the last few
          years. I&apos;ve finally made some breakthroughs and am near the end where this will be a
          complete and well-rounded experience.
        </p>

        <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#333', marginBottom: 30 }}>
          If you have anything to contribute, be it programming skills, feature suggestions or
          funding, drop us a line with the button below.
          <br />
          Thank you for your support
        </p>

        <a
          href="/contact"
          style={{
            display: 'inline-block',
            backgroundColor: '#0d0d0d',
            color: 'rgb(255, 218, 42)',
            fontWeight: 'bold',
            padding: '12px 30px',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          Contact Us
        </a>
      </div>

      <div
        style={{
          backgroundColor: '#0d0d0d',
          color: '#ffffff',
          padding: 10,
          textAlign: 'center',
        }}
      >
        <a
          href="https://drive.google.com/file/d/1X_aY7tb7E9RxKVyXDYkGAC_wMGznGJe6/view?usp=drive_link"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgb(255, 218, 42)', margin: '0 10px', textDecoration: 'none' }}
        >
          Download Niggun Sheet
        </a>
        <a
          href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgb(255, 218, 42)', margin: '0 10px', textDecoration: 'none' }}
        >
          Download Simcha Sheet
        </a>
      </div>

      <Footer />
    </>
  );
}
