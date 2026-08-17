'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CiscoAccordion() {
  const [activeIndex, setActiveIndex] = useState(0);

  const items = [
    {
      title: "Interactive Smartboard Mode",
      desc: "Instantly convert any song into a layout ready to project onto screens in classrooms or kumzitz settings.",
      img: "/assets/Image%201.png"
    },
    {
      title: "Curated List of Classic & Modern Songs",
      desc: "Browse a constantly growing repository of Jewish music, complete with lyrics, chords, and source tags.",
      img: "/assets/image%202.png"
    },
    {
      title: "Drag-&-Drop Sheet Builder",
      desc: "Drag, drop, and auto-fit your setlist onto printable pages with complex pagination features instantly.",
      img: "/assets/Image%203.png"
    },
    {
      title: "Printable Shabbos Bencher",
      desc: "Select what elements of benching to include, and dynamically render a PDF bencher ready to print.",
      img: "/assets/image%204.png"
    }
  ];

  return (
    <section style={{ padding: '5rem 2rem', backgroundColor: '#000', color: '#fff', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '4rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left side: Accordion */}
        <div style={{ flex: '1 1 400px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 600, marginBottom: '3rem', lineHeight: 1.1 }}>
            These are tools to drive your kumzits
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => setActiveIndex(idx)}
                style={{ 
                  borderBottom: '1px solid rgba(255,255,255,0.1)', 
                  padding: '1.5rem 0',
                  cursor: 'pointer',
                  borderLeft: activeIndex === idx ? '3px solid #f2cb05' : '3px solid transparent',
                  paddingLeft: '1.5rem',
                  marginLeft: '-1.5rem',
                  transition: 'all 0.2s ease'
                }}>
                <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: activeIndex === idx ? 600 : 400, color: activeIndex === idx ? '#fff' : '#e0e0e0' }}>
                  {item.title}
                </h3>
                <div style={{ 
                  height: activeIndex === idx ? 'auto' : 0, 
                  overflow: 'hidden', 
                  opacity: activeIndex === idx ? 1 : 0,
                  marginTop: activeIndex === idx ? '1rem' : 0,
                  transition: 'all 0.3s ease'
                }}>
                  <p style={{ color: '#aaa', lineHeight: 1.6, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '3rem' }}>
            <Link href="/sheet-builder-v2" style={{ 
              display: 'inline-block', 
              padding: '0.75rem 2rem', 
              borderRadius: '30px', 
              backgroundColor: '#1a1a1a', 
              color: '#fff', 
              textDecoration: 'none', 
              fontWeight: 'bold',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              Drag and drop sheet building
            </Link>
          </div>
        </div>

        {/* Right side: Image Display */}
        <div style={{ flex: '1 1 600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <img 
             src={items[activeIndex].img} 
             alt={items[activeIndex].title} 
             style={{ width: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', transition: 'opacity 0.3s ease' }} 
           />
        </div>

      </div>
    </section>
  );
}
