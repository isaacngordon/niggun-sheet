'use client';

export default function Footer() {
  const handleAsteroidsClick = (e) => {
    e.preventDefault();
    if (window.asteroids) {
      window.asteroids();
    }
  };

  return (
    <div id="footer" style={{ backgroundColor: '#050505', padding: '2rem 0', textAlign: 'center' }}>
      <a href="https://drive.google.com/file/d/1X_aY7tb7E9RxKVyXDYkGAC_wMGznGJe6/view?usp=drive_link" target="_blank" rel="noopener noreferrer" style={{ color: '#a0a0a0', textDecoration: 'none', margin: '0 1rem', transition: 'color 0.2s' }}>
        Download Niggun Sheet
      </a>
      <a href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link" target="_blank" rel="noopener noreferrer" style={{ color: '#a0a0a0', textDecoration: 'none', margin: '0 1rem', transition: 'color 0.2s' }}>
        Download Simcha Sheet
      </a>
      <div className="footer-copyright" style={{ marginTop: '1.5rem', color: '#a0a0a0', fontSize: '0.875rem' }}>
        © 2025 Yehudah Jacobs - The Niggun Sheet
      </div>
      <a 
        href="#" 
        onClick={handleAsteroidsClick} 
        style={{ opacity: 0.2, fontSize: '10px', marginLeft: '10px' }}
        title="Shoot the page!"
      >
        🎮
      </a>
    </div>
  );
}
