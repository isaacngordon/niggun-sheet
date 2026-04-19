import { Metadata } from 'next';
import SheetBuilderApp from '../sheet-builder-v2/SheetBuilderApp';

export const metadata: Metadata = {
  title: 'Sheet Builder | Niggun Sheet',
  description: 'Create custom kumzitz sheets with drag-and-drop sheet builder',
};

export default function SheetBuilderPage() {
  return <SheetBuilderApp />;
}
