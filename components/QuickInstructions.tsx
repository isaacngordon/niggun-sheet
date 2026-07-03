interface QuickInstructionsProps {
  title: string;
  steps: string[];
  note?: string;
  eyebrow?: string;
  tone?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
  onDismiss?: () => void;
}

export default function QuickInstructions({
  title,
  steps,
  note,
  eyebrow = 'Quick start',
  tone = 'light',
  compact = false,
  className,
  onDismiss,
}: QuickInstructionsProps) {
  const classes = [
    'ux-guide',
    tone === 'dark' ? 'ux-guide-dark' : '',
    compact ? 'ux-guide-compact' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} aria-label={`${title} instructions`}>
      <div className="ux-guide-header">
        <div>
          <span className="ux-guide-eyebrow">{eyebrow}</span>
          <h2 className="ux-guide-title">{title}</h2>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss quick instructions"
            style={{
              marginLeft: 'auto',
              border: 0,
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: '2px 4px',
              opacity: 0.7,
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      <ol className="ux-guide-list">
        {steps.map((step, index) => (
          <li key={`${title}-${index}`} className="ux-guide-step">
            <span className="ux-guide-step-number" aria-hidden="true">{index + 1}</span>
            <span className="ux-guide-step-copy">{step}</span>
          </li>
        ))}
      </ol>
      {note ? <p className="ux-guide-note">{note}</p> : null}
    </section>
  );
}