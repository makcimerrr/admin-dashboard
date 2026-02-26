import { NextRequest, NextResponse } from 'next/server';
import { updateStudentProject } from '@/lib/db/services/students';
import { getArchivedPromotions } from '@/lib/db/services/promotions';
import { getAllPromotions } from '@/lib/config/promotions';
import { getAllProjects } from '@/lib/config/projects';
import { getAllPromoStatus } from '@/lib/db/services/promoStatus';
import { updateLastUpdate } from '@/lib/db/services/updates';
import type { ProjectsConfig } from '@/lib/types/code-reviews';

const CRON_SECRET = process.env.CRON_SECRET;

interface Project {
  id: number;
  name: string;
  project_time_week: number;
}

interface UserProject {
  projectName: string;
  projectStatus: string;
  groupId: number;
}

function findProjectIndex(allProjectsTyped: ProjectsConfig, projectName: string): number {
  let globalIndex = 0;
  for (const track of Object.keys(allProjectsTyped) as Array<keyof ProjectsConfig>) {
    for (const project of allProjectsTyped[track]) {
      if (project.name.toLowerCase() === projectName.toLowerCase()) {
        return globalIndex;
      }
      globalIndex++;
    }
  }
  return -1;
}

function findProjectTrack(allProjectsTyped: ProjectsConfig, projectName: string): string | null {
  for (const track of Object.keys(allProjectsTyped) as Array<keyof ProjectsConfig>) {
    for (const project of allProjectsTyped[track]) {
      if (project.name.toLowerCase() === projectName.toLowerCase()) {
        return track;
      }
    }
  }
  return null;
}

function findActiveProjectsByTrack(allProjectsTyped: ProjectsConfig, userProjects: UserProject[]) {
  const commonProjects: {
    [key: string]: { name: string | null; status: string | null };
  } = {};
  const lastProjectsFinished: { [key: string]: boolean } = {};

  for (const track of Object.keys(allProjectsTyped) as Array<keyof ProjectsConfig>) {
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

function findLastActiveProject(
  allProjectsTyped: ProjectsConfig,
  commonProjects: {
    [key: string]: { name: string | null; status: string | null };
  }
): { name: string | null; status: string | null } {
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

    const projectIndex = findProjectIndex(allProjectsTyped, project.name);
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
  promoStatusMap: Record<string, string | { rust?: string; java?: string }>,
  promotionTitle: string,
  commonProjects: {
    [key: string]: { name: string | null; status: string | null };
  },
  lastProjectsFinished: { [key: string]: boolean }
): string {
  let delayLevel = 'bien';

  const currentPromoProject = promoStatusMap[promotionTitle];
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
        const promoIndex = findProjectIndex(allProjectsTyped, promoProject);
        const studentIndex = findProjectIndex(allProjectsTyped, studentProject);

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
    const promoProjectTrack = findProjectTrack(allProjectsTyped, currentPromoProject);

    if (promoProjectTrack) {
      const studentProjectInTrack = commonProjects[promoProjectTrack]?.name;

      if (
        studentProjectInTrack?.toLowerCase() ===
        currentPromoProject.toLowerCase()
      ) {
        delayLevel = 'bien';
      } else {
        const promoIndex = findProjectIndex(allProjectsTyped, currentPromoProject);
        const studentIndex = studentProjectInTrack
          ? findProjectIndex(allProjectsTyped, studentProjectInTrack)
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

async function updatePromoStudents(
  eventId: string,
  promotions: Awaited<ReturnType<typeof getAllPromotions>>,
  allProjectsTyped: ProjectsConfig,
  promoStatusMap: Record<string, string | { rust?: string; java?: string }>
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
      if (!userProjects[login]) {
        userProjects[login] = [];
      }
      userProjects[login].push({
        projectName: entry.object.name,
        projectStatus: entry.group.status,
        groupId: entry.group.id
      });
    }

    for (const login of Object.keys(userProjects)) {
      try {
        const { commonProjects, lastProjectsFinished } =
          findActiveProjectsByTrack(allProjectsTyped, userProjects[login]);

        const firstRustProject = allProjectsTyped.Rust?.[0]?.name;
        const firstJavaProject = allProjectsTyped.Java?.[0]?.name;

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
          findLastActiveProject(allProjectsTyped, commonProjects);
        const delayLevel = calculateDelayLevel(
          allProjectsTyped,
          promoStatusMap,
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

  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  const rawPromoId = request.nextUrl.searchParams.get('promoId');

  // Load all config from DB
  const [promotions, allProjectsConfig, allStatus] = await Promise.all([
    getAllPromotions(),
    getAllProjects(),
    getAllPromoStatus(),
  ]);

  // Build promoStatus map
  const promoStatusMap: Record<string, string | { rust?: string; java?: string }> = {};
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
    await fetch('/api/timeline_project');

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

    const results: { promoId: string; updated: number; errors: string[] }[] = [];

    for (const id of promoIds) {
      const result = await updatePromoStudents(id, promotions, allProjectsConfig, promoStatusMap);
      results.push({ promoId: id, ...result });
    }

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
