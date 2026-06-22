import { NextRequest } from 'next/server';
import { withAdmin } from '@/lib/api/with-auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { fetchGuildMembers } from '@/lib/services/discord';
import { matchMembersToStudents } from '@/lib/services/discord-match';
import { getStudentsDiscordStatus } from '@/lib/db/services/discordUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Suggestions de liaison Discord : lit les membres du serveur et les rapproche
 * des apprenants NON liés (login / prénom / nom). Lecture seule — la liaison
 * effective passe par PATCH /api/discord/manage (op setDiscordId). Admin only.
 */
export const GET = withAdmin(async (req: NextRequest) => {
  const promo = new URL(req.url).searchParams.get('promo');
  const status = await getStudentsDiscordStatus(promo && promo !== 'all' ? promo : undefined);

  // Membres déjà liés (peu importe l'apprenant) → exclus des propositions.
  const linkedDiscordIds = new Set(
    status.map((s) => s.discordId).filter((id): id is string => Boolean(id)),
  );
  const unlinked = status
    .filter((s) => !s.discordId)
    .map((s) => ({
      login: s.login,
      firstName: s.firstName,
      lastName: s.lastName,
      promoName: s.promoName,
    }));

  const res = await fetchGuildMembers();
  if (!res.ok) {
    return apiError('BAD_REQUEST', res.error, res.guilds ? { guilds: res.guilds } : undefined);
  }

  const candidates = res.members.filter((m) => !linkedDiscordIds.has(m.id));
  const suggestions = matchMembersToStudents(unlinked, candidates);

  return apiSuccess({
    suggestions,
    memberCount: res.members.length,
    unlinkedCount: unlinked.length,
    preCheckedCount: suggestions.filter((s) => s.preChecked).length,
  });
});
