'use client';

import React, { useState, useEffect } from 'react';
import { useData, mutateKey } from '@/lib/client-cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import { trackChipStyle } from '@/lib/track-colors';
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
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Briefcase, Code2, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: number;
  name: string;
  project_time_week: number;
  optional?: boolean;
}

interface ProjectsByTech {
  [tech: string]: Project[];
}

const PROJECTS_KEY = '/api/projects';

export default function ProjectManagement() {
  const { data, isLoading: loading, error: projectsError } = useData<ProjectsByTech>(PROJECTS_KEY);
  const projectsByTech: ProjectsByTech = data ?? {};
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [movingId, setMovingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteProject, setDeleteProject] = useState<{ tech: string; id: number } | null>(null);
  const [newProject, setNewProject] = useState<Omit<Project, 'id'> & { tech: string }>({
    name: '',
    project_time_week: 0,
    tech: '',
    optional: false
  });

  // Édition en place d'un projet existant.
  const [editing, setEditing] = useState(false);
  const [editProject, setEditProject] = useState<{
    id: number;
    name: string;
    project_time_week: number;
    tech: string;
    isNewTech: boolean;
  } | null>(null);

  // Met à jour le cache avec la nouvelle valeur renvoyée par une mutation (sans refetch).
  const setProjectsByTech = (next: ProjectsByTech) =>
    mutateKey<ProjectsByTech>(PROJECTS_KEY, () => Promise.resolve(next));

  useEffect(() => {
    if (projectsError) toast.error('Erreur lors du chargement des projets.');
  }, [projectsError]);

  const handleAdd = async () => {
    const { name, project_time_week, tech, optional } = newProject;

    if (!name || !project_time_week || !tech) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, project_time_week, tech, optional: optional ?? false })
      });
      const data = await response.json();
      setProjectsByTech(data.projects);
      toast.success('Projet ajouté avec succès.');
      setNewProject({ name: '', project_time_week: 0, tech: '', optional: false });
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du projet.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOptional = async (id: number, optional: boolean) => {
    setTogglingId(id);
    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, optional })
      });
      const data = await response.json();
      setProjectsByTech(data.projects);
      toast.success(optional ? 'Projet marqué comme optionnel.' : 'Projet marqué comme obligatoire.');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du projet.');
    } finally {
      setTogglingId(null);
    }
  };

  const openEditDialog = (tech: string, project: Project) => {
    setEditProject({
      id: project.id,
      name: project.name,
      project_time_week: project.project_time_week,
      tech,
      isNewTech: false,
    });
  };

  const handleEdit = async () => {
    if (!editProject) return;
    const { id, name, project_time_week, tech } = editProject;

    if (!name.trim()) {
      toast.error('Le nom du projet est requis.');
      return;
    }
    if (!(project_time_week >= 1)) {
      toast.error('La durée doit être d\'au moins 1 semaine.');
      return;
    }
    if (!tech.trim()) {
      toast.error('La technologie est requise.');
      return;
    }

    setEditing(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: name.trim(), project_time_week, tech: tech.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error ?? 'Erreur lors de la modification du projet.');
        return;
      }
      setProjectsByTech(data.projects);
      toast.success('Projet modifié avec succès.');
      setEditProject(null);
    } catch (error) {
      toast.error('Erreur lors de la modification du projet.');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (tech: string, id: number) => {
    setDeleting(true);
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
    } finally {
      setDeleting(false);
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

    setMovingId(id);
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
    } finally {
      setMovingId(null);
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
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="project-optional">Projet optionnel</Label>
                  <p className="text-xs text-muted-foreground">
                    Exclu des relances de regroupement et de code-review
                  </p>
                </div>
                <Switch
                  id="project-optional"
                  checked={newProject.optional ?? false}
                  onCheckedChange={(checked) => setNewProject((prev) => ({ ...prev, optional: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajout...
                  </>
                ) : (
                  'Ajouter'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des projets par technologie */}
      {loading ? (
        <LoadingCard count={4} columns={2} height="lg" />
      ) : Object.keys(projectsByTech).length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={Code2}
              title="Aucun projet"
              description="Commencez par ajouter votre premier projet"
              action={
                <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer un projet
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Object.entries(projectsByTech).map(([tech, projects]) => (
            <Card key={tech}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" style={trackChipStyle(tech)}>
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{project.name}</p>
                            {project.optional && (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                Optionnel
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {project.project_time_week} semaine{project.project_time_week > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-2 pr-2">
                          <Label htmlFor={`optional-${project.id}`} className="text-xs text-muted-foreground">
                            Optionnel
                          </Label>
                          {togglingId === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Switch
                              id={`optional-${project.id}`}
                              checked={project.optional ?? false}
                              onCheckedChange={(checked) => handleToggleOptional(project.id, checked)}
                              disabled={togglingId !== null}
                            />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMove(tech, project.id, 'up')}
                          disabled={index === 0 || movingId !== null}
                          className="h-8 w-8"
                        >
                          {movingId === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMove(tech, project.id, 'down')}
                          disabled={index === projects.length - 1 || movingId !== null}
                          className="h-8 w-8"
                        >
                          {movingId === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(tech, project)}
                          className="h-8 w-8"
                          aria-label="Modifier le projet"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteProject({ tech, id: project.id })}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Supprimer le projet"
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

      {/* Dialog d'édition en place */}
      <Dialog
        open={!!editProject}
        onOpenChange={(open) => {
          if (!open && !editing) setEditProject(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
            <DialogDescription>
              Renommez le projet, ajustez sa durée ou changez de technologie
            </DialogDescription>
          </DialogHeader>
          {editProject && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-project-name">Nom du projet *</Label>
                <Input
                  id="edit-project-name"
                  placeholder="ex: ascii-art"
                  value={editProject.name}
                  onChange={(e) =>
                    setEditProject((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                  }
                  aria-invalid={editProject.name.trim() === ''}
                />
                {editProject.name.trim() === '' && (
                  <p className="text-xs text-destructive">Le nom est requis.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-project-duration">Durée (en semaines) *</Label>
                <Input
                  id="edit-project-duration"
                  type="number"
                  min="1"
                  placeholder="ex: 2"
                  value={editProject.project_time_week || ''}
                  onChange={(e) =>
                    setEditProject((prev) =>
                      prev ? { ...prev, project_time_week: Number(e.target.value) } : prev
                    )
                  }
                  aria-invalid={!(editProject.project_time_week >= 1)}
                />
                {!(editProject.project_time_week >= 1) && (
                  <p className="text-xs text-destructive">La durée doit être d&apos;au moins 1 semaine.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-project-tech">Technologie *</Label>
                <Select
                  value={editProject.isNewTech ? '__new__' : editProject.tech}
                  onValueChange={(value) =>
                    setEditProject((prev) =>
                      prev
                        ? value === '__new__'
                          ? { ...prev, tech: '', isNewTech: true }
                          : { ...prev, tech: value, isNewTech: false }
                        : prev
                    )
                  }
                >
                  <SelectTrigger id="edit-project-tech">
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
                {editProject.isNewTech && (
                  <Input
                    className="mt-2"
                    placeholder="Nom de la nouvelle technologie"
                    value={editProject.tech}
                    onChange={(e) =>
                      setEditProject((prev) => (prev ? { ...prev, tech: e.target.value } : prev))
                    }
                    aria-invalid={editProject.tech.trim() === ''}
                  />
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProject(null)} disabled={editing}>
              Annuler
            </Button>
            <Button
              onClick={handleEdit}
              disabled={
                editing ||
                !editProject ||
                editProject.name.trim() === '' ||
                !(editProject.project_time_week >= 1) ||
                editProject.tech.trim() === ''
              }
            >
              {editing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteProject) handleDelete(deleteProject.tech, deleteProject.id);
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
