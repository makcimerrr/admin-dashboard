'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { toast } from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem
} from '@/components/ui/select';

interface Project {
  id: number;
  name: string;
  project_time_week: number;
  sort_index?: number;
}

interface ProjectsByTech {
  [tech: string]: Project[];
}

export default function ProjectsManager() {
  const [projectsByTech, setProjectsByTech] = useState<ProjectsByTech>({});
  const [newProject, setNewProject] = useState<
    Omit<Project, 'id'> & { tech: string }
  >({
    name: '',
    project_time_week: 0,
    tech: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const techOrder = ['Golang', 'Javascript', 'Rust'];

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
        body: JSON.stringify({ name, project_time_week, tech })
      });
      const data = await response.json();
      setProjectsByTech(data.projects);
      toast.success('Projet ajouté avec succès.');
    } catch (error) {
      toast.error("Erreur lors de l'ajout du projet.");
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
        body: JSON.stringify({ id, tech })
      });
      const data = await response.json();
      setProjectsByTech(data.projects);
      toast.success('Projet supprimé avec succès.');
    } catch (error) {
      toast.error('Erreur lors de la suppression du projet.');
    }
  };

  // Réorganiser un projet
  const handleMoveProject = async (
    tech: string,
    id: number,
    direction: 'up' | 'down'
  ) => {
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
      reorderedProjects[index]
    ];

    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tech,
          reorderedProjects: reorderedProjects.map((proj) => proj.id)
        })
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
      <h1 className="text-3xl font-semibold mb-6">Gestion des Projets</h1>

      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-primary font-semibold py-2 px-4 rounded-lg hover:bg-primary-dark transition duration-200"
      >
        Ajouter un Projet
      </Button>

      <div className="mt-8">
        {Object.entries(projectsByTech)
          .sort(([a], [b]) => {
            const indexA = techOrder.indexOf(a);
            const indexB = techOrder.indexOf(b);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
          })
          .map(([tech, projects]) => (
            <div key={tech} className="mb-8">
              <h2 className="text-2xl font-semibold">{tech}</h2>
              <ul className="mt-4 space-y-4">
                {projects
                  .slice()
                  .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0))
                  .map(({ id, name, project_time_week }, index) => (
                    <li
                      key={id}
                      className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-md flex items-center justify-between hover:bg-gray-50 transition-all"
                    >
                      <div className="text-lg font-medium">
                        <strong>{name}</strong> ({project_time_week} semaines)
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMoveProject(tech, id, 'up')}
                          disabled={index === 0}
                          className="text-sm text-gray-600 hover:text-primary transition-colors"
                        >
                          ↑
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMoveProject(tech, id, 'down')}
                          disabled={index === projects.length - 1}
                          className="text-sm text-gray-600 hover:text-primary transition-colors"
                        >
                          ↓
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProject(tech, id)}
                          className="text-sm text-red-200 hover:text-red-800 transition-colors"
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
      <Modal isOpen={isModalOpen}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Ajouter un Projet</h3>
          <button
            onClick={() => setIsModalOpen(false)}
            className="text-gray-600 hover:text-gray-900"
            aria-label="Fermer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label>Nom</label>
            <Input
              value={newProject.name}
              onChange={(e) =>
                setNewProject((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div>
            <label>Durée du Projet (semaines)</label>
            <Input
              type="number"
              value={newProject.project_time_week}
              onChange={(e) =>
                setNewProject((prev) => ({
                  ...prev,
                  project_time_week: Number(e.target.value)
                }))
              }
            />
          </div>
          <div>
            <label>Technologie</label>
            <Select
              value={newProject.tech}
              onValueChange={handleTechChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionnez une technologie" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(projectsByTech).map((tech) => (
                  <SelectItem key={tech} value={tech}>
                    {tech}
                  </SelectItem>
                ))}
                <SelectItem value="new">Nouvelle Technologie</SelectItem>{' '}
                {/* Valeur unique pour la nouvelle technologie */}
              </SelectContent>
            </Select>

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
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <Button onClick={handleAddProject}>Ajouter</Button>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Annuler
          </Button>
        </div>
      </Modal>
    </div>
  );
}
