import { NextResponse } from 'next/server';
import { getPromoStatusForDisplay } from '@/lib/db/services/promoStatus';

export async function GET() {
  try {
    const promos = await getPromoStatusForDisplay();
    return NextResponse.json({ success: true, promos });
  } catch (error) {
    console.error("Erreur API promos :", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}