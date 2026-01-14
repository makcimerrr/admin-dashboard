'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import LastUpdate from '@/components/last-update';
import promotions from '../config/promoConfig.json';
import promoStatus from '../config/promoStatus.json';
import allProjects from '../config/projects.json' assert { type: 'json' };

interface UpdateProps {
  eventId: string;
  onUpdate: () => void;
}

interface Promotion {
  eventId: string; // Utilisation de l'eventId
  key: string;
  title: string;
  dates: { start: string; end: string };
}

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

const allProjectsTyped = allProjects as AllProjects;

const PromotionProgress = ({ eventId, onUpdate }: UpdateProps) => {
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDots, setLoadingDots] = useState<string>('.');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null); // State pour la dernière mise à jour
  const [allUpdate, setAllUpdate] = useState<string | null>(null);

  const [updates, setUpdates] = useState<
    { last_update: string; event_id: string }[]
  >([]);

  const projectsList: any[] = [];

  async function fetchProjets() {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Unable to fetch projects');
      }

      const data = await response.json();
      Object.keys(data).forEach((category) => {
        // Si la catégorie existe et a des projets, ajouter leurs noms à projectsList
        if (Array.isArray(data[category])) {
          projectsList.push(...data[category].map((project) => project.name));
        }
      });
    } catch (error) {
      toast.error('Impossible de récupérer les projets.');
      throw error; // Assure de sortir en cas d'erreur
    }
  }

  // Récupérer dynamiquement les promotions via l'API
  const fetchPromotions = async (): Promise<string[]> => {
    try {
      const response = await fetch('/api/promos'); // Chemin API pour récupérer les promotions
      if (!response.ok) {
        throw new Error('Unable to fetch promotions');
      }
      const data = await response.json();
      const promoIds = data.promos.map((promo: Promotion) => promo.eventId);
      return promoIds; // Retourne les IDs pour une utilisation immédiate
    } catch (error) {
      toast.error('Impossible de récupérer les promotions.');
      return [];
    }
  };

  //const promoEventIds = ['32', '148', '216', '303'];
  const cache = new Map<
    string,
    { lastActiveProject: string; status: string; delayLevel: string }
  >();

  // Animation des trois petits points
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingDots((dots) => (dots.length < 3 ? dots + '.' : '.'));
      }, 500); // Intervalle de 500ms
      return () => clearInterval(interval);
    }
  }, [loading]);

  const findLastTouchedProject = (userProjects: any[]) => {
    if (!userProjects || userProjects.length === 0) {
      return { name: null, status: 'without group' };
    }
    const lastProject = userProjects[userProjects.length - 1];
    return {
      name: lastProject.projectName,
      status: lastProject.projectStatus
    };
  };

  // Fonction pour trouver l'index global d'un projet
  const findProjectIndex = (allProjects: any, projectName: string): number => {
    let globalIndex = 0;
    for (const track in allProjects) {
      const trackProjects = allProjects[track];
      for (const project of trackProjects) {
        if (project.name === projectName) {
          return globalIndex;
        }
        globalIndex++;
      }
    }
    return -1;
  };

  // Fonction pour trouver dans quelle track se trouve un projet
  const findProjectTrack = (allProjects: any, projectName: string): string | null => {
    for (const track in allProjects) {
      const trackProjects = allProjects[track];
      for (const project of trackProjects) {
        if (project.name.toLowerCase() === projectName.toLowerCase()) {
          return track;
        }
      }
    }
    return null;
  };

  // Fonction pour trouver le dernier projet actif parmi tous les troncs
  const findLastActiveProject = (
    commonProjects: { [key: string]: { name: string | null, status: string | null } },
    allProjects: AllProjects
  ): { name: string | null, status: string | null } => {
    let lastProject: { name: string | null, status: string | null, index: number } = {
      name: null,
      status: 'without group',
      index: -1
    };

    // Parcourir tous les troncs pour trouver le projet le plus avancé
    for (const track of ['Golang', 'Javascript', 'Rust', 'Java'] as const) {
      const project = commonProjects[track];
      if (!project || !project.name || project.status === 'not_chosen') {
        continue;
      }

      // Trouver l'index global du projet
      const projectIndex = findProjectIndex(allProjects, project.name);

      // Si ce projet est plus avancé que le dernier trouvé, le garder
      if (projectIndex > lastProject.index) {
        lastProject = {
          name: project.name,
          status: project.status,
          index: projectIndex
        };
      }
    }

    return { name: lastProject.name, status: lastProject.status };
  };

  // Fonction utilitaire pour trouver le prochain projet actif
  const findNextActiveProject = (
    projectsList: string[],
    userProjects: any[]
  ) => {
    let lastFinishedProject: string | null = null;
    let activeProject: string | null = null;
    let status = 'without group';

    for (const projectName of projectsList) {
      const project = userProjects.find(
        (p) => p.projectName.toLowerCase() === projectName.toLowerCase()
      );

      if (project?.projectStatus === 'finished') {
        lastFinishedProject = projectName;
      } else if (!activeProject) {
        activeProject = projectName;
        status = project?.projectStatus || 'without group';
      }
    }

    // Vérification si le dernier projet de la liste est celui de l'étudiant et qu'il est "finished"
    if (lastFinishedProject === projectsList[projectsList.length - 1]) {
      return { activeProject: lastFinishedProject, status: 'finished' };
    }

    return { activeProject: activeProject || 'Spécialité', status };
  };

  // Vérifie si la mise à jour est nécessaire
  const shouldUpdate = (
    login: string,
    currentActiveProject: string,
    status: string,
    delayLevel: string
  ) => {
    const cached = cache.get(login);
    if (
      cached &&
      cached.lastActiveProject === currentActiveProject &&
      cached.status === status &&
      cached.delayLevel === delayLevel
    ) {
      return false;
    }
    cache.set(login, {
      lastActiveProject: currentActiveProject,
      status,
      delayLevel
    });
    return true;
  };

  const findActiveProjectsByTrack = (
    allProjects: AllProjects,
    userProjects: any[]
  ) => {
    const commonProjects: { [key: string]: { name: string | null, status: string | null } } = {};
    const lastProjectsFinished: { [key: string]: boolean } = {};

    for (const track of Object.keys(allProjects) as Array<keyof AllProjects>) {
      const trackProjects = allProjects[track];
      let studentActiveProject: { name: string | null, status: string | null } = { name: null, status: null };
      let firstUnfinishedProject: { name: string | null, status: string | null } = { name: null, status: 'without group' };
      let lastFinishedProject: { name: string | null, status: string | null } = { name: null, status: 'finished' };
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
              studentActiveProject = { name: project.name, status: userProject.projectStatus };
            }
            allDone = false;
          }
        } else {
          if (!firstUnfinishedProject.name) {
            firstUnfinishedProject = { name: project.name, status: 'without group' };
          }
          allDone = false;
        }
      }

      if (allDone) {
        commonProjects[track] = lastFinishedProject;
        lastProjectsFinished[track] = true;
      } else {
        commonProjects[track] = studentActiveProject.name ? studentActiveProject : firstUnfinishedProject;
        lastProjectsFinished[track] = false;
      }
    }

    return { commonProjects, lastProjectsFinished };
  };

  const fetchPromotionProgress = async (eventId: string) => {
    console.log('Début de fetchPromotionProgress pour eventId:', eventId);
    setLoading(true);
    let currentStudentCount = 0;

    // Trouver la promotion liée à l'eventId
    const promotion = promotions.find(
      (promo) => promo.eventId === Number(eventId)
    );
    console.log('Promotion trouvée:', promotion);
    if (!promotion) return;

    const promotionTitle = promotion.key;
    if (!promotionTitle || !(promotionTitle in promoStatus)) return;

    // Projet lié à la promotion
    let promoProject = promoStatus[promotionTitle as keyof typeof promoStatus];
    if (typeof promoProject === 'object' && promoProject !== null) {
      promoProject = (promoProject as { rust?: string }).rust || '';
    }
    
    console.log('Projet de la promo:', promoProject);

    try {
      const response = await fetch(
        `https://api-zone01-rouen.deno.dev/api/v1/promotions/${eventId}/students`
        /*`http://localhost:8000/api/v1/promotions/${eventId}/students`*/
      );
      if (!response.ok) {
        throw new Error(
          `Erreur lors de la récupération des données pour l'événement ${eventId}`
        );
      }
      const data = await response.json();
      console.log('Données reçues de l\'API:', data);

      const userProjects: { [key: string]: any[] } = {};
      data.progress.forEach((entry: any) => {
        const { login } = entry.user;
        const { name: projectName } = entry.object;
        const { status: projectStatus, id: groupId } = entry.group;

        if (!userProjects[login]) {
          userProjects[login] = [];
        }

        userProjects[login].push({ projectName, projectStatus, groupId });
      });

      currentStudentCount = Object.keys(userProjects).length;
      console.log('Nombre d\'étudiants trouvés:', currentStudentCount);

      setTotalStudents((prev) => (prev || 0) + currentStudentCount);

      for (const login in userProjects) {
        console.log(`Processing student: ${login}`);
        console.log('User projects data from API:', userProjects[login]);

        const { commonProjects, lastProjectsFinished } =
          findActiveProjectsByTrack(allProjectsTyped, userProjects[login]);

        // Determine if Rust or Java tracks are active
        const firstRustProject = allProjectsTyped.Rust[0]?.name;
        const firstJavaProject = allProjectsTyped.Java[0]?.name;

        const isRustActive = commonProjects['Rust']?.name !== firstRustProject || commonProjects['Rust']?.status !== 'without group';
        const isJavaActive = commonProjects['Java']?.name !== firstJavaProject || commonProjects['Java']?.status !== 'without group';

        if (isRustActive && !isJavaActive) {
            commonProjects['Java'] = { name: null, status: 'not_chosen' };
        } else if (isJavaActive && !isRustActive) {
            commonProjects['Rust'] = { name: null, status: 'not_chosen' };
        } else if (!isRustActive && !isJavaActive) {
            // Aucun des deux tracks n'est actif, l'étudiant n'a pas encore choisi
            commonProjects['Rust'] = { name: null, status: 'not_chosen' };
            commonProjects['Java'] = { name: null, status: 'not_chosen' };
        }

        console.log('Common projects:', commonProjects);
        console.log('Last projects finished:', lastProjectsFinished);

        const { activeProject: curriculumProject } = findNextActiveProject(
          projectsList,
          userProjects[login]
        );

        // Utiliser le dernier projet actif de tous les troncs (ce qui prime)
        const { name: actualProjectName, status: actualProjectStatus } = findLastActiveProject(commonProjects, allProjectsTyped);

        let delayLevel = 'bien';

        try {
          // Récupérer le projet de la promo (peut être un string ou un objet avec rust/java)
          let currentPromoProject = promoStatus[promotionTitle as keyof typeof promoStatus];
          let isMultiTrack = false;
          let promoRustProject = null;
          let promoJavaProject = null;

          // Vérifier si c'est un multi-track (rust/java)
          if (typeof currentPromoProject === 'object' && currentPromoProject !== null) {
            isMultiTrack = true;
            promoRustProject = (currentPromoProject as { rust?: string }).rust;
            promoJavaProject = (currentPromoProject as { java?: string }).java;
          }

          // Vérifier si l'étudiant a terminé tous les troncs
          const allTracksCompleted =
            lastProjectsFinished['Golang'] &&
            lastProjectsFinished['Javascript'] &&
            (lastProjectsFinished['Rust'] || lastProjectsFinished['Java']);

          if (typeof currentPromoProject === 'string' && currentPromoProject.toLowerCase() === 'fin') {
            // Timeline dit "Fin"
            if (allTracksCompleted) {
              delayLevel = 'Validé';
            } else {
              delayLevel = 'Non Validé';
            }
          } else if (allTracksCompleted) {
            // Tous les troncs terminés mais timeline != "Fin"
            delayLevel = 'spécialité';
          } else if (typeof currentPromoProject === 'string' && currentPromoProject.toLowerCase() === 'spécialité') {
            delayLevel = 'spécialité';
          } else if (isMultiTrack) {
            // Multi-track : vérifier dans quelle track l'étudiant est actif
            const studentRustProject = commonProjects['Rust']?.name;
            const studentJavaProject = commonProjects['Java']?.name;
            const studentRustStatus = commonProjects['Rust']?.status;
            const studentJavaStatus = commonProjects['Java']?.status;

            // Déterminer quelle track l'étudiant a choisie
            let studentTrack: 'Rust' | 'Java' | null = null;
            let studentProject: string | null = null;
            let promoProject: string | null = null;

            if (studentRustStatus !== 'not_chosen' && studentRustStatus !== 'without group' && studentRustProject) {
              studentTrack = 'Rust';
              studentProject = studentRustProject;
              promoProject = promoRustProject;
            } else if (studentJavaStatus !== 'not_chosen' && studentJavaStatus !== 'without group' && studentJavaProject) {
              studentTrack = 'Java';
              studentProject = studentJavaProject;
              promoProject = promoJavaProject;
            }

            if (studentTrack && studentProject && promoProject) {
              // L'étudiant a choisi une track, comparer dans cette track
              if (studentProject.toLowerCase() === promoProject.toLowerCase()) {
                delayLevel = 'bien';
              } else {
                // Comparer les indices dans cette track spécifique
                const promoIndex = findProjectIndex(allProjects, promoProject);
                const studentIndex = findProjectIndex(allProjects, studentProject);

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
              // L'étudiant n'a pas encore commencé Rust/Java
              delayLevel = 'en retard';
            }
          } else if (typeof currentPromoProject === 'string') {
            // Single track : identifier à quelle track appartient le projet de la promo
            const promoProjectTrack = findProjectTrack(allProjects, currentPromoProject);

            if (promoProjectTrack) {
              // Récupérer le projet de l'étudiant dans cette track
              const studentProjectInTrack = commonProjects[promoProjectTrack]?.name;

              // Vérifier si l'étudiant est sur le bon projet dans cette track (ce qui prime)
              if (studentProjectInTrack?.toLowerCase() === currentPromoProject.toLowerCase()) {
                delayLevel = 'bien';
              } else {
                // Sinon, comparer les indices dans cette track
                const promoIndex = findProjectIndex(allProjects, currentPromoProject);
                const studentIndex = studentProjectInTrack ? findProjectIndex(allProjects, studentProjectInTrack) : -1;

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
        } catch (err) {
          console.error(
            `Erreur lors du calcul du delayLevel pour ${login}:`,
            err
          );
          delayLevel = 'bien';
        }

        if (shouldUpdate(login, actualProjectName, actualProjectStatus, delayLevel)) {
          const payload = {
            login,
            project_name: actualProjectName,
            project_status: actualProjectStatus,
            delay_level: delayLevel,
            last_projects_finished: lastProjectsFinished,
            common_projects: commonProjects,
            promo_name: promotionTitle
          };
          console.log('Update payload:', payload);

          try {
            console.log(`Mise à jour requise pour ${login}, envoi à l'API...`);
            await fetch('/api/update_project', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            console.log(`Mise à jour réussie pour ${login}`);
          } catch (error) {
            toast.error(`Erreur de mise à jour du projet pour ${login}.`);
            console.error(`Erreur lors de la mise à jour du projet pour ${login}:`, error);
            throw error;
          }
        }
      }
    } catch (error) {
      toast.error(
        `Erreur lors de la récupération des données pour l'événement ${eventId}. Voici l'erreur: ${error}`
      );
      console.error('Erreur dans fetchPromotionProgress:', error);
      throw error;
    }
  };

  const handleUpdate = async () => {
    setLoading(true); // Indique que le chargement commence

    try {
      const response = await fetch('/api/timeline_project');
      if (!response.ok) {
        toast.error('Erreur lors de la mise à jour du statut des promos.');
        setLoading(false);
        return;
      }

      await fetchProjets(); // Récupère les projets

      let promoIds = [eventId]; // Utilisation de eventId par défaut

      // Si eventId est 'all', récupérer toutes les promotions
      if (eventId === 'all') {
        promoIds = await fetchPromotions(); // Récupère les IDs des promotions
      }

      const results = await Promise.allSettled(
        promoIds.map((promoId) =>
          fetchPromotionProgress(promoId).catch((error) => {
            console.error(
              `Erreur détectée dans handleUpdate pour la promotion ${promoId}:`,
              error
            );
            throw error; // Propager l'erreur à Promise.allSettled
          })
        )
      );

      // Analyse des résultats
      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      if (failed.length > 0) {
        toast.error(
          `${failed.length} mise(s) à jour ont échoué. Veuillez vérifier.`
        );
      }

      // Empêche de continuer si au moins une erreur a eu lieu
      if (failed.length > 0) {
        setLoading(false);
        return; // Arrête l'exécution ici en cas d'erreurs
      }

      if (succeeded.length > 0) {
        toast.success(
          `${succeeded.length} mise(s) à jour ont été effectuées avec succès.`
        );
      }

      // Créer l'update dans la base de données si tout s'est bien passé
      const updateMessage =
        eventId === 'all'
          ? 'Mise à jour de toutes les promotions.'
          : `Mise à jour pour la promo ${eventId}`;

      await fetch('/api/last_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, message: updateMessage })
      });

      toast.success('La mise à jour a été effectuée avec succès !');
      onUpdate(); // Appel de la fonction onUpdate pour rafraîchir les données des étudiants
      await refreshLastUpdate(); // Rafraîchir la dernière mise à jour
      setTotalStudents(null);
      setLoading(false);
    } catch (error) {
      // Si une erreur survient pendant l'appel principal, la notification toast apparaîtra ici
      setLoading(false);
      toast.error(
        `Impossible de mettre à jour les promotions. Erreur liée à l'événement ${eventId}`
      );
    }
  };
  // Fonction pour mettre à jour la dernière mise à jour
  const refreshLastUpdate = async () => {
    try {
      const response = await fetch('/api/last_update');
      if (!response.ok) {
        throw new Error('Impossible de récupérer les mises à jour');
      }
      const data = await response.json();
      // Filtrage des résultats pour trouver celui correspondant à l'eventId
      const filteredUpdate = data.find(
        (update: { event_id: string }) => update.event_id === eventId
      );

      if (filteredUpdate) {
        setLastUpdate(filteredUpdate.last_update); // Met à jour la dernière mise à jour trouvée
      }

      const allUpdate = data.find(
        (update: { event_id: string }) => update.event_id === 'all'
      );

      setAllUpdate(allUpdate.last_update);
    } catch (error) {
      toast.error('Impossible de récupérer les données de mise à jour.');
    }
  };

  useEffect(() => {
    refreshLastUpdate().then((r) => r);
  }, [eventId]);

  return (
    <div className="flex items-center space-x-4">
      <Button
        size="sm"
        className="h-8 gap-1"
        onClick={handleUpdate}
        disabled={loading}
      >
        {loading ? (
          <span className="loading-text">
            Chargement de {totalStudents ?? ''} étudiants
            <span className="wave">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </span>
        ) : (
          'Exécuter'
        )}
      </Button>
      {/* Affichage de la mise à jour à côté du bouton */}
      <div className="text-sm text-gray-600">
        <LastUpdate
          lastUpdate={lastUpdate}
          eventId={eventId}
          allUpdate={allUpdate}
        />
      </div>
      <style jsx>{`
        .loading-text {
          display: flex;
          align-items: center;
        }

        .wave {
          display: flex;
          justify-content: space-between;
          width: 1.5rem;
          margin-left: 0.5rem;
        }

        .wave span {
          display: inline-block;
          font-size: 1.5rem;
          animation: wave 1.5s infinite;
        }

        .wave span:nth-child(1) {
          animation-delay: 0s;
        }

        .wave span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .wave span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes wave {
          0%,
          60%,
          100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};
export default PromotionProgress;
