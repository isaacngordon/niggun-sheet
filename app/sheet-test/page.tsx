import type { Metadata } from 'next';
import SheetTestApp from './SheetTestApp';

export const metadata: Metadata = {
  title: 'Sheet Generator Test – Niggun Sheet',
  description: 'Auto-generate kumzits sheets as downloadable JPG images',
};

export default function SheetTestPage() {
  return <SheetTestApp />;
}
