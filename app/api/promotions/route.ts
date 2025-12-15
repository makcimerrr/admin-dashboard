import { NextResponse } from 'next/server';
import promos from '../../../config/promoConfig.json';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      promotions: promos
    });
  } catch (err: any) {
    console.error('API ERROR:', err);

    return NextResponse.json(
      { success: false, error: 'Internal error', details: String(err) },
      { status: 500 }
    );
  }
}
