import { NextResponse } from 'next/server';
import { loadPrintShopResult } from '@/lib/printShopSheet';

/**
 * Returns the print shops configured in the `PrintShops` tab of the Google
 * Sheet. Client components hydrate their sync lookup registry from this route
 * so print shops can be added or edited without a code change.
 *
 * `source` reports where the data came from, and `reason` explains any fallback
 * so a misconfigured or empty tab is diagnosable from this endpoint alone.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await loadPrintShopResult();
    return NextResponse.json(
      {
        shops: result.records,
        source: result.source,
        ...(result.reason ? { reason: result.reason } : {}),
        range: result.range,
        ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
      },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (error) {
    console.error('print shops route error', error);
    return NextResponse.json({ shops: [], source: 'error' }, { status: 200 });
  }
}
