'use client';

// Hebrew cover/song text and ornaments are now rendered server-side as vector
// PDF content (see app/api/bencher/overlayHtml.ts + renderOverlay.ts) instead
// of being pre-rasterized to PNG here.

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
