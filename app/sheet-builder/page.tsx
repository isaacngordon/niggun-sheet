'use client';

import { useEffect } from 'react';
import SheetBuilderApp from '../sheet-builder-v2/SheetBuilderApp';

export default function SheetBuilderPage() {
  useEffect(() => {
    document.title = 'Sheet Builder | Niggun Sheet';
  }, []);

  return <SheetBuilderApp />;
}
