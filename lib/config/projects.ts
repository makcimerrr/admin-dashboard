/**
 * Utilitaire pour accéder à la configuration des projets depuis la DB.
 * Les projets changent rarement → cache 1h. Toutes les fonctions
 * dérivées (getProjectsByTrack, etc.) appellent le même cache mémoisé,
 * donc plusieurs appels dans une même requête ne touchent la DB qu'une fois.
 */

import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from '../cache';
import type { Track } from '@/lib/db/schema/audits';
import type { ProjectConfig, ProjectsConfig } from '@/lib/types/code-reviews';
import { getAllProjects as getAllProjectsFromDB } from '../db/services/projects';

// Ordre d'affichage canonique des tracks (GOLANG → JAVASCRIPT → RUST → JAVA).
const TRACK_ORDER = ['Golang', 'Javascript', 'Rust', 'Java'];

export function dbProjectsToConfig(rows: any[]): ProjectsConfig {
    const sorted = rows.sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
    const present = Array.from(new Set(sorted.map((r) => r.category)));
    // Clés dans l'ordre canonique d'abord, puis toute catégorie custom ensuite.
    const cats = [
        ...TRACK_ORDER.filter((c) => present.includes(c)),
        ...present.filter((c) => !TRACK_ORDER.includes(c)),
    ];
    const result: any = {};
    for (const c of cats) result[c] = [];
    for (const row of sorted) {
        if (!result[row.category]) result[row.category] = [];
        result[row.category].push({ id: row.id, name: row.name, project_time_week: row.projectTimeWeek, optional: row.optional ?? false, noCodeReview: row.noCodeReview ?? false });
    }
    return result as ProjectsConfig;
}

const getProjectsConfig = unstable_cache(
    async (): Promise<ProjectsConfig> => {
        const rows = await getAllProjectsFromDB();
        return dbProjectsToConfig(rows);
    },
    ['projects-config'],
    { tags: [CACHE_TAGS.projects], revalidate: CACHE_TTL.long },
);

export async function getAllProjects(): Promise<ProjectsConfig> {
    return getProjectsConfig();
}

export async function getProjectsByTrack(track: Track): Promise<ProjectConfig[]> {
    const config = await getProjectsConfig();
    return config[track] || [];
}

export async function getProjectNamesByTrack(track: Track): Promise<string[]> {
    const projects = await getProjectsByTrack(track);
    return projects.map(p => p.name);
}

export async function getProjectByName(name: string): Promise<{ project: ProjectConfig; track: Track } | null> {
    const config = await getProjectsConfig();
    const nameLower = name.toLowerCase();
    for (const track of Object.keys(config) as Track[]) {
        const project = config[track].find(p => p.name.toLowerCase() === nameLower);
        if (project) return { project, track };
    }
    return null;
}

export async function getTrackByProjectName(projectName: string): Promise<Track | null> {
    const config = await getProjectsConfig();
    const nameLower = projectName.toLowerCase();
    for (const track of Object.keys(config) as Track[]) {
        if (config[track].some(p => p.name.toLowerCase() === nameLower)) return track;
    }
    return null;
}

export async function isProjectInTrack(projectName: string, track: Track): Promise<boolean> {
    const config = await getProjectsConfig();
    const nameLower = projectName.toLowerCase();
    return config[track]?.some(p => p.name.toLowerCase() === nameLower) ?? false;
}

export async function getAllTracks(): Promise<Track[]> {
    const config = await getProjectsConfig();
    return Object.keys(config) as Track[];
}

export async function getTrackDurationWeeks(track: Track): Promise<number> {
    const projects = await getProjectsByTrack(track);
    // Les projets optionnels ne comptent pas dans la durée du cursus.
    return projects.filter((p) => !p.optional).reduce((sum, p) => sum + p.project_time_week, 0);
}

export async function getProjectIndex(projectName: string, track: Track): Promise<number> {
    const config = await getProjectsConfig();
    return config[track]?.findIndex(p => p.name === projectName) ?? -1;
}

/**
 * Indique si un projet (par nom, case-insensitive) est marqué comme optionnel.
 * Les projets optionnels sont exclus des relances de regroupement et des
 * relances de code-review. Renvoie `false` si le projet est inconnu.
 */
export async function isOptionalProject(name: string): Promise<boolean> {
    const found = await getProjectByName(name);
    return found?.project.optional ?? false;
}

/**
 * Ensemble (lower-case) des noms de projets **obligatoires du tronc commun** :
 * présents dans la config ET non optionnels. Exclut donc les optionnels, les
 * bonus (sous-projets hors config) et les projets piscine/additionnels.
 * Sert à n'envoyer les cards/relances Teams que sur ces projets.
 */
export async function getMandatoryProjectNames(): Promise<Set<string>> {
    const config = await getProjectsConfig();
    const set = new Set<string>();
    for (const track of Object.keys(config) as Track[]) {
        for (const p of config[track]) {
            if (!p.optional) set.add(p.name.toLowerCase());
        }
    }
    return set;
}
