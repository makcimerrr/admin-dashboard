import { NextRequest, NextResponse } from 'next/server';
import { upsertDiscordUser } from '@/lib/db/services/discordUsers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, discordId, secret } = body;

    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (!login || !discordId) {
      return NextResponse.json({ error: 'login et discordId sont requis' }, { status: 400 });
    }

    await upsertDiscordUser(String(login), String(discordId));

    return NextResponse.json({ success: true, login, discordId });
  } catch (error) {
    console.error('POST /api/discord/users error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
