'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface UpdateProps {
  eventId: string;
}

const PromotionProgress = ({ eventId }: UpdateProps) => {
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDots, setLoadingDots] = useState<string>('.');

  const projectsList = [
    'Go-reloaded',
    'Ascii-art',
    'Ascii-art-web',
    'Groupie-tracker',
    'Lem-in',
    'Forum',
    'Make-your-game',
    'Real-Time-Forum',
    'GraphQL',
    'Smart-Road',
    'Filler',
    'Mini-Framework',
    'Bomberman-Dom',
    'RT',
    'Multiplayer-FPS',
    '0-shell'
  ];

  const promoEventIds = ['32', '148', '216', '303'];
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
            console.log(`Project for user ${login} has been updated.`);
          } catch (error) {
            console.error(`Error updating project for ${login}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    } finally {
      return currentStudentCount;
    }
  };

  const handleUpdate = async () => {
    setLoading(true); // Indique que le chargement commence
    if (eventId === 'all') {
      console.log('Updating all promos:', promoEventIds);
      await Promise.all(
        promoEventIds.map(async (promoId) => {
          await fetchPromotionProgress(promoId); // Mettre à jour progressivement
        })
      );
    } else {
      console.log('Updating promo:', eventId);
      await fetchPromotionProgress(eventId);
    }
    setLoading(false);
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
