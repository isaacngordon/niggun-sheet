'use client';

import dynamic from 'next/dynamic';
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

const KumzitzSheetDownloadModal = dynamic(() => import('@/components/KumzitzSheetDownloadModal'), {
  ssr: false,
});

type KumzitzSheetDownloadButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
};

export default function KumzitzSheetDownloadButton({ children, onClick, type = 'button', ...buttonProps }: KumzitzSheetDownloadButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        {...buttonProps}
        type={type}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            setOpen(true);
          }
        }}
      >
        {children}
      </button>
      {open ? <KumzitzSheetDownloadModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}