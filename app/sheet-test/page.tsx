import type { Metadata } from 'next';
import SheetTestApp from './SheetTestApp';

export const metadata: Metadata = {
  title: 'Sheet Generator Test',
  description: 'Auto-generate kumzits sheets as downloadable JPG images',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SheetTestPage() {
  return <SheetTestApp />;
}
