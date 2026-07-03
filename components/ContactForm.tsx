'use client';

import { useTransition, useState, useRef } from 'react';
import { motion, Transition, Variants } from 'framer-motion';
import { submitContact } from '@/app/actions/contact';

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await submitContact(formData);
        setShowSuccess(true);
        // Reset form
        formRef.current?.reset();
        // Hide success message after 4 seconds
        setTimeout(() => setShowSuccess(false), 4000);
      } catch (error) {
        console.error('Submission error:', error);
        alert('Your message did not send. Please try again.');
      }
    });
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 15 } as Transition,
    },
  };

  const successVariants: Variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
      },
    },
    exit: {
      scale: 0,
      opacity: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.form
      ref={formRef}
      action={handleSubmit}
      className="contact-form"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Floating particles */}
      <FloatingParticles />

      {/* Form fields */}
      <motion.div className="form-group" variants={itemVariants}>
        <label className="form-label" htmlFor="contact-name">Your name or school</label>
        <motion.input
          id="contact-name"
          type="text"
          name="name"
          required
          className="form-input"
          placeholder="Rabbi David / Ohr Sameach"
          disabled={isPending}
          whileHover={{ scale: 1.02 }}
          whileFocus={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
      </motion.div>

      <motion.div className="form-group" variants={itemVariants}>
        <label className="form-label" htmlFor="contact-email">Email</label>
        <motion.input
          id="contact-email"
          type="email"
          name="email"
          required
          className="form-input"
          placeholder="your@email.com"
          disabled={isPending}
          whileHover={{ scale: 1.02 }}
          whileFocus={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
      </motion.div>

      <motion.div className="form-group" variants={itemVariants}>
        <label className="form-label" htmlFor="contact-subject">What do you need?</label>
        <motion.select
          id="contact-subject"
          name="subject"
          required
          className="form-select"
          disabled={isPending}
          whileHover={{ scale: 1.02 }}
          whileFocus={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <option value="">Pick one...</option>
          <option value="lyrics">Add or fix lyrics</option>
          <option value="song-suggestion">Suggest a song</option>
          <option value="ytlink">YouTube link problem</option>
          <option value="feature-request">Idea for the site</option>
          <option value="bug">Bug or problem</option>
          <option value="community">School or community idea</option>
          <option value="other">Something else</option>
        </motion.select>
      </motion.div>

      <motion.div className="form-group" variants={itemVariants}>
        <label className="form-label" htmlFor="contact-message">Message</label>
        <motion.textarea
          id="contact-message"
          name="message"
          required
          className="form-textarea"
          placeholder="Tell us what happened..."
          disabled={isPending}
          whileHover={{ scale: 1.02 }}
          whileFocus={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <AnimatedSubmitButton isPending={isPending} showSuccess={showSuccess} />
      </motion.div>

      {/* Loading state */}
      {isPending && (
        <motion.div
          className="form-loading-indicator"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <motion.span
            className="spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          Sending your message...
        </motion.div>
      )}

      {/* Success state */}
      {showSuccess && (
        <motion.div
          className="form-success-indicator"
          role="status"
          aria-live="polite"
          variants={successVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.span
            className="success-icon"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }}
          >
            ✓
          </motion.span>
          Your message was sent. Thank you.
        </motion.div>
      )}
    </motion.form>
  );
}

function AnimatedSubmitButton({ isPending, showSuccess }: { isPending: boolean; showSuccess: boolean }) {
  return (
    <motion.button
      type="submit"
      className={`form-submit ${isPending ? 'is-loading' : ''}`}
      disabled={isPending || showSuccess}
      whileHover={!isPending && !showSuccess ? { scale: 1.05 } : {}}
      whileTap={!isPending && !showSuccess ? { scale: 0.95 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.span className="button-text">
        {showSuccess ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className="sending-icon">✓</span> Sent!
          </motion.span>
        ) : isPending ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <motion.span
              className="sending-icon inline-block"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              ⟳
            </motion.span>
            Sending...
          </motion.span>
        ) : (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            Send message
          </motion.span>
        )}
      </motion.span>
    </motion.button>
  );
}

function FloatingParticles() {
  const particles = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="particles-container" aria-hidden="true">
      {particles.map((i) => (
        <motion.div
          key={i}
          className="particle"
          animate={{
            y: [-200, -800],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeOut',
            delay: i * 0.3,
          }}
          style={{
            left: `${15 + i * 15}%`,
          }}
        />
      ))}
    </div>
  );
}
