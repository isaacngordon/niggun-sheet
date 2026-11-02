'use client';

import { useEffect, useState } from 'react';
import { ensurePrintShopsLoaded } from '@/lib/printShop';

/**
 * Hydrates the print shop registry from the spreadsheet-backed API route.
 *
 * Returns a revision counter that increments once the spreadsheet data lands,
 * so callers can include it in `useMemo` deps and re-resolve print shops using
 * the same synchronous helpers they already use.
 */
export function usePrintShops(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;

    ensurePrintShopsLoaded().then(() => {
      if (active) {
        setRevision((current) => current + 1);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return revision;
}
