import { NextRequest, NextResponse } from 'next/server';
import {getPromoStatus} from "@/lib/status";

export async function POST(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hub.zone01normandie.org';
    const response = await fetch(`${base}/api/timeline_project`, {
      method: 'GET'
    });

    if (response.ok) {
      const status = await getPromoStatus();
      return NextResponse.json(
        { success: true, message: 'Data updated successfully', response: status },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: 'Error updating data' },
        { status: 500 }
      );
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error }), {
      status: 500
    });
  }
}
