/**
 * Utilitaire pour accéder à la configuration des projets
 *
 * Le fichier config/projects.json définit les projets par tronc.
 * Ce module fournit des fonctions typées pour y accéder.
 */

import type { Track } from '@/lib/db/schema/audits';
import type { ProjectConfig, ProjectsConfig } from '@/lib/types/code-reviews';
import projectsData from '../../config/projects.json';

// Cast typé de la config
const projects: ProjectsConfig = projectsData as ProjectsConfig;

/**
 * Récupère tous les projets de tous les troncs
 */
export function getAllProjects(): ProjectsConfig {
    return projects;
}

/**
 * Récupère les projets d'un tronc spécifique
 */
export function getProjectsByTrack(track: Track): ProjectConfig[] {
    return projects[track] || [];
}

/**
 * Récupère les noms des projets d'un tronc
 */
export function getProjectNamesByTrack(track: Track): string[] {
    return getProjectsByTrack(track).map(p => p.name);
}

/**
 * Récupère un projet par son nom (case-insensitive)
 */
export function getProjectByName(name: string): { project: ProjectConfig; track: Track } | null {
    const nameLower = name.toLowerCase();
    for (const track of Object.keys(projects) as Track[]) {
        const project = projects[track].find(p => p.name.toLowerCase() === nameLower);
        if (project) {
            return { project, track };
        }
    }
    return null;
}

/**
 * Identifie le tronc d'un projet par son nom (case-insensitive)
 */
export function getTrackByProjectName(projectName: string): Track | null {
    const nameLower = projectName.toLowerCase();
    for (const track of Object.keys(projects) as Track[]) {
        if (projects[track].some(p => p.name.toLowerCase() === nameLower)) {
            return track;
        }
    }
    return null;
}

/**
 * Vérifie si un projet appartient à un tronc (case-insensitive)
 */
export function isProjectInTrack(projectName: string, track: Track): boolean {
    const nameLower = projectName.toLowerCase();
    return projects[track]?.some(p => p.name.toLowerCase() === nameLower) ?? false;
}

/**
 * Récupère la liste de tous les troncs
 */
export function getAllTracks(): Track[] {
    return Object.keys(projects) as Track[];
}

/**
 * Calcule la durée totale d'un tronc en semaines
 */
export function getTrackDurationWeeks(track: Track): number {
    return getProjectsByTrack(track).reduce((sum, p) => sum + p.project_time_week, 0);
}

/**
 * Récupère l'index d'un projet dans son tronc
 */
export function getProjectIndex(projectName: string, track: Track): number {
    return projects[track]?.findIndex(p => p.name === projectName) ?? -1;
}
