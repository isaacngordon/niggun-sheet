'use client';

import { useCallback, useState } from 'react';
import { rectToCss, type BencherPagePlacement } from './bencher-layout';

interface CoverTextInputProps {
  placement: BencherPagePlacement;
  onTextChange?: (text: string) => void;
}

export default function CoverTextInput({ placement, onTextChange }: CoverTextInputProps) {
  const [text, setText] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    onTextChange?.(value);
  }, [onTextChange]);

  return (
    <div className="bencher-cover-text" style={rectToCss(placement.rect)}>
      <textarea
        className="bencher-cover-text-input bencher-screen-only"
        value={text}
        onChange={handleChange}
        placeholder="Add text..."
        rows={4}
      />
      <div className="bencher-cover-text-print" aria-hidden="true">
        {text}
      </div>
    </div>
  );
}
