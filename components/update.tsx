'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import LastUpdate from '@/components/last-update';

interface UpdateProps {
  eventId: string;
}

interface Promotion {
  eventId: string; // Utilisation de l'eventId
  key: string;
  title: string;
  dates: { start: string; end: string };
}

const PromotionProgress = ({ eventId }: UpdateProps) => {
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDots, setLoadingDots] = useState<string>('.');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null); // State pour la dernière mise à jour
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
    try {
      const response = await fetch(
        `http://localhost:3010/promotion-progress/${eventId}`
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

        if (shouldUpdate(login, activeProject, status)) {
          try {
            await fetch('/api/update_project', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                login,
                project_name: activeProject,
                project_status: status
              })
            });
          } catch (error) {
            toast.error(`Erreur de mise à jour du projet pour ${login}.`);
          }
        }
      }
    } catch (error) {
      toast.error(
        `Impossible de récupérer les informations de progression pour la promotion avec l'id : ${eventId}.`
      );
    } finally {
      return currentStudentCount;
    }
  };

  const handleUpdate = async () => {
    setLoading(true); // Indique que le chargement commence

    try {
      const response = await fetch('/api/timeline_project');
      if (!response.ok) {
        toast.error('Erreur lors de la mise à jour du status des promos.');
      }
      // Si eventId est 'all', récupérer toutes les promotions
      await fetchProjets(); // Récupère les projets

      let promoIds = [eventId]; // Utilisation de eventId par défaut

      // Si eventId est 'all', récupérer toutes les promotions
      if (eventId === 'all') {
        promoIds = await fetchPromotions(); // Récupère les IDs des promotions
      }

      // Utiliser eventId ou les promoIds si plusieurs promotions
      const results = await Promise.allSettled(
        promoIds.map(async (promoId) => {
          try {
            await fetchPromotionProgress(promoId);
          } catch (error) {
            toast.error(`Erreur de mise à jour pour la promo ${promoId}`);
          }
        })
      );

      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.error(
            'Une erreur est survenue lors de la mise à jour:',
            result.reason
          );
          toast.error(
            'Une erreur est survenue lors de la mise à jour:',
            result.reason
          );
        }
      });

      // Créer l'update dans la base de données
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

  useEffect(() => {
    async function fetchUpdates() {
      try {
        const response = await fetch('/api/last_update');
        if (!response.ok) {
          throw new Error('Impossible de récupérer les mises à jour');
        }
        const data = await response.json();
        setUpdates(data); // Stocke toutes les mises à jour

        // Filtrage des résultats pour trouver celui correspondant à l'eventId
        const filteredUpdate = data.find(
          (update: { event_id: string }) => update.event_id === eventId
        );

        if (filteredUpdate) {
          setLastUpdate(filteredUpdate.last_update); // Met à jour la dernière mise à jour trouvée
        }
      } catch (error) {
        toast.error(
          'Impossible de récupérer les données de mise à jour via lAPI.'
        );
        console.error(error);
      }
    }

    fetchUpdates();
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
        <LastUpdate lastUpdate={lastUpdate} eventId={eventId} />
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
