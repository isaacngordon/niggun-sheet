import type { Metadata } from 'next';
import SheetBuilderRoute from './SheetBuilderRoute';

export const metadata: Metadata = {
  title: 'Sheet Builder',
  description: 'Build printable kumzitz sheets with drag-and-drop layout and auto-fit pagination.',
};

export default function SheetBuilderPage() {
  return <SheetBuilderRoute />;
}
