import { NextResponse } from 'next/server';
import { addPromotion, deletePromotion } from '@/lib/db/services/promotions';
import { dbRowToPromoConfig } from '@/lib/config/promotions';
import {
  upsertPromoConfig,
  deletePromoConfig,
  getPromoConfigByKey,
  getAllPromoConfig,
} from '@/lib/db/services/promoConfig';
import { db } from '@/lib/db/config';
import { promotions, delayStatus } from '@/lib/db/schema/promotions';
import { eq } from 'drizzle-orm';
import { CACHE_TAGS, invalidate } from '@/lib/cache';

function isDateValid(date: string): boolean {
  return !isNaN(Date.parse(date));
}

function isDateInRange(date: string, start: string, end: string): boolean {
  if (!isDateValid(date)) return false;
  const d = new Date(date);
  return d >= new Date(start) && d <= new Date(end);
}

// Normalize optional piscine dates: the form sends '' for empty fields and
// legacy callers send 'NaN'. The DB column is `date NULL`, both must map to null.
function toDateOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || s === 'NaN') return null;
  return s;
}

interface PromoDatesInput {
  start: string;
  end: string;
  piscineJsStart: string;
  piscineJsEnd: string;
  piscineRustJavaStart: string;
  piscineRustJavaEnd: string;
}

/**
 * Shared validation for the promotion main + piscine dates. Used by both POST
 * (create) and PATCH (edit) so the rules stay identical:
 *   - main start/end valid and ordered
 *   - piscine dates (when present) inside [start, end]
 *   - each piscine start before its end
 *   - JS piscine ends before Rust/Java piscine starts
 * Returns a list of human-readable error messages (empty = valid).
 */
function validatePromoDates({
  start,
  end,
  piscineJsStart,
  piscineJsEnd,
  piscineRustJavaStart,
  piscineRustJavaEnd,
}: PromoDatesInput): string[] {
  const errors: string[] = [];

  if (!isDateValid(start) || !isDateValid(end)) {
    errors.push('Les dates de début ou de fin sont invalides.');
    return errors;
  }

  if (new Date(start) >= new Date(end)) {
    errors.push('La date de début doit être avant la date de fin.');
  }

  if (piscineJsStart !== '' && piscineJsStart !== 'NaN' && !isDateInRange(piscineJsStart, start, end)) {
    errors.push('La date de début de la piscine JS doit être comprise entre le début et la fin de la promotion.');
  }

  if (piscineJsEnd !== '' && piscineJsEnd !== 'NaN' && !isDateInRange(piscineJsEnd, start, end)) {
    errors.push('La date de fin de la piscine JS doit être comprise entre le début et la fin de la promotion.');
  }

  if (piscineRustJavaStart !== '' && piscineRustJavaStart !== 'NaN' && !isDateInRange(piscineRustJavaStart, start, end)) {
    errors.push('La date de début de la piscine Rust/Java doit être comprise entre le début et la fin de la promotion.');
  }

  if (piscineRustJavaEnd !== '' && piscineRustJavaEnd !== 'NaN' && !isDateInRange(piscineRustJavaEnd, start, end)) {
    errors.push('La date de fin de la piscine Rust/Java doit être comprise entre le début et la fin de la promotion.');
  }

  if (piscineJsStart !== '' && piscineJsStart !== 'NaN' && piscineJsEnd !== '' && piscineJsEnd !== 'NaN' && new Date(piscineJsStart) >= new Date(piscineJsEnd)) {
    errors.push('La date de début de la piscine JS doit être avant la date de fin.');
  }

  if (piscineRustJavaStart !== '' && piscineRustJavaStart !== 'NaN' && piscineRustJavaEnd !== '' && piscineRustJavaEnd !== 'NaN' && new Date(piscineRustJavaStart) >= new Date(piscineRustJavaEnd)) {
    errors.push('La date de début de la piscine Rust/Java doit être avant la date de fin.');
  }

  if (
    piscineJsEnd !== '' && piscineJsEnd !== 'NaN' &&
    piscineRustJavaStart !== '' && piscineRustJavaStart !== 'NaN'
  ) {
    if (new Date(piscineJsEnd) >= new Date(piscineRustJavaStart)) {
      errors.push('La piscine JS doit se terminer avant le début de la piscine Rust/Java.');
    }
  }

  return errors;
}

export async function GET(req: Request) {
  try {
    // Admin /config page needs fresh data — bypass the cached getAllPromotions().
    // Also surface "orphan" rows: promotions present in `promotions` but missing
    // from `promoConfig`, so the admin can complete or delete them instead of
    // hitting silent 400s when adding a promo whose row already exists.
    const [configRows, promoRows] = await Promise.all([
      getAllPromoConfig(),
      db
        .select({ promoId: promotions.promoId, name: promotions.name })
        .from(promotions)
        .execute(),
    ]);

    const configKeys = new Set(configRows.map((r) => r.key));
    const orphans = promoRows
      .filter((p) => !configKeys.has(p.name))
      .map((p) => ({
        key: p.name,
        eventId: Number(p.promoId),
        title: p.name,
        dates: {
          start: '',
          'piscine-js-start': 'NaN',
          'piscine-js-end': 'NaN',
          'piscine-rust-java-start': 'NaN',
          'piscine-rust-java-end': 'NaN',
          end: '',
        },
        incomplete: true,
      }));

    const promos = [...configRows.map(dbRowToPromoConfig), ...orphans];
    return NextResponse.json({ promos }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des promos :', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de la récupération des promotions.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const newPromo = await req.json();
    const {
      key,
      eventId,
      title,
      dates: {
        start = '',
        end = '',
        'piscine-js-start': piscineJsStart = 'NaN',
        'piscine-js-end': piscineJsEnd = 'NaN',
        'piscine-rust-java-start': piscineRustJavaStart = 'NaN',
        'piscine-rust-java-end': piscineRustJavaEnd = 'NaN',
      } = {},
    } = newPromo;

    if (!key || !eventId || !title || !start || !end) {
      return NextResponse.json(
        { error: 'Les champs obligatoires (clé, ID, titre, début et fin) doivent être remplis.' },
        { status: 400 }
      );
    }

    const errorMessages = validatePromoDates({
      start,
      end,
      piscineJsStart,
      piscineJsEnd,
      piscineRustJavaStart,
      piscineRustJavaEnd,
    });

    if (errorMessages.length > 0) {
      return NextResponse.json(
        { error: errorMessages.join(' ') },
        { status: 400 }
      );
    }

    // Check for conflicts in promoConfig DB — true duplicate, refuse.
    const existing = await getPromoConfigByKey(key);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Une promotion avec le même key existe déjà.` },
        { status: 400 }
      );
    }

    // Check `promotions` table state. Three cases:
    //   1. No row → add it.
    //   2. Row exists with the SAME name → orphan to complete (skip insert,
    //      keep going to upsertPromoConfig below).
    //   3. Row exists with a DIFFERENT name → real conflict on eventId.
    const existingPromo = await db
      .select({ promoId: promotions.promoId, name: promotions.name })
      .from(promotions)
      .where(eq(promotions.promoId, String(eventId)))
      .execute();

    if (existingPromo.length === 0) {
      const dbResult = await addPromotion(String(eventId), key);
      if (dbResult.includes('existe déjà')) {
        return NextResponse.json(
          { error: `Une promotion avec cet ID existe déjà dans la base de données.` },
          { status: 400 }
        );
      }
    } else if (existingPromo[0].name !== key) {
      return NextResponse.json(
        {
          error: `L'ID ${eventId} est déjà utilisé par la promotion "${existingPromo[0].name}". Choisis un autre ID ou supprime l'existante d'abord.`,
        },
        { status: 400 }
      );
    }
    // else: orphan with matching name — fall through to upsertPromoConfig.

    // Add to promoConfig table
    await upsertPromoConfig({
      key,
      eventId: Number(eventId),
      title,
      start,
      end,
      piscineJsStart: toDateOrNull(piscineJsStart),
      piscineJsEnd: toDateOrNull(piscineJsEnd),
      piscineRustStart: toDateOrNull(piscineRustJavaStart),
      piscineRustEnd: toDateOrNull(piscineRustJavaEnd),
    });
    invalidate(CACHE_TAGS.promotions, CACHE_TAGS.widgetsOverview);

    return NextResponse.json(
      { message: 'Promotion ajoutée avec succès.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la promo :', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de l\'ajout de la promotion.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      key,
      eventId,
      title,
      dates: {
        start = '',
        end = '',
        'piscine-js-start': piscineJsStart = 'NaN',
        'piscine-js-end': piscineJsEnd = 'NaN',
        'piscine-rust-java-start': piscineRustJavaStart = 'NaN',
        'piscine-rust-java-end': piscineRustJavaEnd = 'NaN',
      } = {},
    } = body;

    if (!key || !eventId || !title || !start || !end) {
      return NextResponse.json(
        { error: 'Les champs obligatoires (clé, ID, titre, début et fin) doivent être remplis.' },
        { status: 400 }
      );
    }

    // The PATCH only edits an existing promo identified by `key`. Changing the
    // key itself is a delete+recreate operation handled by POST.
    const existing = await getPromoConfigByKey(key);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Aucune promotion trouvée avec cette clé. Pour changer la clé, supprime puis recrée la promotion.' },
        { status: 404 }
      );
    }

    const errorMessages = validatePromoDates({
      start,
      end,
      piscineJsStart,
      piscineJsEnd,
      piscineRustJavaStart,
      piscineRustJavaEnd,
    });

    if (errorMessages.length > 0) {
      return NextResponse.json(
        { error: errorMessages.join(' ') },
        { status: 400 }
      );
    }

    // eventId uniqueness: a row in `promotions` carrying this eventId must
    // belong to the promo being edited (name === key). Otherwise it's a clash.
    const existingPromo = await db
      .select({ promoId: promotions.promoId, name: promotions.name })
      .from(promotions)
      .where(eq(promotions.promoId, String(eventId)))
      .execute();

    if (existingPromo.length > 0 && existingPromo[0].name !== key) {
      return NextResponse.json(
        {
          error: `L'ID ${eventId} est déjà utilisé par la promotion "${existingPromo[0].name}". Choisis un autre ID ou supprime l'existante d'abord.`,
        },
        { status: 400 }
      );
    }

    // Keep the `promotions` table in sync with the (possibly new) eventId.
    // The row is keyed by name (= key). `promotions.promoId` is a primary key
    // referenced by `delays_status.promoId` (no cascade), so changing it while
    // delay rows exist would violate the FK. Guard against that.
    const rowForKey = await db
      .select({ promoId: promotions.promoId, name: promotions.name })
      .from(promotions)
      .where(eq(promotions.name, key))
      .execute();

    if (rowForKey.length === 0) {
      // No promotions row yet (orphan/incomplete) — create it with this eventId.
      await addPromotion(String(eventId), key);
    } else if (rowForKey[0].promoId !== String(eventId)) {
      // eventId actually changed: only allow it if nothing references the old id.
      const referencing = await db
        .select({ id: delayStatus.id })
        .from(delayStatus)
        .where(eq(delayStatus.promoId, rowForKey[0].promoId))
        .execute();

      if (referencing.length > 0) {
        return NextResponse.json(
          {
            error: `Impossible de changer l'ID de cette promotion : des données de suivi y sont déjà rattachées. Supprime puis recrée la promotion pour changer son ID.`,
          },
          { status: 400 }
        );
      }

      await db
        .update(promotions)
        .set({ promoId: String(eventId) })
        .where(eq(promotions.name, key))
        .execute();
    }

    await upsertPromoConfig({
      key,
      eventId: Number(eventId),
      title,
      start,
      end,
      piscineJsStart: toDateOrNull(piscineJsStart),
      piscineJsEnd: toDateOrNull(piscineJsEnd),
      piscineRustStart: toDateOrNull(piscineRustJavaStart),
      piscineRustEnd: toDateOrNull(piscineRustJavaEnd),
    });
    invalidate(CACHE_TAGS.promotions, CACHE_TAGS.widgetsOverview);

    return NextResponse.json(
      { message: 'Promotion mise à jour avec succès.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la promo :', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de la mise à jour de la promotion.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { error: 'La clé de la promotion est requise.' },
        { status: 400 }
      );
    }

    const existing = await getPromoConfigByKey(key);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Aucune promotion trouvée avec cette clé.' },
        { status: 404 }
      );
    }

    const dbResult = await deletePromotion(key);
    if (dbResult.includes('n\'existe pas')) {
      return NextResponse.json(
        { error: 'La promotion n\'existe pas dans la base de données.' },
        { status: 404 }
      );
    }

    await deletePromoConfig(key);
    invalidate(CACHE_TAGS.promotions, CACHE_TAGS.widgetsOverview);

    return NextResponse.json(
      { message: 'Promotion supprimée avec succès.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de la promo :', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de la suppression de la promotion.' },
      { status: 500 }
    );
  }
}
