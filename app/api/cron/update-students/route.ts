import { NextRequest, NextResponse } from 'next/server';
import { updateStudentProject } from '@/lib/db/services/students';
import { db } from '@/lib/db/config';
import { updates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getArchivedPromotions } from '@/lib/db/services/promotions';
import promotions from '../../../../config/promoConfig.json';
import promoStatus from '../../../../config/promoStatus.json';
import allProjects from '../../../../config/projects.json';

/**
 * API Route pour la mise à jour des étudiants via cron
 *
 * GET /api/cron/update-students
 *   - Met à jour tous les étudiants de toutes les promotions
 *   - Peut être appelé par un cron job externe (Vercel, Railway, etc.)
 *
 * Query params:
 *   - secret: Clé secrète pour authentifier le cron (optionnel en dev)
 *   - promoId: ID de la promotion à mettre à jour (optionnel, défaut: toutes)
 *
 * Headers:
 *   - Authorization: Bearer <CRON_SECRET> (alternative au query param)
 */

const CRON_SECRET = process.env.CRON_SECRET;

interface Project {
  id: number;
  name: string;
  project_time_week: number;
}

interface AllProjects {
  Golang: Project[];
  Javascript: Project[];
  Rust: Project[];
  Java: Project[];
}

interface UserProject {
  projectName: string;
  projectStatus: string;
  groupId: number;
}

const allProjectsTyped = allProjects as AllProjects;

// Trouver l'index global d'un projet
function findProjectIndex(projectName: string): number {
  let globalIndex = 0;
  for (const track of Object.keys(allProjectsTyped) as Array<
    keyof AllProjects
  >) {
    for (const project of allProjectsTyped[track]) {
      if (project.name.toLowerCase() === projectName.toLowerCase()) {
        return globalIndex;
      }
      globalIndex++;
    }
  }
  return -1;
}

// Trouver la track d'un projet
function findProjectTrack(projectName: string): string | null {
  for (const track of Object.keys(allProjectsTyped) as Array<
    keyof AllProjects
  >) {
    for (const project of allProjectsTyped[track]) {
      if (project.name.toLowerCase() === projectName.toLowerCase()) {
        return track;
      }
    }
  }
  return null;
}

// Trouver les projets actifs par track
function findActiveProjectsByTrack(userProjects: UserProject[]) {
  const commonProjects: {
    [key: string]: { name: string | null; status: string | null };
  } = {};
  const lastProjectsFinished: { [key: string]: boolean } = {};

  for (const track of Object.keys(allProjectsTyped) as Array<
    keyof AllProjects
  >) {
    const trackProjects = allProjectsTyped[track];
    let studentActiveProject: { name: string | null; status: string | null } = {
      name: null,
      status: null
    };
    let firstUnfinishedProject: { name: string | null; status: string | null } =
      { name: null, status: 'without group' };
    let lastFinishedProject: { name: string | null; status: string | null } = {
      name: null,
      status: 'finished'
    };
    let allDone = true;

    for (const project of trackProjects) {
      const userProject = userProjects.find(
        (p) => p.projectName.toLowerCase() === project.name.toLowerCase()
      );

      if (userProject) {
        if (userProject.projectStatus === 'finished') {
          lastFinishedProject = { name: project.name, status: 'finished' };
        } else {
          if (!studentActiveProject.name) {
            studentActiveProject = {
              name: project.name,
              status: userProject.projectStatus
            };
          }
          allDone = false;
        }
      } else {
        if (!firstUnfinishedProject.name) {
          firstUnfinishedProject = {
            name: project.name,
            status: 'without group'
          };
        }
        allDone = false;
      }
    }

    if (allDone) {
      commonProjects[track] = lastFinishedProject;
      lastProjectsFinished[track] = true;
    } else {
      commonProjects[track] = studentActiveProject.name
        ? studentActiveProject
        : firstUnfinishedProject;
      lastProjectsFinished[track] = false;
    }
  }

  return { commonProjects, lastProjectsFinished };
}

// Trouver le dernier projet actif parmi tous les troncs
function findLastActiveProject(commonProjects: {
  [key: string]: { name: string | null; status: string | null };
}): { name: string | null; status: string | null } {
  let lastProject: {
    name: string | null;
    status: string | null;
    index: number;
  } = {
    name: null,
    status: 'without group',
    index: -1
  };

  for (const track of ['Golang', 'Javascript', 'Rust', 'Java']) {
    const project = commonProjects[track];
    if (!project || !project.name || project.status === 'not_chosen') {
      continue;
    }

    const projectIndex = findProjectIndex(project.name);
    if (projectIndex > lastProject.index) {
      lastProject = {
        name: project.name,
        status: project.status,
        index: projectIndex
      };
    }
  }

  return { name: lastProject.name, status: lastProject.status };
}

// Calculer le niveau de retard
function calculateDelayLevel(
  promotionTitle: string,
  commonProjects: {
    [key: string]: { name: string | null; status: string | null };
  },
  lastProjectsFinished: { [key: string]: boolean }
): string {
  let delayLevel = 'bien';

  const currentPromoProject =
    promoStatus[promotionTitle as keyof typeof promoStatus];
  if (!currentPromoProject) return delayLevel;

  let isMultiTrack = false;
  let promoRustProject: string | null = null;
  let promoJavaProject: string | null = null;

  if (typeof currentPromoProject === 'object') {
    isMultiTrack = true;
    promoRustProject = (currentPromoProject as { rust?: string }).rust ?? null;
    promoJavaProject = (currentPromoProject as { java?: string }).java ?? null;
  }

  const allTracksCompleted =
    lastProjectsFinished['Golang'] &&
    lastProjectsFinished['Javascript'] &&
    (lastProjectsFinished['Rust'] || lastProjectsFinished['Java']);

  if (
    typeof currentPromoProject === 'string' &&
    currentPromoProject.toLowerCase() === 'fin'
  ) {
    delayLevel = allTracksCompleted ? 'Validé' : 'Non Validé';
  } else if (allTracksCompleted) {
    delayLevel = 'spécialité';
  } else if (
    typeof currentPromoProject === 'string' &&
    currentPromoProject.toLowerCase() === 'spécialité'
  ) {
    delayLevel = 'spécialité';
  } else if (isMultiTrack) {
    const studentRustProject = commonProjects['Rust']?.name;
    const studentJavaProject = commonProjects['Java']?.name;
    const studentRustStatus = commonProjects['Rust']?.status;
    const studentJavaStatus = commonProjects['Java']?.status;

    let studentTrack: 'Rust' | 'Java' | null = null;
    let studentProject: string | null = null;
    let promoProject: string | null = null;

    if (
      studentRustStatus !== 'not_chosen' &&
      studentRustStatus !== 'without group' &&
      studentRustProject
    ) {
      studentTrack = 'Rust';
      studentProject = studentRustProject;
      promoProject = promoRustProject;
    } else if (
      studentJavaStatus !== 'not_chosen' &&
      studentJavaStatus !== 'without group' &&
      studentJavaProject
    ) {
      studentTrack = 'Java';
      studentProject = studentJavaProject;
      promoProject = promoJavaProject;
    }

    if (studentTrack && studentProject && promoProject) {
      if (studentProject.toLowerCase() === promoProject.toLowerCase()) {
        delayLevel = 'bien';
      } else {
        const promoIndex = findProjectIndex(promoProject);
        const studentIndex = findProjectIndex(studentProject);

        if (studentIndex === -1) {
          delayLevel = 'en retard';
        } else if (studentIndex > promoIndex) {
          delayLevel = 'en avance';
        } else if (studentIndex < promoIndex) {
          delayLevel = 'en retard';
        } else {
          delayLevel = 'bien';
        }
      }
    } else {
      delayLevel = 'en retard';
    }
  } else if (typeof currentPromoProject === 'string') {
    const promoProjectTrack = findProjectTrack(currentPromoProject);

    if (promoProjectTrack) {
      const studentProjectInTrack = commonProjects[promoProjectTrack]?.name;

      if (
        studentProjectInTrack?.toLowerCase() ===
        currentPromoProject.toLowerCase()
      ) {
        delayLevel = 'bien';
      } else {
        const promoIndex = findProjectIndex(currentPromoProject);
        const studentIndex = studentProjectInTrack
          ? findProjectIndex(studentProjectInTrack)
          : -1;

        if (studentIndex === -1) {
          delayLevel = 'en retard';
        } else if (studentIndex > promoIndex) {
          delayLevel = 'en avance';
        } else if (studentIndex < promoIndex) {
          delayLevel = 'en retard';
        } else {
          delayLevel = 'bien';
        }
      }
    }
  }

  return delayLevel;
}

// Mettre à jour les étudiants d'une promotion
async function updatePromoStudents(
  eventId: string
): Promise<{ updated: number; errors: string[] }> {
  const promotion = promotions.find((p) => String(p.eventId) === eventId);
  if (!promotion) {
    return { updated: 0, errors: [`Promotion ${eventId} non trouvée`] };
  }

  const promotionTitle = promotion.key;
  const errors: string[] = [];
  let updated = 0;

  try {
    const response = await fetch(
      `https://api-zone01-rouen.deno.dev/api/v1/promotions/${eventId}/students`
    );

    if (!response.ok) {
      return {
        updated: 0,
        errors: [`Erreur API Zone01 pour ${eventId}: ${response.status}`]
      };
    }

    const data = await response.json();

    // Grouper par utilisateur
    const userProjects: { [login: string]: UserProject[] } = {};
    for (const entry of data.progress) {
      const login = entry.user.login;
      if (!userProjects[login]) {
        userProjects[login] = [];
      }
      userProjects[login].push({
        projectName: entry.object.name,
        projectStatus: entry.group.status,
        groupId: entry.group.id
      });
    }

    // Mettre à jour chaque étudiant
    for (const login of Object.keys(userProjects)) {
      try {
        const { commonProjects, lastProjectsFinished } =
          findActiveProjectsByTrack(userProjects[login]);

        // Gérer Rust/Java choice
        const firstRustProject = allProjectsTyped.Rust[0]?.name;
        const firstJavaProject = allProjectsTyped.Java[0]?.name;

        const isRustActive =
          commonProjects['Rust']?.name !== firstRustProject ||
          commonProjects['Rust']?.status !== 'without group';
        const isJavaActive =
          commonProjects['Java']?.name !== firstJavaProject ||
          commonProjects['Java']?.status !== 'without group';

        if (isRustActive && !isJavaActive) {
          commonProjects['Java'] = { name: null, status: 'not_chosen' };
        } else if (isJavaActive && !isRustActive) {
          commonProjects['Rust'] = { name: null, status: 'not_chosen' };
        } else if (!isRustActive && !isJavaActive) {
          commonProjects['Rust'] = { name: null, status: 'not_chosen' };
          commonProjects['Java'] = { name: null, status: 'not_chosen' };
        }

        const { name: actualProjectName, status: actualProjectStatus } =
          findLastActiveProject(commonProjects);
        const delayLevel = calculateDelayLevel(
          promotionTitle,
          commonProjects,
          lastProjectsFinished
        );

        await updateStudentProject(
          login,
          actualProjectName ?? 'N/A',
          actualProjectStatus ?? 'without group',
          delayLevel,
          lastProjectsFinished,
          commonProjects,
          promotionTitle
        );

        updated++;
      } catch (err) {
        errors.push(
          `Erreur pour ${login}: ${err instanceof Error ? err.message : 'Erreur inconnue'}`
        );
      }
    }
  } catch (err) {
    errors.push(
      `Erreur globale pour ${eventId}: ${err instanceof Error ? err.message : 'Erreur inconnue'}`
    );
  }

  return { updated, errors };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Vérifier l'authentification (en production)
  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  // Validate promoId against known promotions to avoid using user-controlled values in requests
  const rawPromoId = request.nextUrl.searchParams.get('promoId');
  let promoId: string | null = null;
  if (rawPromoId) {
    // Normalize and canonicalize using the trusted promotions list
    const matchedPromo = promotions.find(
      (p) => String(p.eventId) === rawPromoId
    );
    if (!matchedPromo) {
      return NextResponse.json(
        { success: false, error: `Invalid promoId: ${rawPromoId}` },
        { status: 400 }
      );
    }
    // Use the canonical eventId from the trusted source instead of the raw input
    promoId = String(matchedPromo.eventId);
  }

  try {
    // D'abord, mettre à jour le timeline
    await fetch('/api/timeline_project');

    // Récupérer les promos archivées pour les exclure
    const archivedPromos = await getArchivedPromotions();
    const archivedPromoNames = new Set(archivedPromos.map((p) => p.name));

    // Déterminer les promos à mettre à jour (exclure les archivées)
    let promoIds: string[];
    if (promoId) {
      // Si une promo spécifique est demandée, vérifier qu'elle n'est pas archivée
      const promo = promotions.find((p) => String(p.eventId) === promoId);
      if (promo && archivedPromoNames.has(promo.key)) {
        return NextResponse.json(
          {
            success: false,
            error: `La promotion ${promo.key} est archivée et ne peut pas être mise à jour`
          },
          { status: 400 }
        );
      }
      promoIds = [promoId];
    } else {
      // Filtrer les promos archivées
      promoIds = promotions
        .filter((p) => !archivedPromoNames.has(p.key))
        .map((p) => String(p.eventId));
    }

    const results: { promoId: string; updated: number; errors: string[] }[] =
      [];

    for (const id of promoIds) {
      const result = await updatePromoStudents(id);
      results.push({ promoId: id, ...result });
    }

    // Enregistrer la mise à jour
    const eventIdForLog = promoId || 'all';

    // Vérifier si un enregistrement existe déjà
    const existing = await db
      .select()
      .from(updates)
      .where(eq(updates.event_id, eventIdForLog))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(updates)
        .set({ last_update: new Date() })
        .where(eq(updates.event_id, eventIdForLog));
    } else {
      await db.insert(updates).values({
        event_id: eventIdForLog,
        last_update: new Date()
      });
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const duration = Date.now() - startTime;
    const skippedArchived =
      promotions.length -
      promoIds.length -
      (promoId ? promotions.length - 1 : 0);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      summary: {
        totalPromos: promoIds.length,
        totalStudentsUpdated: totalUpdated,
        totalErrors,
        archivedPromosSkipped: skippedArchived,
        archivedPromoNames: Array.from(archivedPromoNames)
      },
      results
    });
  } catch (error) {
    console.error('Cron update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

// POST pour compatibilité avec certains systèmes de cron
export async function POST(request: NextRequest) {
  return GET(request);
}
