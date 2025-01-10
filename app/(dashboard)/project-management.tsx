'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { toast } from 'react-hot-toast';

interface Project {
  id: number;
  name: string;
  project_time_week: number;
}

interface ProjectsByTech {
  [tech: string]: Project[];
}

export default function ProjectsManager() {
  const [projectsByTech, setProjectsByTech] = useState<ProjectsByTech>({});
  const [newProject, setNewProject] = useState<Omit<Project, 'id'> & { tech: string }>({
    name: '',
    project_time_week: 0,
    tech: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Chargement initial des projets
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjectsByTech(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des projets.');
    }
  };

  // Initialisation
  React.useEffect(() => {
    fetchProjects();
  }, []);

  // Ajouter un projet
  const handleAddProject = async () => {
    const { name, project_time_week, tech } = newProject;

    if (!name || !project_time_week || !tech) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, project_time_week, tech }),
      });
      const data = await response.json();
      setProjectsByTech(data.projects);
      toast.success('Projet ajouté avec succès.');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du projet.');
    }

    setNewProject({ name: '', project_time_week: 0, tech });
    setIsModalOpen(false);
  };

  // Supprimer un projet
  const handleDeleteProject = async (tech: string, id: number) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tech }),
      });
      const data = await response.json();
      setProjectsByTech(data.projects);
      toast.success('Projet supprimé avec succès.');
    } catch (error) {
      toast.error('Erreur lors de la suppression du projet.');
    }
  };

  // Réorganiser un projet
  const handleMoveProject = async (tech: string, id: number, direction: 'up' | 'down') => {
    const techProjects = projectsByTech[tech];
    const index = techProjects.findIndex((project) => project.id === id);

    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === techProjects.length - 1)
    ) {
      return; // Impossible de déplacer
    }

    const reorderedProjects = [...techProjects];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [reorderedProjects[index], reorderedProjects[swapIndex]] = [
      reorderedProjects[swapIndex],
      reorderedProjects[index],
    ];

    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tech,
          reorderedProjects: reorderedProjects.map((proj) => proj.id),
        }),
      });
      const data = await response.json();
      setProjectsByTech(data.projects);
      toast.success('Projets réorganisés avec succès.');
    } catch (error) {
      toast.error('Erreur lors de la réorganisation des projets.');
    }
  };

  const handleTechChange = (value: string) => {
    setNewProject((prev) => ({ ...prev, tech: value }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestion des Projets</h1>
      <Button onClick={() => setIsModalOpen(true)}>Ajouter un Projet</Button>

      <div className="mt-4">
        {Object.entries(projectsByTech).map(([tech, projects]) => (
          <div key={tech} className="mb-6">
            <h2 className="text-xl font-semibold">{tech}</h2>
            <ul className="mt-2">
              {projects.map(({ id, name, project_time_week }, index) => (
                <li key={id} className="mb-2 flex items-center justify-between">
                  <div>
                    <strong>{name}</strong> ({project_time_week} semaines)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMoveProject(tech, id, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMoveProject(tech, id, 'down')}
                      disabled={index === projects.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProject(tech, id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Modal pour ajouter un projet */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div>
          <h3 className="text-lg font-bold mb-4">Ajouter un Projet</h3>
          <div className="mb-4">
            <label>Nom</label>
            <Input
              value={newProject.name}
              onChange={(e) =>
                setNewProject((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div className="mb-4">
            <label>Durée du Projet (semaines)</label>
            <Input
              type="number"
              value={newProject.project_time_week}
              onChange={(e) =>
                setNewProject((prev) => ({
                  ...prev,
                  project_time_week: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="mb-4">
            <label>Technologie</label>
            <select
              value={newProject.tech}
              onChange={(e) => handleTechChange(e.target.value)}
              className="border border-gray-300 p-2 rounded w-full"
            >
              {Object.keys(projectsByTech).map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
              <option value="">Nouvelle Technologie</option>
            </select>
            {!Object.keys(projectsByTech).includes(newProject.tech) && (
              <Input
                className="mt-2"
                placeholder="Nom de la nouvelle technologie"
                onChange={(e) =>
                  setNewProject((prev) => ({ ...prev, tech: e.target.value }))
                }
              />
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddProject}>Ajouter</Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}