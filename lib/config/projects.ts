/**
 * Utilitaire pour accéder à la configuration des projets depuis la DB
 */

import type { Track } from '@/lib/db/schema/audits';
import type { ProjectConfig, ProjectsConfig } from '@/lib/types/code-reviews';
import { getAllProjects as getAllProjectsFromDB } from '../db/services/projects';

export function dbProjectsToConfig(rows: any[]): ProjectsConfig {
    const result: any = {};
    for (const row of rows.sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0))) {
        if (!result[row.category]) result[row.category] = [];
        result[row.category].push({ id: row.id, name: row.name, project_time_week: row.projectTimeWeek });
    }
    return result as ProjectsConfig;
}

async function getProjectsConfig(): Promise<ProjectsConfig> {
    const rows = await getAllProjectsFromDB();
    return dbProjectsToConfig(rows);
}

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
    return projects.reduce((sum, p) => sum + p.project_time_week, 0);
}

export async function getProjectIndex(projectName: string, track: Track): Promise<number> {
    const config = await getProjectsConfig();
    return config[track]?.findIndex(p => p.name === projectName) ?? -1;
}
