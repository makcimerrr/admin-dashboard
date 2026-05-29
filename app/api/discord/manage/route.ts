import { NextRequest, NextResponse } from 'next/server';
import {
  getStudentsDiscordStatus,
  getOrphanDiscordMappings,
  upsertDiscordUser,
  renameDiscordMappingLogin,
  deleteDiscordUser,
} from '@/lib/db/services/discordUsers';

/**
 * Admin-facing Discord link management. Called from /students/discord (which
 * lives behind the admin-only middleware guard). Distinct from
 * /api/discord/users which is the bot-facing, secret-protected upsert.
 */

export async function GET(request: NextRequest) {
  try {
    const promo = request.nextUrl.searchParams.get('promo');
    const [students, orphans] = await Promise.all([
      getStudentsDiscordStatus(promo && promo !== 'all' ? promo : undefined),
      getOrphanDiscordMappings(),
    ]);
    return NextResponse.json({ success: true, students, orphans });
  } catch (error) {
    console.error('GET /api/discord/manage error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des liaisons Discord.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const op = body?.op as string | undefined;

    if (op === 'setDiscordId') {
      const login = String(body.login ?? '').trim();
      const discordId = String(body.discordId ?? '').trim();
      if (!login || !discordId) {
        return NextResponse.json(
          { success: false, error: 'login et discordId sont requis.' },
          { status: 400 },
        );
      }
      // Discord IDs are 17–20 digit snowflakes.
      if (!/^\d{17,20}$/.test(discordId)) {
        return NextResponse.json(
          { success: false, error: "L'ID Discord doit être un identifiant numérique (17 à 20 chiffres)." },
          { status: 400 },
        );
      }
      await upsertDiscordUser(login, discordId);
      return NextResponse.json({ success: true });
    }

    if (op === 'renameLogin') {
      const oldLogin = String(body.oldLogin ?? '').trim();
      const newLogin = String(body.newLogin ?? '').trim();
      if (!oldLogin || !newLogin) {
        return NextResponse.json(
          { success: false, error: 'oldLogin et newLogin sont requis.' },
          { status: 400 },
        );
      }
      const ok = await renameDiscordMappingLogin(oldLogin, newLogin);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: `Le login "${newLogin}" est déjà associé à une autre liaison.` },
          { status: 400 },
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Opération inconnue.' },
      { status: 400 },
    );
  } catch (error) {
    console.error('PATCH /api/discord/manage error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de la liaison Discord.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const login = String(body?.login ?? '').trim();
    if (!login) {
      return NextResponse.json(
        { success: false, error: 'login requis.' },
        { status: 400 },
      );
    }
    await deleteDiscordUser(login);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/discord/manage error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de la liaison Discord.' },
      { status: 500 },
    );
  }
}
