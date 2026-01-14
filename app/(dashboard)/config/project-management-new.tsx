'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Briefcase, Code2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Project {
  id: number;
  name: string;
  project_time_week: number;
}

interface ProjectsByTech {
  [tech: string]: Project[];
}

const TECH_COLORS: Record<string, string> = {
  Golang: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  Javascript: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  Rust: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  Java: 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
};

export default function ProjectManagement() {
  const [projectsByTech, setProjectsByTech] = useState<ProjectsByTech>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteProject, setDeleteProject] = useState<{ tech: string; id: number } | null>(null);
  const [newProject, setNewProject] = useState<Omit<Project, 'id'> & { tech: string }>({
    name: '',
    project_time_week: 0,
    tech: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjectsByTech(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des projets.');
    }
  };

  const handleAdd = async () => {
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
      setNewProject({ name: '', project_time_week: 0, tech: '' });
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du projet.');
    }
  };

  const handleDelete = async (tech: string, id: number) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tech })
      });
      const data = await response.json();
      setProjectsByTech(data.projects);
      toast.success('Projet supprimé avec succès.');
      setDeleteProject(null);
    } catch (error) {
      toast.error('Erreur lors de la suppression du projet.');
    }
  };

  const handleMove = async (tech: string, id: number, direction: 'up' | 'down') => {
    const techProjects = projectsByTech[tech];
    const index = techProjects.findIndex((project) => project.id === id);

    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === techProjects.length - 1)
    ) {
      return;
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
      toast.success('Ordre modifié avec succès.');
    } catch (error) {
      toast.error('Erreur lors de la réorganisation.');
    }
  };

  const getTotalProjects = () => {
    return Object.values(projectsByTech).reduce((acc, projects) => acc + projects.length, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton d\'ajout */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Projets</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {getTotalProjects()} projet{getTotalProjects() > 1 ? 's' : ''} dans {Object.keys(projectsByTech).length} technologie{Object.keys(projectsByTech).length > 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau projet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un projet</DialogTitle>
              <DialogDescription>
                Créez un nouveau projet et assignez-le à une technologie
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Nom du projet *</Label>
                <Input
                  id="project-name"
                  placeholder="ex: ascii-art"
                  value={newProject.name}
                  onChange={(e) => setNewProject((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-duration">Durée (en semaines) *</Label>
                <Input
                  id="project-duration"
                  type="number"
                  min="1"
                  placeholder="ex: 2"
                  value={newProject.project_time_week || ''}
                  onChange={(e) => setNewProject((prev) => ({
                    ...prev,
                    project_time_week: Number(e.target.value)
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-tech">Technologie *</Label>
                <Select
                  value={newProject.tech}
                  onValueChange={(value) => setNewProject((prev) => ({ ...prev, tech: value }))}
                >
                  <SelectTrigger id="project-tech">
                    <SelectValue placeholder="Sélectionnez une technologie" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(projectsByTech).map((tech) => (
                      <SelectItem key={tech} value={tech}>
                        {tech}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Nouvelle technologie</SelectItem>
                  </SelectContent>
                </Select>
                {newProject.tech === '__new__' && (
                  <Input
                    className="mt-2"
                    placeholder="Nom de la nouvelle technologie"
                    onChange={(e) => setNewProject((prev) => ({ ...prev, tech: e.target.value }))}
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAdd}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des projets par technologie */}
      {Object.keys(projectsByTech).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Code2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Aucun projet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Commencez par ajouter votre premier projet
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer un projet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Object.entries(projectsByTech).map(([tech, projects]) => (
            <Card key={tech}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className={TECH_COLORS[tech] || 'bg-gray-500/10'}>
                    {tech}
                  </Badge>
                  <CardDescription>
                    {projects.length} projet{projects.length > 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projects.map((project, index) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.project_time_week} semaine{project.project_time_week > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMove(tech, project.id, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMove(tech, project.id, 'down')}
                          disabled={index === projects.length - 1}
                          className="h-8 w-8"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteProject({ tech, id: project.id })}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteProject} onOpenChange={() => setDeleteProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProject && handleDelete(deleteProject.tech, deleteProject.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
