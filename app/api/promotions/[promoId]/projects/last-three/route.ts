import { NextResponse } from 'next/server';

import { displayAgenda } from '@/lib/timeline';
import { getStudents } from '@/lib/db/services/students';
import { getAllPromotions } from '@/lib/config/promotions';
import { getAllProjects } from '@/lib/config/projects';
import { getHolidaysConfig } from '@/lib/config/holidays';

// Language order in the curriculum
const LANGUAGE_ORDER = ['Golang', 'Javascript', 'Rust'];

export async function GET(
  req: Request,
  context: { params: Promise<{ promoId: string }> }
) {
  try {
    const { promoId } = await context.params;

    const [promos, allProjects, holidays] = await Promise.all([
      getAllPromotions(),
      getAllProjects(),
      getHolidaysConfig(),
    ]);

    const promo = promos.find((p) => String(p.eventId) === promoId);

    if (!promo) {
      return NextResponse.json(
        { success: false, message: 'Promotion not found' },
        { status: 404 }
      );
    }

    function getAllProjectsFlat() {
      const flat: any[] = [];
      for (const lang of LANGUAGE_ORDER) {
        const projects = (allProjects as any)[lang] || [];
        projects.forEach((proj: any, idx: number) => {
          flat.push({ ...proj, language: lang, index: idx });
        });
      }
      return flat;
    }

    let students: any[] = [];
    try {
      const pageSize = 20;
      let offset = 0;
      let iterations = 0;
      const maxIterations = 100;

      while (true) {
        const studentsUrl = new URL(
          `/api/get_students?promo=${encodeURIComponent(String(promo.key))}&offset=${offset}`,
          req.url
        ).toString();

        const studentsRes = await fetch(studentsUrl);
        if (!studentsRes.ok) {
          console.warn('get_students returned', studentsRes.status);
          break;
        }

        const data = await studentsRes.json();
        const page = data?.students ?? [];
        students.push(...page);

        if (page.length < pageSize) break;

        offset += pageSize;
        iterations++;
        if (iterations >= maxIterations) {
          console.warn('Reached max iterations while fetching students');
          break;
        }
      }
    } catch (fetchErr) {
      console.error('Error fetching students:', fetchErr);
    }

    const allProjectsFlat = getAllProjectsFlat();

    const result = await displayAgenda(promo, allProjects, holidays);
    const currentProjectName = result.currentProject;

    const currentProjectFlat = allProjectsFlat.find((p) => p.name === currentProjectName);

    let currentLanguage: string;
    let currentIndexInLanguage: number;
    let projectsInCurrentLanguage: any[];

    if (!currentProjectFlat || currentProjectName === 'Fin') {
      const rustProjects = (allProjects as any)['Rust'];
      currentLanguage = 'Rust';
      projectsInCurrentLanguage = rustProjects;
      currentIndexInLanguage = rustProjects.length - 1;
      console.log(`Promo ${promo.key} has finished or unknown project, using last Rust project`);
    } else {
      currentLanguage = currentProjectFlat.language;
      projectsInCurrentLanguage = (allProjects as any)[currentLanguage];
      currentIndexInLanguage = projectsInCurrentLanguage.findIndex(
        (p: any) => p.name === currentProjectName
      );
    }

    let lastThree: any[] = [];

    for (let i = Math.max(0, currentIndexInLanguage - 2); i <= currentIndexInLanguage; i++) {
      if (projectsInCurrentLanguage[i]) {
        lastThree.push(projectsInCurrentLanguage[i]);
      }
    }

    if (lastThree.length < 3) {
      const currentLangIndex = LANGUAGE_ORDER.indexOf(currentLanguage);
      if (currentLangIndex > 0) {
        const previousLanguage = LANGUAGE_ORDER[currentLangIndex - 1];
        const previousProjects = (allProjects as any)[previousLanguage];
        const needed = 3 - lastThree.length;
        const startIdx = Math.max(0, previousProjects.length - needed);
        const previousToAdd = previousProjects.slice(startIdx);
        lastThree = [...previousToAdd, ...lastThree];
      }
    }

    const totalStudents = students.length;
    const projectsWithStats = lastThree.map((proj: any) => {
      const name = proj.name;
      let projectLanguage: string | null = null;
      let projectIndexInLanguage = -1;

      for (const lang of LANGUAGE_ORDER) {
        const langProjects = (allProjects as any)[lang];
        const idx = langProjects.findIndex((p: any) => p.name === name);
        if (idx >= 0) {
          projectLanguage = lang;
          projectIndexInLanguage = idx;
          break;
        }
      }

      const count = students.filter((s: any) => {
        if (!projectLanguage) return false;

        const studentProjectInTrack =
          projectLanguage === 'Golang' ? s.golang_project :
          projectLanguage === 'Javascript' ? s.javascript_project :
          projectLanguage === 'Rust' ? s.rust_project :
          null;

        if (!studentProjectInTrack) return false;

        const trackCompleted =
          projectLanguage === 'Golang' ? s.golang_completed :
          projectLanguage === 'Javascript' ? s.javascript_completed :
          projectLanguage === 'Rust' ? s.rust_completed :
          false;

        if (trackCompleted) return true;

        const langProjects = (allProjects as any)[projectLanguage];
        const studentProjectIndex = langProjects.findIndex((p: any) => p.name === studentProjectInTrack);

        if (studentProjectIndex > projectIndexInLanguage && studentProjectIndex >= 0) {
          return true;
        }

        if (studentProjectInTrack === name && s.progress_status === 'finished') {
          return true;
        }

        return false;
      }).length;

      const percentage =
        totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
      return { ...proj, count, percentage };
    });

    const currentGlobalIndex = allProjectsFlat.findIndex((p) => p.name === currentProjectName);
    const aheadCount = students.filter((s: any) => {
      const idx = allProjectsFlat.findIndex(
        (p) => p.name === s.actual_project_name
      );
      return idx > currentGlobalIndex && idx >= 0;
    }).length;
    const aheadPercentage =
      totalStudents > 0 ? Math.round((aheadCount / totalStudents) * 100) : 0;

    return NextResponse.json({
      success: true,
      promotionName: result.promotionName,
      language: currentLanguage,
      currentProject: currentProjectName,
      projects: projectsWithStats,
      meta: { totalStudents, aheadCount, aheadPercentage }
    });
  } catch (err: any) {
    console.error('API ERROR:', err);

    return NextResponse.json(
      { success: false, error: 'Internal error', details: String(err) },
      { status: 500 }
    );
  }
}
