'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getPrintShopBySlug, type PrintShopConfig } from '@/lib/printShop';
import { resolvePrintShopSlug } from '@/lib/printShopMode';
import { usePrintShops } from '@/hooks/usePrintShops';

export interface PrintShopModeState {
  slug: string;
  shop: PrintShopConfig | null;
  /** True when a print shop is active for the current page. */
  active: boolean;
}

/**
 * Resolves the active print shop for the current page, honouring print shop
 * persistence so the shop stays active while the visitor browses the site.
 */
export function usePrintShopMode(): PrintShopModeState {
  const pathname = usePathname();
  const printShopsRevision = usePrintShops();
  const [slug, setSlug] = useState('');

  useEffect(() => {
    setSlug(resolvePrintShopSlug(window.location.search) ?? '');
  }, [pathname]);

  const shop = useMemo(() => getPrintShopBySlug(slug), [slug, printShopsRevision]);

  return { slug, shop, active: Boolean(shop) };
}
