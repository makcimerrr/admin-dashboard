import { NextResponse } from 'next/server';

import { displayAgenda } from '@/lib/timeline';
import { fetchStudentsForPromo } from '@/lib/db/services/promotions';

import allProjects from '../../../../../../config/projects.json';
import holidays from '../../../../../../config/holidays.json';
import promos from '../../../../../../config/promoConfig.json';

// Language order in the curriculum
const LANGUAGE_ORDER = ['Golang', 'Javascript', 'Rust'];

// Get all projects across all languages with their language info
function getAllProjectsFlat() {
  const flat: any[] = [];
  for (const lang of LANGUAGE_ORDER) {
    const projects = allProjects[lang as keyof typeof allProjects] || [];
    projects.forEach((proj, idx) => {
      flat.push({ ...proj, language: lang, index: idx });
    });
  }
  return flat;
}

export async function GET(req: Request) {
  try {
    const allProjectsFlat = getAllProjectsFlat();

    // Process all promos in parallel
    // Process all promos in parallel
    const allPromosData = await Promise.all(
      (promos as any[]).map(async (promo) => {
        try {
          // Fetch students directly from DB instead of HTTP
          const students = await fetchStudentsForPromo(promo.key);

          const result = await displayAgenda(promo, allProjects, holidays);
          const currentProjectName = result.currentProject;

          // Find current project in the flat list
          const currentProjectFlat = allProjectsFlat.find(
            (p) => p.name === currentProjectName
          );

          let currentLanguage: string;
          let currentIndexInLanguage: number;
          let projectsInCurrentLanguage: any[];

          // Handle special case where currentProject is "Fin" or not found
          if (!currentProjectFlat || currentProjectName === 'Fin') {
            // Use the last project in Rust as the current project
            const rustProjects = allProjects['Rust'];
            currentLanguage = 'Rust';
            projectsInCurrentLanguage = rustProjects;
            currentIndexInLanguage = rustProjects.length - 1;
            console.log(
              `Promo ${promo.key} has finished or unknown project, using last Rust project`
            );
          } else {
            currentLanguage = currentProjectFlat.language;
            projectsInCurrentLanguage =
              allProjects[currentLanguage as keyof typeof allProjects];
            currentIndexInLanguage = projectsInCurrentLanguage.findIndex(
              (p) => p.name === currentProjectName
            );
          }

          // Get last 3 projects, potentially spanning multiple languages
          let lastThree: any[] = [];

          // Try to get projects from current language first
          for (
            let i = Math.max(0, currentIndexInLanguage - 2);
            i <= currentIndexInLanguage;
            i++
          ) {
            if (projectsInCurrentLanguage[i]) {
              lastThree.push(projectsInCurrentLanguage[i]);
            }
          }

          // If we don't have 3 projects yet, get from previous language
          if (lastThree.length < 3) {
            const currentLangIndex = LANGUAGE_ORDER.indexOf(currentLanguage);
            if (currentLangIndex > 0) {
              const previousLanguage = LANGUAGE_ORDER[currentLangIndex - 1];
              const previousProjects =
                allProjects[previousLanguage as keyof typeof allProjects];

              // Add projects from the end of the previous language
              const needed = 3 - lastThree.length;
              const startIdx = Math.max(0, previousProjects.length - needed);
              const previousToAdd = previousProjects.slice(startIdx);
              lastThree = [...previousToAdd, ...lastThree];
            }
          }

          const totalStudents = students.length;
          const projectsWithStats = lastThree.map((proj: any) => {
            const name = proj.name;

            // Find which language/track this project belongs to
            let projectLanguage: string | null = null;
            let projectIndexInLanguage = -1;

            for (const lang of LANGUAGE_ORDER) {
              const langProjects =
                allProjects[lang as keyof typeof allProjects];
              const idx = langProjects.findIndex((p) => p.name === name);
              if (idx >= 0) {
                projectLanguage = lang;
                projectIndexInLanguage = idx;
                break;
              }
            }

            // Count students who have finished this project:
            // Students must be on a project AFTER this one IN THE SAME TRACK/LANGUAGE
            const count = students.filter((s: any) => {
              if (!projectLanguage) return false;

              // Get student's current project in this language track
              const studentProjectInTrack =
                projectLanguage === 'Golang'
                  ? s.golang_project
                  : projectLanguage === 'Javascript'
                    ? s.javascript_project
                    : projectLanguage === 'Rust'
                      ? s.rust_project
                      : null;

              if (!studentProjectInTrack) return false;

              // Check if student completed this entire track
              const trackCompleted =
                projectLanguage === 'Golang'
                  ? s.golang_completed
                  : projectLanguage === 'Javascript'
                    ? s.javascript_completed
                    : projectLanguage === 'Rust'
                      ? s.rust_completed
                      : false;

              if (trackCompleted) {
                return true; // Student finished all projects in this track
              }

              // Find student's project index in this track
              const langProjects =
                allProjects[projectLanguage as keyof typeof allProjects];
              const studentProjectIndex = langProjects.findIndex(
                (p) => p.name === studentProjectInTrack
              );

              // Student is on a project after this one in the same track
              if (
                studentProjectIndex > projectIndexInLanguage &&
                studentProjectIndex >= 0
              ) {
                return true;
              }

              // Student is on this exact project and has finished it
              if (
                studentProjectInTrack === name &&
                s.progress_status === 'finished'
              ) {
                return true;
              }

              return false;
            }).length;

            const percentage =
              totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
            return { ...proj, count, percentage };
          });

          // Calculate students "en avance" (on a project after the current one)
          const currentGlobalIndex = allProjectsFlat.findIndex(
            (p) => p.name === currentProjectName
          );
          const aheadCount = students.filter((s: any) => {
            const idx = allProjectsFlat.findIndex(
              (p) => p.name === s.actual_project_name
            );
            return idx > currentGlobalIndex && idx >= 0;
          }).length;
          const aheadPercentage =
            totalStudents > 0
              ? Math.round((aheadCount / totalStudents) * 100)
              : 0;

          return {
            promoId: promo.eventId,
            promoKey: promo.key,
            promotionName: result.promotionName,
            language: currentLanguage,
            currentProject: currentProjectName,
            projects: projectsWithStats,
            meta: { totalStudents, aheadCount, aheadPercentage }
          };
        } catch (promoErr) {
          console.error(`Error processing promo ${promo.key}:`, promoErr);
          // Return promo with error state instead of skipping
          return {
            promoId: promo.eventId,
            promoKey: promo.key,
            promotionName: promo.title,
            language: null,
            currentProject: null,
            projects: [],
            meta: { totalStudents: 0, aheadCount: 0, aheadPercentage: 0 },
            error: String(promoErr)
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      promotions: allPromosData
    });
  } catch (err: any) {
    console.error('API ERROR:', err);

    return NextResponse.json(
      { success: false, error: 'Internal error', details: String(err) },
      { status: 500 }
    );
  }
}
