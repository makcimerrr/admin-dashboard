'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import LastUpdate from '@/components/last-update';
import promotions from '../config/promoConfig.json';
import promoStatus from '../config/promoStatus.json';
import allProjects from '../config/projects.json';

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
    { lastActiveProject: string; status: string }
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
      return { activeProject: lastFinishedProject, status: 'spécialité' };
    }

    return { activeProject: activeProject || 'Spécialité', status };
  };

  // Vérifie si la mise à jour est nécessaire
  const shouldUpdate = (
    login: string,
    currentActiveProject: string,
    status: string
  ) => {
    const cached = cache.get(login);
    if (
      cached &&
      cached.lastActiveProject === currentActiveProject &&
      cached.status === status
    ) {
      return false;
    }
    cache.set(login, { lastActiveProject: currentActiveProject, status });
    return true;
  };

  const fetchPromotionProgress = async (eventId: string) => {
    setLoading(true);
    let currentStudentCount = 0; // Compteur pour les étudiants dans cette promo

    // Trouver la promotion liée à l'eventId
    const promotion = promotions.find(
      (promo) => promo.eventId === Number(eventId)
    );
    if (!promotion) return;

    const promotionTitle = promotion.key;
    if (!promotionTitle || !(promotionTitle in promoStatus)) return;

    // Projet lié à la promotion
    const promoProject =
      promoStatus[promotionTitle as keyof typeof promoStatus];

    try {
      const response = await fetch(
        `https://api-01-edu.vercel.app/promotion-progress/${eventId}`
      );
      if (!response.ok) {
        throw new Error(
          `Erreur lors de la récupération des données pour l'événement ${eventId}`
        );
      }
      const data = await response.json();

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

      // Met à jour le nombre d'étudiants
      setTotalStudents((prev) => (prev || 0) + currentStudentCount);

      for (const login in userProjects) {
        const { activeProject, status } = findNextActiveProject(
          projectsList,
          userProjects[login]
        );

        let delayLevel = '';

        try {
          if (promoProject.toLowerCase() === 'fin') {
            if (activeProject.toLowerCase() === 'spécialité') {
              delayLevel = 'bien';
            } else {
              delayLevel = 'en retard';
            }
          } else if (activeProject.toLowerCase() == 'spécialité') {
            if (promoProject.toLowerCase() === 'spécialité') {
              delayLevel = 'bien';
            } else if (promoProject.toLowerCase() === 'fin') {
              delayLevel = 'bien';
            } else {
              delayLevel = 'en avance';
            }
          } else {
            // Logic normale pour calculer le delayLevel pour les projets autres que 'Fin'
            const promoIndex = findProjectIndex(allProjects, promoProject); // Trouve l'indice du projet promo
            const studentIndex = findProjectIndex(allProjects, activeProject); // Trouve l'indice du projet étudiant

            if (studentIndex > promoIndex) {
              delayLevel = 'en avance';
            } else if (studentIndex < promoIndex) {
              delayLevel = 'en retard';
            } else {
              delayLevel = 'bien';
            }
          }
        } catch (err) {
          console.error(
            `Erreur lors du calcul du delayLevel pour ${login}:`,
            err
          );
          delayLevel = 'inconnu'; // En cas d'erreur, retourner "inconnu"
        }

        if (shouldUpdate(login, activeProject, status)) {
          try {
            await fetch('/api/update_project', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                login,
                project_name: activeProject,
                project_status: status,
                delay_level: delayLevel // Valeur brut, a modifier
              })
            });
          } catch (error) {
            toast.error(`Erreur de mise à jour du projet pour ${login}.`);
            throw error;
          }
        }
      }
    } catch (error) {
      toast.error(
        `Erreur lors de la récupération des données pour l'événement ${eventId}. Voici l'erreur: ${error}`
      );
      throw error;
    }
  };

  const findProjectIndex = (allProjects: any, projectName: string): number => {
    let globalIndex = 0; // Compteur global pour l'indice
    for (const track in allProjects) {
      const trackProjects = allProjects[track]; // Liste des projets dans une track
      for (const project of trackProjects) {
        if (project.name === projectName) {
          return globalIndex; // Retourne l'indice global
        }
        globalIndex++; // Augmente l'indice pour chaque projet
      }
    }
    throw new Error(
      `Projet "${projectName}" introuvable dans la liste des projets.`
    );
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
