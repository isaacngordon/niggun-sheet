import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sheet Builder',
  description: 'Create custom kumzitz sheets with drag-and-drop sheet builder',
};

export default function SheetBuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
