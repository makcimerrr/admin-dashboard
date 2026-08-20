import { zone01Graphql } from './zone01-graphql';

/**
 * Lecture des piscines de sélection (piscine-go) depuis le GraphQL Zone01.
 *
 * Ces données concernent des CANDIDATS, pas des apprenants : ils n'existent
 * pas dans `students` et ne doivent pas y être créés.
 *
 * Structure côté Zone01 :
 *   event racine `/rouen/piscine-go`      → une session de sélection
 *     ├─ event enfant `exam-01`, `quad`…  → un exercice noté / un examen
 *     ├─ progress (sur la racine)         → les exercices du quotidien
 *     ├─ event_user                       → le roster, avec le niveau atteint
 *     └─ result type `admin_selection`    → la décision d'admission (1 = admis)
 *
 * Tout est paginé : une session dépasse largement la limite par requête.
 */

/** Chemins suivis : la sélection Go et ses sessions de rattrapage. */
const PISCINE_PATH_PATTERN = '/rouen/piscine-go%';

const PAGE_SIZE = 500;

export interface PiscineSessionRaw {
  id: number;
  path: string | null;
  startAt: string | null;
  endAt: string | null;
}

export interface PiscineParticipantRaw {
  userLogin: string;
  level: number | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface PiscineProgressRaw {
  userLogin: string;
  grade: number | null;
  isDone: boolean;
  updatedAt: string | null;
  objectName: string | null;
  objectType: string | null;
  eventId: number | null;
}

export interface PiscineAdmissionRaw {
  userLogin: string;
  /** 1 = admis, 0 = refusé. */
  grade: number | null;
}

/** Pagine une requête jusqu'à épuisement (Hasura n'a pas de curseur ici). */
async function paginate<T>(
  run: (limit: number, offset: number) => Promise<T[]>,
): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await run(PAGE_SIZE, offset);
    all.push(...page);
    if (page.length < PAGE_SIZE) return all;
    // Garde-fou : une session ne dépasse pas cet ordre de grandeur ; au-delà,
    // c'est que le filtre est faux — mieux vaut s'arrêter que boucler.
    if (all.length >= 50_000) return all;
  }
}

/** Sessions de piscine-go (événements racines), de la plus récente à la plus ancienne. */
export async function fetchPiscineSessions(): Promise<PiscineSessionRaw[]> {
  const data = await zone01Graphql<{ event: PiscineSessionRaw[] }>(
    `query($p:String!) {
      event(
        where: { parentId: { _is_null: true }, path: { _like: $p } }
        order_by: { startAt: desc }
        limit: 100
      ) { id path startAt endAt }
    }`,
    { p: PISCINE_PATH_PATTERN },
  );
  return data.event;
}

/** Sous-événements d'une session : exercices notés et examens. */
export async function fetchSessionChildEvents(sessionId: number): Promise<PiscineSessionRaw[]> {
  const data = await zone01Graphql<{ event: PiscineSessionRaw[] }>(
    `query($p:Int!) {
      event(where: { parentId: { _eq: $p } }, order_by: { startAt: asc }) {
        id path startAt endAt
      }
    }`,
    { p: sessionId },
  );
  return data.event;
}

/**
 * Roster de la session : tous ceux qui y ont mis les pieds, avec leur niveau.
 *
 * C'est la source de vérité du périmètre — plus large que « ceux qui ont
 * produit une progression », et c'est justement l'écart qui révèle les
 * décrocheurs.
 */
export async function fetchSessionParticipants(
  sessionId: number,
): Promise<PiscineParticipantRaw[]> {
  const rows = await paginate<{
    userLogin: string;
    level: number | null;
    user: { firstName: string | null; lastName: string | null; email: string | null } | null;
  }>(async (limit, offset) => {
    const data = await zone01Graphql<{ event_user: any[] }>(
      `query($e:Int!, $l:Int!, $o:Int!) {
        event_user(
          where: { eventId: { _eq: $e } }
          order_by: { userLogin: asc }
          limit: $l offset: $o
        ) {
          userLogin level
          user { firstName lastName email }
        }
      }`,
      { e: sessionId, l: limit, o: offset },
    );
    return data.event_user;
  });

  return rows.map((r) => ({
    userLogin: r.userLogin,
    level: r.level,
    firstName: r.user?.firstName ?? null,
    lastName: r.user?.lastName ?? null,
    email: r.user?.email ?? null,
  }));
}

/**
 * Progressions sur la session ET ses sous-événements : un enregistrement par
 * (candidat, exercice). Zone01 en produit plusieurs pour un même exercice
 * repassé — le dédoublonnage se fait à l'écriture, en gardant le plus récent.
 */
export async function fetchSessionProgress(eventIds: number[]): Promise<PiscineProgressRaw[]> {
  if (eventIds.length === 0) return [];

  const rows = await paginate<{
    userLogin: string;
    grade: number | null;
    isDone: boolean;
    updatedAt: string | null;
    eventId: number | null;
    object: { name: string | null; type: string | null } | null;
  }>(async (limit, offset) => {
    const data = await zone01Graphql<{ progress: any[] }>(
      `query($ids:[Int!], $l:Int!, $o:Int!) {
        progress(
          where: { eventId: { _in: $ids } }
          order_by: [{ userLogin: asc }, { updatedAt: asc }]
          limit: $l offset: $o
        ) {
          userLogin grade isDone updatedAt eventId
          object { name type }
        }
      }`,
      { ids: eventIds, l: limit, o: offset },
    );
    return data.progress;
  });

  return rows.map((r) => ({
    userLogin: r.userLogin,
    grade: r.grade,
    isDone: r.isDone,
    updatedAt: r.updatedAt,
    objectName: r.object?.name ?? null,
    objectType: r.object?.type ?? null,
    eventId: r.eventId,
  }));
}

/**
 * Décisions d'admission de la session (`result.type = 'admin_selection'`).
 *
 * C'est la donnée qui fait foi : inutile de recalculer un « statut global »
 * à partir des notes, la plateforme porte déjà la décision.
 */
export async function fetchSessionAdmissions(
  sessionId: number,
): Promise<PiscineAdmissionRaw[]> {
  const rows = await paginate<{ userLogin: string | null; grade: number | null }>(
    async (limit, offset) => {
      const data = await zone01Graphql<{ result: any[] }>(
        `query($e:Int!, $l:Int!, $o:Int!) {
          result(
            where: { eventId: { _eq: $e }, type: { _eq: "admin_selection" } }
            order_by: { userLogin: asc }
            limit: $l offset: $o
          ) { userLogin grade }
        }`,
        { e: sessionId, l: limit, o: offset },
      );
      return data.result;
    },
  );

  return rows
    .filter((r): r is { userLogin: string; grade: number | null } => Boolean(r.userLogin))
    .map((r) => ({ userLogin: r.userLogin, grade: r.grade }));
}
