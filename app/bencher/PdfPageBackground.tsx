'use client';

import { useEffect, useRef, useState } from 'react';

const PDFJS_URL = 'https://unpkg.com/pdfjs-dist@5.4.296/legacy/build/pdf.min.mjs';
const WORKER_URL = 'https://unpkg.com/pdfjs-dist@5.4.296/legacy/build/pdf.worker.min.mjs';

interface PdfPageBackgroundProps {
  file: string;
  pageNumber: number;
  width: number;
}

export default function PdfPageBackground({ file, pageNumber, width }: PdfPageBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    import(/* webpackIgnore: true */ PDFJS_URL)
      .then(async (pdfjs) => {
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;

        try {
          const doc = await pdfjs.getDocument(file).promise;
          if (cancelled) { doc.destroy(); return; }
          const page = await doc.getPage(pageNumber);
          if (cancelled) { page.cleanup(); doc.destroy(); return; }
          const viewport = page.getViewport({ scale: 1 });
          const scale = width / viewport.width;
          const scaledViewport = page.getViewport({ scale });
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;
          await page.render({
            canvasContext: canvas.getContext('2d')!,
            viewport: scaledViewport,
          }).promise;
          page.cleanup();
          doc.destroy();
          if (!cancelled) setReady(true);
        } catch (err) {
          if (!cancelled) setError('PDF failed to load');
        }
      })
      .catch(() => {
        if (!cancelled) setError('PDF failed to load');
      });

    return () => { cancelled = true; };
  }, [file, pageNumber, width]);

  if (error) {
    return <div className="bencher-page-art bencher-pdf-error" />;
  }

  return <canvas ref={canvasRef} className="bencher-page-art" />;
}
