'use client';

import { motion } from 'framer-motion';

export function ContactFormBackground() {
  const musicalNotes = ['♪', '♫', '♪', '♫', '♪'];
  const hebrewLetters = ['א', 'ד', 'ש', 'י', 'ר'];

  return (
    <div className="contact-background-decorations" aria-hidden="true">
      {/* Floating musical notes - left side */}
      <div className="musical-notes-left">
        {musicalNotes.map((note, i) => (
          <motion.div
            key={`note-left-${i}`}
            className="floating-note"
            animate={{
              y: [-100, 400],
              opacity: [0, 0.6, 0.6, 0],
              rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)],
            }}
            transition={{
              duration: 6 + i * 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
            style={{
              left: `${10 + i * 8}%`,
              top: '-50px',
            }}
          >
            {note}
          </motion.div>
        ))}
      </div>

      {/* Floating musical notes - right side */}
      <div className="musical-notes-right">
        {musicalNotes.map((note, i) => (
          <motion.div
            key={`note-right-${i}`}
            className="floating-note"
            animate={{
              y: [-100, 400],
              opacity: [0, 0.6, 0.6, 0],
              rotate: [0, -360 * (i % 2 === 0 ? 1 : -1)],
            }}
            transition={{
              duration: 6.5 + i * 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.6,
            }}
            style={{
              right: `${10 + i * 8}%`,
              top: '-50px',
            }}
          >
            {note}
          </motion.div>
        ))}
      </div>

      {/* Sheet music horizontal lines */}
      <div className="sheet-music-lines">
        {[0, 1, 2, 3, 4].map((line) => (
          <motion.div
            key={`line-${line}`}
            className="sheet-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.05, 0.1, 0.05] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: line * 0.2,
            }}
            style={{
              top: `${20 + line * 15}%`,
            }}
          />
        ))}
      </div>

      {/* Decorative Hebrew letters - subtle background */}
      <div className="hebrew-letters-background">
        {hebrewLetters.map((letter, i) => (
          <motion.div
            key={`hebrew-${i}`}
            className="hebrew-letter-bg"
            aria-hidden="true"
            animate={{
              opacity: [0.02, 0.08, 0.02],
              y: [-30, 30],
            }}
            transition={{
              duration: 8 + i * 1,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.4,
            }}
            style={{
              left: `${15 + i * 15}%`,
              top: '50%',
            }}
          >
            {letter}
          </motion.div>
        ))}
      </div>

      {/* Corner accent - Star of David pattern */}
      <svg
        className="corner-pattern top-left"
        viewBox="0 0 100 100"
        width="120"
        height="120"
        aria-hidden="true"
      >
        <defs>
          <pattern id="star-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="2" fill="rgba(234, 179, 8, 0.1)" />
            <line x1="20" y1="10" x2="20" y2="30" stroke="rgba(234, 179, 8, 0.05)" strokeWidth="0.5" />
            <line x1="10" y1="20" x2="30" y2="20" stroke="rgba(234, 179, 8, 0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#star-pattern)" />
      </svg>

      <svg
        className="corner-pattern bottom-right"
        viewBox="0 0 100 100"
        width="120"
        height="120"
        aria-hidden="true"
      >
        <defs>
          <pattern id="star-pattern-2" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="2" fill="rgba(234, 179, 8, 0.1)" />
            <line x1="20" y1="10" x2="20" y2="30" stroke="rgba(234, 179, 8, 0.05)" strokeWidth="0.5" />
            <line x1="10" y1="20" x2="30" y2="20" stroke="rgba(234, 179, 8, 0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#star-pattern-2)" />
      </svg>
    </div>
  );
}
