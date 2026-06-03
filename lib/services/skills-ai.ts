/**
 * Chantier A / Palier 2 — synthèse IA (opt-in) des compétences.
 *
 * Au-dessus des skills "langage" déterministes, un LLM infère les frameworks et
 * domaines depuis le breakdown langages + les noms de repos, et rédige un court
 * narratif sur le profil/appétence de l'étudiant.
 *
 * Désactivé par défaut (coût). Activé quand un provider est configuré ET que le
 * cron est appelé avec `ai=1` (ou SKILLS_AI_SYNTHESIS=1). Provider via l'AI SDK
 * (Mistral par défaut, la stack déjà utilisée par Nova).
 */

import { generateObject } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import { z } from 'zod';
import type { GiteaLanguageBreakdown } from '@/lib/db/schema/studentSkills';
import type { DerivedSkill } from './gitea';

const SkillSynthesisSchema = z.object({
  narrative: z
    .string()
    .describe('1 à 2 phrases en français sur le profil technique et l\'appétence de l\'étudiant.'),
  frameworks: z
    .array(z.object({ name: z.string(), confidence: z.number().min(0).max(100) }))
    .describe('Frameworks/librairies identifiés (ex: React, Gin, Express). Vide si incertain.'),
  domains: z
    .array(z.object({ name: z.string(), confidence: z.number().min(0).max(100) }))
    .describe('Domaines (ex: web frontend, systèmes, data, devops, algo). Vide si incertain.'),
});

export type SkillSynthesis = z.infer<typeof SkillSynthesisSchema>;

export function isAiSynthesisAvailable(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY);
}

export interface SynthesisInput {
  login: string;
  languages: GiteaLanguageBreakdown;
  repoNames: string[];
  engagementScore: number;
  affinityLabel: string;
}

/**
 * Appelle le LLM pour produire narratif + frameworks + domaines. Renvoie null si
 * aucun provider configuré ou en cas d'erreur (le scan reste déterministe).
 */
export async function synthesizeSkills(
  input: SynthesisInput,
): Promise<{ narrative: string; skills: DerivedSkill[] } | null> {
  if (!isAiSynthesisAvailable()) return null;

  const mistral = createMistral({ apiKey: process.env.MISTRAL_API_KEY! });

  const langSummary = Object.entries(input.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([l, b]) => `${l} (${b} octets)`)
    .join(', ');

  try {
    const { object } = await generateObject({
      model: mistral('mistral-small-latest'),
      schema: SkillSynthesisSchema,
      prompt: [
        `Profil Gitea d'un étudiant Zone01 (login ${input.login}).`,
        `Langages (octets) : ${langSummary || 'aucun'}.`,
        `Repos : ${input.repoNames.slice(0, 40).join(', ') || 'aucun'}.`,
        `Engagement : ${input.engagementScore}/100 (${input.affinityLabel}).`,
        '',
        'À partir de ces données, déduis les frameworks/librairies et les domaines',
        'techniques probables, et rédige un court narratif (1-2 phrases, en français)',
        'sur son profil et son appétence. Reste factuel : n\'invente pas de framework',
        'si rien ne l\'indique. Les noms de repos sont des indices forts.',
      ].join('\n'),
      maxRetries: 1,
    });

    const toSkill = (category: 'framework' | 'domain') => (e: { name: string; confidence: number }): DerivedSkill => ({
      category,
      name: e.name,
      level: Math.max(1, Math.min(100, Math.round(e.confidence))),
      affinity: input.engagementScore,
      evidence: ['Déduit par IA depuis repos + langages'],
      source: 'ai',
    });

    const skills: DerivedSkill[] = [
      ...object.frameworks.map(toSkill('framework')),
      ...object.domains.map(toSkill('domain')),
    ];

    return { narrative: object.narrative.trim(), skills };
  } catch (error) {
    console.error(`synthesizeSkills failed for ${input.login}:`, error);
    return null;
  }
}
