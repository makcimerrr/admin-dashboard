import { db } from '../config';
import { rotations, type Rotation, type RotationWeek, type RotationSlot } from '../schema/rotations';
import { eq } from 'drizzle-orm';
import { getEmployees } from './employees';

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// ─── Seed : anciens templates hardcodés d'apply-rotation ─────────────────────
// Conservés ici UNIQUEMENT comme données initiales (clés par NOM, résolues en
// employeeId au moment du seed). Après le seed, la base est la source de
// vérité et ces constantes ne servent plus.

const w = (start: string, end: string): RotationSlot[] => [
  { start, end, isWorking: true, type: 'work' },
];
const off: RotationSlot[] = [];

type NamedWeek = Record<string, Record<string, RotationSlot[]>>;

const STANDARD_WEEKS: NamedWeek[] = [
  // ── Semaine 1 (type S15) ──
  {
    'Bastien Lagrue': {
      lundi: w('09:00', '17:00'), mardi: w('09:00', '17:00'), mercredi: w('09:00', '17:00'),
      jeudi: w('09:00', '17:00'), vendredi: w('09:00', '17:00'), samedi: off, dimanche: off,
    },
    'Maxime Dubois': {
      lundi: w('09:00', '17:00'), mardi: w('09:00', '17:00'), mercredi: w('13:00', '21:00'),
      jeudi: w('09:00', '17:00'), vendredi: off, samedi: w('10:00', '18:00'), dimanche: off,
    },
    'Cyril Ramananjaona': {
      lundi: w('09:00', '17:00'), mardi: off, mercredi: w('09:00', '17:00'),
      jeudi: w('09:00', '17:00'), vendredi: w('13:00', '21:00'), samedi: off, dimanche: off,
    },
    'Vivien Frebourg': {
      lundi: w('09:00', '17:00'), mardi: w('09:00', '17:00'), mercredi: w('09:00', '17:00'),
      jeudi: w('09:00', '17:00'), vendredi: w('09:00', '17:00'), samedi: off, dimanche: off,
    },
    'Nassuif': {
      lundi: w('16:00', '21:00'), mardi: w('16:00', '21:00'), mercredi: w('09:00', '17:00'),
      jeudi: w('16:00', '21:00'), vendredi: off, samedi: off, dimanche: off,
    },
  },
  // ── Semaine 2 (type S16) ──
  {
    'Bastien Lagrue': {
      lundi: w('09:00', '17:00'), mardi: w('09:00', '17:00'), mercredi: w('09:00', '17:00'),
      jeudi: w('09:00', '17:00'), vendredi: w('09:00', '17:00'), samedi: off, dimanche: off,
    },
    'Maxime Dubois': {
      lundi: w('09:00', '17:00'), mardi: w('09:00', '17:00'), mercredi: w('13:00', '21:00'),
      jeudi: w('09:00', '17:00'), vendredi: w('09:00', '17:00'), samedi: off, dimanche: off,
    },
    'Cyril Ramananjaona': {
      lundi: w('09:00', '17:00'), mardi: off, mercredi: w('09:00', '17:00'),
      jeudi: w('09:00', '17:00'), vendredi: w('13:00', '21:00'), samedi: off, dimanche: off,
    },
    'Vivien Frebourg': {
      lundi: w('09:00', '17:00'), mardi: w('09:00', '17:00'), mercredi: off,
      jeudi: w('09:00', '17:00'), vendredi: w('09:00', '17:00'), samedi: w('10:00', '18:00'), dimanche: off,
    },
    'Nassuif': {
      lundi: w('16:00', '21:00'), mardi: w('16:00', '21:00'), mercredi: w('09:00', '17:00'),
      jeudi: w('16:00', '21:00'), vendredi: off, samedi: off, dimanche: off,
    },
  },
  // ── Semaine 3 (type S17) ──
  {
    'Bastien Lagrue': {
      lundi: w('09:00', '17:00'), mardi: w('09:00', '17:00'), mercredi: w('09:00', '17:00'),
      jeudi: w('09:00', '17:00'), vendredi: w('09:00', '17:00'), samedi: off, dimanche: off,
    },
    'Maxime Dubois': {
      lundi: w('09:00', '17:00'), mardi: w('09:00', '17:00'), mercredi: w('13:00', '21:00'),
      jeudi: w('09:00', '17:00'), vendredi: w('09:00', '17:00'), samedi: off, dimanche: off,
    },
    'Cyril Ramananjaona': {
      lundi: w('09:00', '17:00'), mardi: off, mercredi: off,
      jeudi: w('09:00', '17:00'), vendredi: w('13:00', '21:00'), samedi: w('10:00', '18:00'), dimanche: off,
    },
    'Vivien Frebourg': {
      lundi: w('09:00', '17:00'), mardi: w('09:00', '17:00'), mercredi: w('09:00', '17:00'),
      jeudi: w('09:00', '17:00'), vendredi: w('09:00', '17:00'), samedi: off, dimanche: off,
    },
    'Nassuif': {
      lundi: w('16:00', '21:00'), mardi: w('16:00', '21:00'), mercredi: w('09:00', '17:00'),
      jeudi: w('16:00', '21:00'), vendredi: off, samedi: off, dimanche: off,
    },
  },
];

/** Ouvreurs piscine (08:00–16:00) — un seul par jour, cf. ancien commentaire. */
const PISCINE_OPENERS: Record<number, Record<string, string>> = {
  0: { lundi: 'Cyril Ramananjaona', mardi: 'Maxime Dubois', mercredi: 'Vivien Frebourg', jeudi: 'Cyril Ramananjaona', vendredi: 'Vivien Frebourg' },
  1: { lundi: 'Maxime Dubois', mardi: 'Vivien Frebourg', mercredi: 'Cyril Ramananjaona', jeudi: 'Vivien Frebourg', vendredi: 'Maxime Dubois' },
  2: { lundi: 'Cyril Ramananjaona', mardi: 'Maxime Dubois', mercredi: 'Vivien Frebourg', jeudi: 'Cyril Ramananjaona', vendredi: 'Maxime Dubois' },
};

function buildPiscineWeeks(): NamedWeek[] {
  const weeks: NamedWeek[] = JSON.parse(JSON.stringify(STANDARD_WEEKS));
  weeks.forEach((week, i) => {
    const openers = PISCINE_OPENERS[i];
    if (!openers) return;
    for (const [day, name] of Object.entries(openers)) {
      if (week[name]) week[name][day] = w('08:00', '16:00');
    }
  });
  return weeks;
}

/** Résout les semaines clé-par-nom en clé-par-employeeId (noms inconnus ignorés). */
async function resolveNamedWeeks(named: NamedWeek[]): Promise<RotationWeek[]> {
  const employees = await getEmployees();
  const idByName = new Map(employees.map((e) => [e.name, e.id]));
  return named.map((week) => {
    const resolved: RotationWeek = {};
    for (const [name, days] of Object.entries(week)) {
      const id = idByName.get(name);
      if (id) resolved[id] = days;
    }
    return resolved;
  });
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function listRotations(): Promise<Rotation[]> {
  return db.select().from(rotations).orderBy(rotations.name).execute();
}

export async function getRotationById(id: number): Promise<Rotation | null> {
  const rows = await db.select().from(rotations).where(eq(rotations.id, id)).limit(1).execute();
  return rows[0] ?? null;
}

/** Normalise/valide les semaines reçues de l'API (jours connus, slots propres). */
export function sanitizeWeeks(weeks: unknown): RotationWeek[] | null {
  if (!Array.isArray(weeks) || weeks.length === 0 || weeks.length > 12) return null;
  const out: RotationWeek[] = [];
  for (const week of weeks) {
    if (!week || typeof week !== 'object' || Array.isArray(week)) return null;
    const cleanWeek: RotationWeek = {};
    for (const [employeeId, days] of Object.entries(week as Record<string, unknown>)) {
      if (!days || typeof days !== 'object' || Array.isArray(days)) return null;
      const cleanDays: Record<string, RotationSlot[]> = {};
      for (const day of DAYS) {
        const slots = (days as Record<string, unknown>)[day];
        if (slots === undefined) {
          cleanDays[day] = [];
          continue;
        }
        if (!Array.isArray(slots)) return null;
        const cleanSlots: RotationSlot[] = [];
        for (const s of slots) {
          const slot = s as Partial<RotationSlot>;
          if (
            typeof slot?.start !== 'string' ||
            typeof slot?.end !== 'string' ||
            !/^\d{2}:\d{2}$/.test(slot.start) ||
            !/^\d{2}:\d{2}$/.test(slot.end)
          ) {
            return null;
          }
          cleanSlots.push({ start: slot.start, end: slot.end, isWorking: true, type: 'work' });
        }
        cleanDays[day] = cleanSlots;
      }
      cleanWeek[employeeId] = cleanDays;
    }
    out.push(cleanWeek);
  }
  return out;
}

export async function createRotation(
  name: string,
  weeks: RotationWeek[],
  description?: string | null,
): Promise<Rotation> {
  const rows = await db
    .insert(rotations)
    .values({ name, weeks, description: description ?? null })
    .returning()
    .execute();
  return rows[0];
}

export async function updateRotation(
  id: number,
  fields: { name?: string; weeks?: RotationWeek[]; description?: string | null },
): Promise<Rotation | null> {
  const rows = await db
    .update(rotations)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(rotations.id, id))
    .returning()
    .execute();
  return rows[0] ?? null;
}

export async function deleteRotation(id: number): Promise<boolean> {
  const rows = await db.delete(rotations).where(eq(rotations.id, id)).returning({ id: rotations.id }).execute();
  return rows.length > 0;
}

/**
 * Seed idempotent : si la table est vide, crée « Standard » et « Piscine »
 * depuis les anciens templates hardcodés (résolus en employeeId).
 */
export async function seedDefaultRotationsIfEmpty(): Promise<void> {
  const existing = await db.select({ id: rotations.id }).from(rotations).limit(1).execute();
  if (existing.length > 0) return;

  const [standard, piscine] = await Promise.all([
    resolveNamedWeeks(STANDARD_WEEKS),
    resolveNamedWeeks(buildPiscineWeeks()),
  ]);

  await db
    .insert(rotations)
    .values([
      {
        name: 'Standard',
        description: 'Roulement 3 semaines — horaires standards (09h-17h, fermetures 13h-21h, permanence 16h-21h).',
        weeks: standard,
      },
      {
        name: 'Piscine',
        description: 'Roulement 3 semaines — un ouvreur par jour à 08h-16h (Vivien/Cyril/Maxime), reste identique au Standard.',
        weeks: piscine,
      },
    ])
    .onConflictDoNothing()
    .execute();
}
