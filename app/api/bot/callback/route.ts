import { NextRequest, NextResponse } from 'next/server';
import { markRdvConfirmed } from '@/lib/db/services/groupStatuses';
import { markAuditResponded, getStudentDisplayNames, getGroupMemberNames } from '@/lib/db/services/auditReports';
import { sendTeamsFormsCard, buildReplyCard, buildBookedCard } from '@/lib/services/teams';
import { getPromotionByEventId } from '@/lib/config/promotions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Bot → Dashboard (contrat §2). Le bot Discord renvoie ici les interactions
 * des destinataires (bouton vert « Marquer le CR comme réservé », soumission du
 * modal « Répondre »).
 *
 * Auth : header `X-Bot-Secret` == `BOT_CALLBACK_SECRET`. 401 JSON sinon.
 *
 * Événements :
 *  - `rdv_confirmed`  → marque `group_statuses.rdv_confirmed_at` (idempotent)
 *    puis poste une carte « ✅ RDV pris » sur Teams (Canal 2).
 *  - `reply_submitted` → poste une carte Teams (Canal 2) + si contexte
 *    `audit_report`, enregistre la réponse de l'auditeur.
 */

interface CallbackContext {
  type?: string;
  source_label?: string;
  groupId?: string;
  members?: string;
  promoId?: string;
  projectName?: string;
  captainLogin?: string;
  auditorLogin?: string;
  login?: string;
  nextProjectName?: string;
}

interface CallbackBody {
  event?: string;
  context?: CallbackContext;
  actor_discord_id?: string;
  data?: { status?: string; comment?: string };
}

export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const expected = process.env.BOT_CALLBACK_SECRET;
  const provided = request.headers.get('x-bot-secret');
  if (!expected || provided !== expected) {
    return NextResponse.json({ ok: false, error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CallbackBody;
    const event = body.event;
    const context = body.context ?? {};

    if (event === 'rdv_confirmed') {
      const { groupId, promoId, projectName, captainLogin } = context;
      if (!groupId || !promoId || !projectName) {
        return NextResponse.json(
          { ok: false, error: 'context incomplet (groupId/promoId/projectName)' },
          { status: 400 },
        );
      }
      await markRdvConfirmed(groupId, promoId, projectName);

      // Carte Teams (Canal 2) « ✅ RDV pris ». Résout le nom de promo via
      // l'eventId (promoId) si possible, sinon garde le promoId brut.
      let promoLabel: string = promoId;
      const eventId = Number(promoId);
      if (Number.isFinite(eventId)) {
        const promo = await getPromotionByEventId(eventId);
        promoLabel = promo?.title ?? promo?.key ?? promoId;
      }
      await sendTeamsFormsCard(
        buildBookedCard({
          captain: captainLogin || 'inconnu',
          project: projectName,
          promo: promoLabel,
        }),
      );

      return NextResponse.json({ ok: true });
    }

    if (event === 'reply_submitted') {
      const status = body.data?.status ?? '—';
      const comment = body.data?.comment ?? '';

      // « De » = Prénom Nom (résolu depuis le login), fallback login.
      const actorLogin = context.auditorLogin || context.login || context.captainLogin;
      let who = actorLogin || 'inconnu';
      if (actorLogin) {
        const names = await getStudentDisplayNames([actorLogin]);
        who = names.get(actorLogin) || actorLogin;
      }

      // (a) Enregistrer la réponse de l'auditeur EN PREMIER (rapport d'audit) :
      // ainsi un échec Teams ne fait pas perdre la réponse ni la confirmation.
      if (context.type === 'audit_report' && context.auditorLogin && context.groupId) {
        try {
          await markAuditResponded(context.auditorLogin, context.groupId, status, comment || null);
        } catch (e) {
          console.error('[bot/callback] markAuditResponded échec:', e);
        }
      }

      // (b) Carte Teams (2e canal). Non bloquant : si Teams échoue, l'étudiant
      // reçoit quand même sa confirmation (le callback renvoie 200).
      try {
        const cardContext: { title: string; value: string }[] = [];
        if (context.type === 'audit_report') {
          // Rapport d'audit : Projet + Membres du groupe audité (jamais l'ID).
          cardContext.push({ title: 'Projet', value: context.projectName ?? '—' });
          let members = context.members?.trim();
          if (!members && context.groupId) members = await getGroupMemberNames(context.groupId);
          cardContext.push({ title: 'Groupe audité', value: members || '—' });
        } else {
          if (context.projectName) cardContext.push({ title: 'Projet', value: context.projectName });
          if (context.groupId) cardContext.push({ title: 'Groupe', value: context.groupId });
          if (context.promoId) cardContext.push({ title: 'Promo', value: context.promoId });
        }

        await sendTeamsFormsCard(
          buildReplyCard({
            source: context.source_label || context.type || 'Relance',
            who,
            status,
            comment,
            context: cardContext,
          }),
        );
      } catch (e) {
        console.error('[bot/callback] sendTeamsFormsCard (reply) échec:', e);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `event inconnu: ${event ?? '(absent)'}` }, { status: 400 });
  } catch (err) {
    console.error('[bot/callback] erreur:', err);
    return NextResponse.json({ ok: false, error: 'Erreur interne' }, { status: 500 });
  }
}
