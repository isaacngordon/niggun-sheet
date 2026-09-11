import { NextResponse } from 'next/server';
import { getPrintShopBySlug } from '@/lib/printShop';
import { getPrintShopDeliveryBySlug, isPrintShopDeliveryConfigured } from '@/lib/printShopDelivery';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const shopSlug = getString(formData, 'shopSlug');
    const customerName = getString(formData, 'customerName');
    const customerEmail = getString(formData, 'customerEmail');
    const customerPhone = getString(formData, 'customerPhone');
    const notes = getString(formData, 'notes');
    const sourcePage = getString(formData, 'sourcePage');
    const jobType = getString(formData, 'jobType');
    const layoutMode = getString(formData, 'layoutMode');
    const layoutLabel = getString(formData, 'layoutLabel');
    const showTitles = getString(formData, 'showTitles');
    const setList = getString(formData, 'setList');
    const pdf = formData.get('pdf');

    if (!shopSlug || !customerName || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (!(pdf instanceof File) || pdf.size === 0) {
      return NextResponse.json({ error: 'A generated PDF is required.' }, { status: 400 });
    }

    const shop = getPrintShopBySlug(shopSlug);
    if (!shop) {
      return NextResponse.json({ error: 'Unknown print shop.' }, { status: 404 });
    }

    const delivery = getPrintShopDeliveryBySlug(shopSlug);
    if (!isPrintShopDeliveryConfigured(delivery)) {
      return NextResponse.json({ error: 'This print shop is not configured yet.' }, { status: 503 });
    }

    const outbound = new FormData();
    outbound.set('shopSlug', shop.slug);
    outbound.set('shopName', shop.name);
    outbound.set('customerName', customerName);
    outbound.set('customerEmail', customerEmail);
    outbound.set('customerPhone', customerPhone);
    outbound.set('notes', notes);
    outbound.set('sourcePage', sourcePage);
    outbound.set('jobType', jobType);
    outbound.set('layoutMode', layoutMode);
    outbound.set('layoutLabel', layoutLabel);
    outbound.set('showTitles', showTitles);
    outbound.set('setList', setList);
    outbound.set('submittedAt', new Date().toISOString());
    outbound.set('pdf', pdf, pdf.name || 'niggun-sheet.pdf');

    let response: Response;
    if (delivery.mode === 'webhook') {
      response = await fetch(delivery.submissionUrl, {
        method: 'POST',
        body: outbound,
        cache: 'no-store',
      });
    } else {
      const subjectParts = [jobType || 'Print job'];
      if (layoutLabel) {
        subjectParts.push(layoutLabel);
      } else if (layoutMode) {
        subjectParts.push(layoutMode);
      }

      outbound.set('_subject', `${subjectParts.join(' - ')} for ${shop.name}`);
      outbound.set('_captcha', 'false');
      outbound.set('_template', 'table');
      outbound.set('_replyto', customerEmail);
      if (delivery.cc?.length) {
        outbound.set('_cc', delivery.cc.join(','));
      }

      response = await fetch(`https://formsubmit.co/${encodeURIComponent(delivery.recipient)}`, {
        method: 'POST',
        body: outbound,
        cache: 'no-store',
      });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `The print shop rejected the order (${response.status}).` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, message: shop.successMessage });
  } catch (error) {
    console.error('print shop order error', error);
    return NextResponse.json({ error: 'Unable to send the print job right now.' }, { status: 500 });
  }
}