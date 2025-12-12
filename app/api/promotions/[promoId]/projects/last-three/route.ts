import { NextResponse } from 'next/server';

import { displayAgenda } from '@/lib/timeline';
import { getStudents } from '@/lib/db/services/students';

import allProjects from '../../../../../../config/projects.json';
import holidays from '../../../../../../config/holidays.json';
import promos from '../../../../../../config/promoConfig.json';
import { SelectStudent } from '@/lib/db/schema';

export async function GET(
  req: Request,
  context: { params: Promise<{ promoId: string }> }
) {
  try {
    // Next.js 15 : params est une Promise → il faut await
    const { promoId } = await context.params;

    const promo = (promos as any[]).find((p) => String(p.eventId) === promoId);

    if (!promo) {
      return NextResponse.json(
        { success: false, message: 'Promotion not found' },
        { status: 404 }
      );
    }

    let students: any[] = [];
    try {
      const pageSize = 20;
      let offset = 0;
      let iterations = 0;
      const maxIterations = 100; // safety cap to avoid infinite loops

      while (true) {
        const studentsUrl = new URL(
          `/api/get_students?promo=${encodeURIComponent(String((promo as any).key))}&offset=${offset}`,
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

        if (page.length < pageSize) break; // last page reached

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

    // Appel de ton displayAgenda existant
    const result = await displayAgenda(promo, allProjects, holidays);
    const currentProjectName = result.currentProject;

    // Trouver le langage correspondant au projet actuel
    let languageKey: keyof typeof allProjects | null = null;
    let projectList: any[] = [];

    for (const key of Object.keys(allProjects)) {
      const list = allProjects[key as keyof typeof allProjects];
      if (list.some((p) => p.name === currentProjectName)) {
        languageKey = key as keyof typeof allProjects;
        projectList = list;
        break;
      }
    }

    if (!languageKey) {
      return NextResponse.json(
        { success: false, message: 'Project not found in any language path' },
        { status: 400 }
      );
    }

    // Récupérer l’index du projet actuel
    const currentIndex = projectList.findIndex(
      (p) => p.name === currentProjectName
    );

    // Extraire les 3 projets : actuel + deux précédents
    const lastThree = [
      projectList[currentIndex - 2],
      projectList[currentIndex - 1],
      projectList[currentIndex]
    ].filter(Boolean);

    // Calculate distribution of students across the three projects
    const totalStudents = students.length;
    const projectsWithStats = lastThree.map((proj: any) => {
      const name = proj.name;
      const count = students.filter(
        (s: any) => s.actual_project_name === name
      ).length;
      const percentage =
        totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
      return { ...proj, count, percentage };
    });

    // Calculate students \"en avance\" (assigned to a project after the current one)
    const aheadCount = students.filter((s: any) => {
      const idx = projectList.findIndex(
        (p) => p.name === s.actual_project_name
      );
      return idx > currentIndex;
    }).length;
    const aheadPercentage =
      totalStudents > 0 ? Math.round((aheadCount / totalStudents) * 100) : 0;

    return NextResponse.json({
      success: true,
      promotionName: result.promotionName,
      language: languageKey,
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
