'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

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

  const [promoEventIds, setPromoEventIds] = useState<string[]>([]); // Stocke dynamiquement les IDs des promotions récupérés depuis l'API

  const projectsList: any[] = [];

  async function fetchProjets() {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Unable to fetch projects');
      }

      const data = await response.json();
      Object.keys(data).forEach(category => {
        // Si la catégorie existe et a des projets, ajouter leurs noms à projectsList
        if (Array.isArray(data[category])) {
          projectsList.push(...data[category].map(project => project.name));
        }
      });
    } catch (error) {
      toast.error('Impossible de récupérer les projets.');
      throw error;  // Assure de sortir en cas d'erreur
    }
  }

  // Récupérer dynamiquement les promotions via l'API
  const fetchPromotions = async () => {
    try {
      const response = await fetch('/api/promos'); // Chemin API pour récupérer les promotions
      if (!response.ok) {
        throw new Error('Unable to fetch promotions');
      }
      const data = await response.json();
      // Extraire les eventId de chaque promotion pour utiliser dans la logique
      setPromoEventIds(data.promos.map((promo: Promotion) => promo.eventId)); // Utiliser l'eventId de la promo
    } catch (error) {
      toast.error('Impossible de récupérer les promotions.');
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
        throw new Error(`Erreur lors de la récupération des données pour l'événement ${eventId}`);
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
      toast.error(`Impossible de récupérer les informations de progression pour la promotion avec l'id : ${eventId}.`);
    } finally {
      return currentStudentCount;
    }
  };

  const handleUpdate = async () => {
    setLoading(true); // Indique que le chargement commence

    try {
      // Appel de fetchProjets
      await fetchProjets(); // Récupère les projets
      await fetchPromotions(); // Récupère les promotions

      // On passe à Promise.allSettled pour gérer les erreurs sans arrêter tout le processus
      const results = await Promise.allSettled(
        promoEventIds.map(async (promoId) => {
          try {
            await fetchPromotionProgress(promoId);
          } catch (error) {
            toast.error(`Erreur de mise à jour pour la promo ${promoId}`);
          }
        })
      );
      // Gérer le statut final
      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.error('Une erreur est survenue lors de la mise à jour:', result.reason);
          toast.error('Une erreur est survenue lors de la mise à jour:', result.reason);
        }
      });

      setLoading(false);
    } catch (error) {
      // Si une erreur survient pendant l'appel principal, la notification toast apparaîtra ici
      setLoading(false);
      toast.error(`Impossible de mettre à jour les promotions. Erreur liée à l'événement ${eventId}`);
    }
  };

  return (
    <div>
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
    </div>
  );
};

export default PromotionProgress;