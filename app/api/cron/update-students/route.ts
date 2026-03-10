import { NextRequest, NextResponse } from 'next/server';
import { updateStudentProject } from '@/lib/db/services/students';
import { getArchivedPromotions } from '@/lib/db/services/promotions';
import { getAllPromotions } from '@/lib/config/promotions';
import { getAllProjects } from '@/lib/config/projects';
import { getAllPromoStatus } from '@/lib/db/services/promoStatus';
import { updateLastUpdate } from '@/lib/db/services/updates';
import type { ProjectsConfig } from '@/lib/types/code-reviews';

export const runtime = 'nodejs';
export const maxDuration = 10;

const CRON_SECRET = process.env.CRON_SECRET;

interface UserProject {
  projectName: string;
  projectStatus: string;
  groupId: number;
}

interface CommonProjects {
  [key: string]: { name: string | null; status: string | null };
}

interface LastProjectsFinished {
  [key: string]: boolean;
}

type PromoStatusMap = Record<string, string | { rust?: string; java?: string }>;

function buildProjectIndexMap(allProjectsTyped: ProjectsConfig) {
  const map = new Map<string, number>();
  let index = 0;

  for (const track of Object.keys(allProjectsTyped) as Array<
    keyof ProjectsConfig
  >) {
    for (const project of allProjectsTyped[track]) {
      map.set(project.name.toLowerCase(), index);
      index++;
    }
  }

  return map;
}

function buildProjectTrackMap(allProjectsTyped: ProjectsConfig) {
  const map = new Map<string, string>();
  for (const track of Object.keys(allProjectsTyped) as Array<
    keyof ProjectsConfig
  >) {
    for (const project of allProjectsTyped[track]) {
      map.set(project.name.toLowerCase(), track);
    }
  }
  return map;
}

function findProjectIndexFromMap(
  projectIndexMap: Map<string, number>,
  projectName: string
): number {
  return projectIndexMap.get(projectName.toLowerCase()) ?? -1;
}

function findProjectTrackFromMap(
  projectTrackMap: Map<string, string>,
  projectName: string
): string | null {
  return projectTrackMap.get(projectName.toLowerCase()) ?? null;
}

function findActiveProjectsByTrack(
  allProjectsTyped: ProjectsConfig,
  userProjects: UserProject[]
) {
  const commonProjects: CommonProjects = {};
  const lastProjectsFinished: LastProjectsFinished = {};

  for (const track of Object.keys(allProjectsTyped) as Array<
    keyof ProjectsConfig
  >) {
    const trackProjects = allProjectsTyped[track];
    let studentActiveProject: { name: string | null; status: string | null } = {
      name: null,
      status: null
    };
    let firstUnfinishedProject: { name: string | null; status: string | null } =
      {
        name: null,
        status: 'without group'
      };
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

function findLastActiveProject(
  allProjectsTyped: ProjectsConfig,
  commonProjects: CommonProjects,
  projectIndexMap: Map<string, number>
): { name: string | null; status: string | null } {
  let lastProject = {
    name: null as string | null,
    status: 'without group' as string | null,
    index: -1
  };

  for (const track of ['Golang', 'Javascript', 'Rust', 'Java']) {
    const project = commonProjects[track];
    if (!project || !project.name || project.status === 'not_chosen') continue;

    const projectIndex = findProjectIndexFromMap(projectIndexMap, project.name);
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

function calculateDelayLevel(
  allProjectsTyped: ProjectsConfig,
  promoStatusMap: PromoStatusMap,
  promotionTitle: string,
  commonProjects: CommonProjects,
  lastProjectsFinished: LastProjectsFinished,
  projectIndexMap: Map<string, number>,
  projectTrackMap: Map<string, string>
): string {
  let delayLevel = 'bien';

  const currentPromoProject = promoStatusMap[promotionTitle];
  if (!currentPromoProject) return delayLevel;

  let isMultiTrack = false;
  let promoRustProject: string | null = null;
  let promoJavaProject: string | null = null;

  if (typeof currentPromoProject === 'object') {
    isMultiTrack = true;
    promoRustProject = currentPromoProject.rust ?? null;
    promoJavaProject = currentPromoProject.java ?? null;
  }

  const allTracksCompleted =
    lastProjectsFinished['Golang'] &&
    lastProjectsFinished['Javascript'] &&
    (lastProjectsFinished['Rust'] || lastProjectsFinished['Java']);

  if (
    typeof currentPromoProject === 'string' &&
    currentPromoProject.toLowerCase() === 'fin'
  ) {
    return allTracksCompleted ? 'Validé' : 'Non Validé';
  }

  if (allTracksCompleted) return 'spécialité';

  if (
    typeof currentPromoProject === 'string' &&
    currentPromoProject.toLowerCase() === 'spécialité'
  ) {
    return 'spécialité';
  }

  if (isMultiTrack) {
    const studentRustProject = commonProjects['Rust']?.name;
    const studentJavaProject = commonProjects['Java']?.name;
    const studentRustStatus = commonProjects['Rust']?.status;
    const studentJavaStatus = commonProjects['Java']?.status;

    let studentProject: string | null = null;
    let promoProject: string | null = null;

    if (
      studentRustStatus !== 'not_chosen' &&
      studentRustStatus !== 'without group' &&
      studentRustProject
    ) {
      studentProject = studentRustProject;
      promoProject = promoRustProject;
    } else if (
      studentJavaStatus !== 'not_chosen' &&
      studentJavaStatus !== 'without group' &&
      studentJavaProject
    ) {
      studentProject = studentJavaProject;
      promoProject = promoJavaProject;
    }

    if (studentProject && promoProject) {
      if (studentProject.toLowerCase() === promoProject.toLowerCase()) {
        return 'bien';
      }

      const promoIndex = findProjectIndexFromMap(projectIndexMap, promoProject);
      const studentIndex = findProjectIndexFromMap(
        projectIndexMap,
        studentProject
      );

      if (studentIndex === -1) return 'en retard';
      if (studentIndex > promoIndex) return 'en avance';
      if (studentIndex < promoIndex) return 'en retard';
      return 'bien';
    }

    return 'en retard';
  }

  if (typeof currentPromoProject === 'string') {
    const promoProjectTrack = findProjectTrackFromMap(
      projectTrackMap,
      currentPromoProject
    );

    if (promoProjectTrack) {
      const studentProjectInTrack = commonProjects[promoProjectTrack]?.name;

      if (
        studentProjectInTrack?.toLowerCase() ===
        currentPromoProject.toLowerCase()
      ) {
        return 'bien';
      }

      const promoIndex = findProjectIndexFromMap(
        projectIndexMap,
        currentPromoProject
      );
      const studentIndex = studentProjectInTrack
        ? findProjectIndexFromMap(projectIndexMap, studentProjectInTrack)
        : -1;

      if (studentIndex === -1) return 'en retard';
      if (studentIndex > promoIndex) return 'en avance';
      if (studentIndex < promoIndex) return 'en retard';
      return 'bien';
    }
  }

  return delayLevel;
}

async function processWithLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  const queue = [...items];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < limit; i++) {
    const run = async () => {
      while (queue.length) {
        const item = queue.shift()!;
        await worker(item);
      }
    };
    workers.push(run());
  }

  await Promise.all(workers);
}

async function updatePromoStudents(
  eventId: string,
  promotions: Awaited<ReturnType<typeof getAllPromotions>>,
  allProjectsTyped: ProjectsConfig,
  promoStatusMap: PromoStatusMap,
  projectIndexMap: Map<string, number>,
  projectTrackMap: Map<string, string>
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

    const userProjects: { [login: string]: UserProject[] } = {};
    for (const entry of data.progress) {
      const login = entry.user.login;
      if (!userProjects[login]) userProjects[login] = [];
      userProjects[login].push({
        projectName: entry.object.name,
        projectStatus: entry.group.status,
        groupId: entry.group.id
      });
    }

    const firstRustProject = allProjectsTyped.Rust?.[0]?.name;
    const firstJavaProject = allProjectsTyped.Java?.[0]?.name;

    const logins = Object.keys(userProjects);

    // Limite de concurrence pour les étudiants (ex: 5 en parallèle)
    await processWithLimit(logins, 5, async (login) => {
      try {
        const { commonProjects, lastProjectsFinished } =
          findActiveProjectsByTrack(allProjectsTyped, userProjects[login]);

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
          findLastActiveProject(
            allProjectsTyped,
            commonProjects,
            projectIndexMap
          );

        const delayLevel = calculateDelayLevel(
          allProjectsTyped,
          promoStatusMap,
          promotionTitle,
          commonProjects,
          lastProjectsFinished,
          projectIndexMap,
          projectTrackMap
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
          `Erreur pour ${login}: ${
            err instanceof Error ? err.message : 'Erreur inconnue'
          }`
        );
      }
    });
  } catch (err) {
    errors.push(
      `Erreur globale pour ${eventId}: ${
        err instanceof Error ? err.message : 'Erreur inconnue'
      }`
    );
  }

  return { updated, errors };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  const rawPromoId = request.nextUrl.searchParams.get('promoId');

  const [promotions, allProjectsConfig, allStatus] = await Promise.all([
    getAllPromotions(),
    getAllProjects(),
    getAllPromoStatus()
  ]);

  const projectIndexMap = buildProjectIndexMap(allProjectsConfig);
  const projectTrackMap = buildProjectTrackMap(allProjectsConfig);

  const promoStatusMap: PromoStatusMap = {};
  for (const s of allStatus) {
    if (!s.currentProject) continue;
    try {
      promoStatusMap[s.promoKey] = JSON.parse(s.currentProject);
    } catch {
      promoStatusMap[s.promoKey] = s.currentProject;
    }
  }

  let promoId: string | null = null;
  if (rawPromoId) {
    const matchedPromo = promotions.find(
      (p) => String(p.eventId) === rawPromoId
    );
    if (!matchedPromo) {
      return NextResponse.json(
        { success: false, error: `Invalid promoId: ${rawPromoId}` },
        { status: 400 }
      );
    }
    promoId = String(matchedPromo.eventId);
  }

  try {
    const archivedPromos = await getArchivedPromotions();
    const archivedPromoNames = new Set(archivedPromos.map((p) => p.name));

    let promoIds: string[];

    if (promoId) {
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
      promoIds = promotions
        .filter((p) => !archivedPromoNames.has(p.key))
        .map((p) => String(p.eventId));
    }

    const results: { promoId: string; updated: number; errors: string[] }[] =
      [];

    // Limite de concurrence sur les promos (ex: 3 promos en parallèle)
    await processWithLimit(promoIds, 3, async (id) => {
      const result = await updatePromoStudents(
        id,
        promotions,
        allProjectsConfig,
        promoStatusMap,
        projectIndexMap,
        projectTrackMap
      );
      results.push({ promoId: id, ...result });
    });

    const eventIdForLog = promoId || 'all';
    await updateLastUpdate(eventIdForLog, true);

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

export async function POST(request: NextRequest) {
  return GET(request);
}