import { db } from '../config';
import { sql } from 'drizzle-orm';

export interface TrackStats {
  track: string;
  completed: number;
  inProgress: number;
  total: number;
  completionRate: number;
}

/**
 * Statistiques par track basées sur le PROJET ACTIF de chaque étudiant.
 *
 * - `total` / `inProgress` = apprenants ACTIFS sur la track, c.-à-d. ayant un
 *   projet en cours (`working`/`audit`) sur cette track. Un étudiant n'est
 *   compté que sur UNE track (priorité Rust > Java > Javascript > Golang). Les
 *   apprenants en piscine (statut `without group`/`not_started`) ne sont donc
 *   PAS comptés en Rust/Java tant qu'ils n'ont pas choisi.
 * - `completed` = apprenants ayant TERMINÉ la track (specialty progress).
 * - `completionRate` = % terminés parmi ceux ayant touché la track (terminés + actifs).
 *
 * Périmètre : apprenants comptables (non perdition, non archivés, promo non
 * archivée), éventuellement filtré sur une promo.
 */
export async function getTrackStatsByPromo(promoName: string | null): Promise<TrackStats[]> {
  try {
    const promoCond = promoName ? sql`AND s.promo_name = ${promoName}` : sql``;
    const scopeCond = sql`
      (s.is_dropout IS NULL OR s.is_dropout = false)
      AND (s.archived IS NULL OR s.archived = false)
      AND (p.is_archived = false OR p.is_archived IS NULL)
      ${promoCond}
    `;

    // Track active par étudiant (une seule, priorité Rust>Java>JS>Golang).
    const activeRes = await db.execute(sql`
      WITH act AS (
        SELECT
          CASE
            WHEN scp.rust_project_status IN ('working','audit') THEN 'Rust'
            WHEN scp.java_project_status IN ('working','audit') THEN 'Java'
            WHEN scp.javascript_project_status IN ('working','audit') THEN 'Javascript'
            WHEN scp.golang_project_status IN ('working','audit') THEN 'Golang'
            ELSE NULL
          END AS track
        FROM students s
        JOIN promotions p ON s.promo_name = p.name
        LEFT JOIN student_current_projects scp ON scp.student_id = s.id
        WHERE ${scopeCond}
      )
      SELECT track, count(*)::int AS c FROM act WHERE track IS NOT NULL GROUP BY track
    `);

    // Terminés par track (specialty progress).
    const compRes = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE ssp.golang_completed)::int     AS golang,
        count(*) FILTER (WHERE ssp.javascript_completed)::int AS javascript,
        count(*) FILTER (WHERE ssp.rust_completed)::int       AS rust,
        count(*) FILTER (WHERE ssp.java_completed)::int       AS java
      FROM students s
      JOIN promotions p ON s.promo_name = p.name
      LEFT JOIN student_specialty_progress ssp ON ssp.student_id = s.id
      WHERE ${scopeCond}
    `);

    const activeRows = ((activeRes as unknown as { rows?: unknown[] }).rows ?? activeRes) as {
      track: string;
      c: number;
    }[];
    const active: Record<string, number> = { Golang: 0, Javascript: 0, Rust: 0, Java: 0 };
    for (const r of activeRows) active[r.track] = Number(r.c) || 0;

    const compRows = ((compRes as unknown as { rows?: unknown[] }).rows ?? compRes) as Record<
      string,
      number
    >[];
    const comp = compRows[0] ?? {};
    const compKey: Record<string, string> = {
      Golang: 'golang',
      Javascript: 'javascript',
      Rust: 'rust',
      Java: 'java',
    };

    return (['Golang', 'Javascript', 'Rust', 'Java'] as const).map((track) => {
      const a = active[track] ?? 0;
      const c = Number(comp[compKey[track]] ?? 0);
      const denom = a + c;
      return {
        track,
        completed: c,
        inProgress: a,
        total: a,
        completionRate: denom > 0 ? Math.round((c / denom) * 100) : 0,
      };
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des troncs:', error);
    throw error;
  }
}
