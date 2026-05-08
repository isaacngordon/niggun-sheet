'use client';

import dynamic from 'next/dynamic';
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

const NiggunSheetDownloadModal = dynamic(() => import('@/components/NiggunSheetDownloadModal'), {
  ssr: false,
});

type NiggunSheetDownloadButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
};

export default function NiggunSheetDownloadButton({ children, onClick, type = 'button', ...buttonProps }: NiggunSheetDownloadButtonProps) {
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
      {open ? <NiggunSheetDownloadModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}