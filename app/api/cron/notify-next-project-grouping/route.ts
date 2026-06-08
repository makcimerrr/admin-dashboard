import { NextRequest, NextResponse } from 'next/server';
import { getAllPromotions } from '@/lib/config/promotions';
import { getArchivedPromotions } from '@/lib/db/services/promotions';
import { fetchPromotionProgressions } from '@/lib/services/zone01';
import { getAllProjects } from '@/lib/config/projects';
import { TRACKS, type Track } from '@/lib/db/schema/audits';
import { getDiscordIdByLogin } from '@/lib/db/services/discordUsers';
import { sendDiscordDM } from '@/lib/services/discord';
import { notifyViaBot } from '@/lib/services/bot-notify';
import { sendTeamsFormsCard, buildRelanceCard } from '@/lib/services/teams';
import {
  upsertDetection,
  markNextProjectNotified,
} from '@/lib/db/services/nextProjectReminders';

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

/** Délai de grâce : on ne notifie qu'après 7 jours de persistance. */
const GRACE_MS = 7 * 24 * 3600 * 1000;

// L'ordre des tracks suit TRACKS (Golang, Javascript, Rust, Java).
const TRACK_ORDER: readonly Track[] = TRACKS;

interface PeerInfo {
  login: string;
  name: string;
}

/**
 * Construit le DM incitant l'étudiant à créer/rejoindre un groupe sur le projet
 * suivant, avec la liste des autres étudiants dispo (même promo+projet suivant).
 */
function buildGroupingMessage(
  login: string,
  prevProject: string,
  nextProject: string,
  peers: PeerInfo[],
): string {
  const peersBlock = peers.length
    ? `\nD'autres étudiants sont aussi dispo sur **${nextProject}** :\n${peers
        .map((p) => `• ${p.name || p.login}`)
        .join('\n')}\n`
    : `\nTu sembles être le premier prêt sur ce projet — lance-toi et invite des coéquipiers !`;

  return [
    `Hey ${login} ! 👋`,
    ``,
    `Tu as terminé **${prevProject}** 🎉 mais tu n'as pas encore de groupe pour le projet suivant : **${nextProject}**.`,
    ``,
    `Pense à créer ou rejoindre un groupe pour démarrer 🚀`,
    peersBlock,
    `N'attends pas trop pour te lancer 💪`,
  ].join('\n');
}

interface StudentEntry {
  track: Track;
  status: string;
  hasGroup: boolean;
}

interface StudentState {
  name: string;
  // clé = nom de projet en minuscules
  entries: Map<string, StudentEntry>;
}

export async function GET(request: NextRequest) {
  // Auth CRON_SECRET inconditionnelle (Bearer header OU ?secret).
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const [promotions, archivedPromos, projectsConfig] = await Promise.all([
      getAllPromotions(),
      getArchivedPromotions(),
      getAllProjects(),
    ]);

    const archivedNames = new Set(archivedPromos.map((p) => p.name));
    const activePromos = promotions.filter((p) => !archivedNames.has(p.key));

    // Map nom de projet (lower) → track, depuis la config (case-insensitive).
    const projectTrack = new Map<string, Track>();
    // Ensemble des projets optionnels (lower) : exclus des relances de regroupement.
    const optionalProjects = new Set<string>();
    for (const track of Object.keys(projectsConfig) as Track[]) {
      for (const project of projectsConfig[track]) {
        projectTrack.set(project.name.toLowerCase(), track);
        if (project.optional) optionalProjects.add(project.name.toLowerCase());
      }
    }

    let checked = 0;
    const sent: Array<{
      login: string;
      prevProject: string;
      nextProject: string;
      peers: number;
      dry?: boolean;
    }> = [];

    for (const promo of activePromos) {
      const promoId = String(promo.eventId);

      let progress;
      try {
        progress = await fetchPromotionProgressions(promoId);
      } catch (err) {
        console.error(`Error fetching progressions for promo ${promoId}:`, err);
        continue;
      }

      // --- Construire l'état par étudiant ---
      const students = new Map<string, StudentState>();
      for (const entry of progress) {
        const login = entry.user.login;
        const projectNameLower = entry.object.name.toLowerCase();
        const track = projectTrack.get(projectNameLower);
        // Projet inconnu de la config (case-insensitive) → ignoré pour l'ordre.
        if (!track) continue;

        let student = students.get(login);
        if (!student) {
          const name = [entry.user.firstName, entry.user.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
          student = { name, entries: new Map() };
          students.set(login, student);
        }

        const status = entry.group?.status;
        const hasGroup =
          entry.group?.id != null && status !== 'without group';

        student.entries.set(projectNameLower, {
          track,
          status: status ?? '',
          hasGroup,
        });
      }

      // --- Pass 1 : candidats ---
      interface Candidate {
        login: string;
        prevProject: string;
        nextProject: string;
      }
      const candidates: Candidate[] = [];
      // clé = nextProject (lower) → liste des étudiants dispo dessus
      const candidatesByNext = new Map<string, PeerInfo[]>();

      for (const [login, student] of students) {
        // Liste ordonnée des projets pour CET étudiant : pour chaque track de
        // TRACK_ORDER où il a ≥1 entrée, concaténer projectsConfig[track].
        const ordered: { name: string; lower: string }[] = [];
        for (const track of TRACK_ORDER) {
          const hasEntryInTrack = Array.from(student.entries.values()).some(
            (e) => e.track === track,
          );
          if (!hasEntryInTrack) continue;
          for (const project of projectsConfig[track]) {
            ordered.push({ name: project.name, lower: project.name.toLowerCase() });
          }
        }

        // Trouver le « frontier » : projet fini le plus avancé suivi d'un
        // projet suivant non groupé.
        let frontier: Candidate | null = null;
        for (let i = 0; i < ordered.length - 1; i++) {
          const prev = ordered[i];
          const next = ordered[i + 1];
          const prevEntry = student.entries.get(prev.lower);
          if (!prevEntry || prevEntry.status !== 'finished') continue;

          // Projet suivant optionnel → pas de rappel de regroupement (skip).
          if (optionalProjects.has(next.lower)) continue;

          const nextEntry = student.entries.get(next.lower);
          // Pas groupé sur le suivant = pas d'entrée OU entrée sans groupe.
          const ungrouped = !nextEntry || !nextEntry.hasGroup;
          if (!ungrouped) continue;

          // Garde le frontier dont le prev est le plus avancé (dernier rencontré).
          frontier = {
            login,
            prevProject: prev.name,
            nextProject: next.name,
          };
        }

        if (frontier) {
          candidates.push(frontier);
          const key = frontier.nextProject.toLowerCase();
          const peers = candidatesByNext.get(key) ?? [];
          peers.push({ login, name: student.name });
          candidatesByNext.set(key, peers);
        }
      }

      // --- Pass 2 : envoi ---
      for (const candidate of candidates) {
        checked++;
        const { login, prevProject, nextProject } = candidate;

        const row = await upsertDetection(login, promoId, nextProject);
        if (row.notifiedAt != null) continue;
        if (Date.now() - row.detectedAt.getTime() < GRACE_MS) continue;

        const discordId = await getDiscordIdByLogin(login);
        if (!discordId) continue;

        const peers = (candidatesByNext.get(nextProject.toLowerCase()) ?? [])
          .filter((p) => p.login !== login);

        const msg = buildGroupingMessage(login, prevProject, nextProject, peers);

        if (dry) {
          sent.push({
            login,
            prevProject,
            nextProject,
            peers: peers.length,
            dry: true,
          });
          continue;
        }

        // Émission via le bot (DM simple, aucun bouton). Fallback DM texte.
        const bot = await notifyViaBot({
          type: 'grouping',
          recipientDiscordId: discordId,
          title: 'Regroupement — projet suivant',
          body: msg,
          facts: [
            { name: 'Projet précédent', value: prevProject },
            { name: 'Projet suivant', value: nextProject },
            { name: 'Étudiants dispo', value: String(peers.length) },
          ],
          actions: { bookButton: false, replyButton: false },
          context: {
            type: 'grouping',
            source_label: 'Regroupement projet suivant',
            login,
            promoId,
            nextProjectName: nextProject,
          },
        });

        const ok = bot.ok ? true : await sendDiscordDM(discordId, msg);

        if (ok) {
          await markNextProjectNotified(login, promoId, nextProject);
          sent.push({ login, prevProject, nextProject, peers: peers.length });
          // Feature 5 : relance émise en parallèle sur Teams (Canal 2).
          await sendTeamsFormsCard(
            buildRelanceCard({
              title: 'Relance — Regroupement projet suivant',
              facts: [
                { title: 'Étudiant', value: login },
                { title: 'Projet précédent', value: prevProject },
                { title: 'Projet suivant', value: nextProject },
              ],
            }),
          );
        }
      }
    }

    return NextResponse.json({ success: true, checked, sent });
  } catch (error) {
    console.error('Cron notify-next-project-grouping error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
