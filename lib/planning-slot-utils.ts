/**
 * Pure utility functions for planning slot management.
 * Handles merging, validation, erasing, and overlap prevention.
 */

export interface SlotLike {
  start: string;
  end: string;
  isWorking: boolean;
  type: string;
}

// ─── Time helpers ────────────────────────────────────────────

/** Convert "HH:MM" to total minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Convert total minutes to "HH:MM" */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, minutes);
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Snap minutes to nearest 15-min increment */
export function snapTo15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

// ─── mergeSlots ──────────────────────────────────────────────

/**
 * Merge a new slot into an existing array of slots.
 *
 * Phase 1: Same-type slots that overlap or touch the new slot are merged
 * into one combined slot covering the union of all ranges.
 *
 * Phase 2: Different-type slots that overlap the new slot are trimmed/split.
 * The new slot "eats" the overlapping portion.
 */
export function mergeSlots<T extends SlotLike>(existingSlots: T[], newSlot: T): T[] {
  const newStart = timeToMinutes(newSlot.start);
  const newEnd = timeToMinutes(newSlot.end);
  if (newEnd <= newStart) return existingSlots;

  const sameType: T[] = [];
  const diffType: T[] = [];

  for (const slot of existingSlots) {
    if (slot.type === newSlot.type) {
      sameType.push(slot);
    } else {
      diffType.push(slot);
    }
  }

  // Phase 1: Merge same-type overlapping/adjacent
  let mergedStart = newStart;
  let mergedEnd = newEnd;
  const nonOverlappingSame: T[] = [];

  for (const slot of sameType) {
    const sStart = timeToMinutes(slot.start);
    const sEnd = timeToMinutes(slot.end);
    // Overlapping or adjacent (touching endpoints count)
    if (sStart <= mergedEnd && sEnd >= mergedStart) {
      mergedStart = Math.min(mergedStart, sStart);
      mergedEnd = Math.max(mergedEnd, sEnd);
    } else {
      nonOverlappingSame.push(slot);
    }
  }

  const mergedSlot: T = {
    ...newSlot,
    start: minutesToTime(mergedStart),
    end: minutesToTime(mergedEnd),
  };

  // Phase 2: Subtract new slot range from different-type slots
  const trimmedDiff: T[] = [];
  for (const slot of diffType) {
    const sStart = timeToMinutes(slot.start);
    const sEnd = timeToMinutes(slot.end);

    if (sEnd <= newStart || sStart >= newEnd) {
      // No overlap
      trimmedDiff.push(slot);
    } else {
      // Left remnant
      if (sStart < newStart) {
        trimmedDiff.push({ ...slot, start: slot.start, end: minutesToTime(newStart) });
      }
      // Right remnant
      if (sEnd > newEnd) {
        trimmedDiff.push({ ...slot, start: minutesToTime(newEnd), end: slot.end });
      }
      // Entirely consumed slots are dropped
    }
  }

  return [...trimmedDiff, ...nonOverlappingSame, mergedSlot];
}

// ─── validateSlots ───────────────────────────────────────────

/**
 * Clean up invalid slots:
 * - Remove zero-duration or negative-duration slots
 * - Remove slots entirely outside grid bounds
 * - Clamp slots to grid bounds
 */
export function validateSlots<T extends SlotLike>(slots: T[], gridStartMin: number, gridEndMin: number): T[] {
  const result: T[] = [];
  for (const slot of slots) {
    let startMin = timeToMinutes(slot.start);
    let endMin = timeToMinutes(slot.end);

    // Clamp to grid
    startMin = Math.max(startMin, gridStartMin);
    endMin = Math.min(endMin, gridEndMin);

    // Skip invalid
    if (endMin <= startMin) continue;

    result.push({
      ...slot,
      start: minutesToTime(startMin),
      end: minutesToTime(endMin),
    });
  }
  return result;
}

// ─── eraseRange ──────────────────────────────────────────────

/**
 * Subtract a time range from all slots (used for erase-mode drag).
 */
export function eraseRange<T extends SlotLike>(existingSlots: T[], eraseStart: string, eraseEnd: string): T[] {
  const eStart = timeToMinutes(eraseStart);
  const eEnd = timeToMinutes(eraseEnd);
  const result: T[] = [];

  for (const slot of existingSlots) {
    const sStart = timeToMinutes(slot.start);
    const sEnd = timeToMinutes(slot.end);

    if (sEnd <= eStart || sStart >= eEnd) {
      result.push(slot); // no overlap
    } else {
      // Left remnant
      if (sStart < eStart) {
        result.push({ ...slot, end: minutesToTime(eStart) });
      }
      // Right remnant
      if (sEnd > eEnd) {
        result.push({ ...slot, start: minutesToTime(eEnd) });
      }
    }
  }
  return result;
}

// ─── clampSlotAgainstOthers ──────────────────────────────────

/**
 * For drag/resize: prevent a slot from overlapping other slots of the
 * same employee on the same day. Returns the clamped start/end in minutes.
 */
export function clampSlotAgainstOthers(
  slots: SlotLike[],
  movingIndex: number,
  newStartMin: number,
  newEndMin: number,
  gridStartMin: number,
  gridEndMin: number
): { start: number; end: number } {
  const duration = newEndMin - newStartMin;
  let start = newStartMin;
  let end = newEndMin;

  // Clamp to grid
  if (start < gridStartMin) { start = gridStartMin; end = start + duration; }
  if (end > gridEndMin) { end = gridEndMin; start = end - duration; }

  // Collect other slots of DIFFERENT type sorted by start
  // Same-type slots are allowed to overlap (they'll be consolidated/merged after)
  const movingType = slots[movingIndex]?.type;
  const others = slots
    .map((s, i) => ({ start: timeToMinutes(s.start), end: timeToMinutes(s.end), index: i, type: s.type }))
    .filter((s) => s.index !== movingIndex && s.type !== movingType)
    .sort((a, b) => a.start - b.start);

  for (const other of others) {
    if (start < other.end && end > other.start) {
      // Overlap detected — push in the direction that requires less movement
      const pushRight = other.end - start;
      const pushLeft = end - other.start;
      if (pushRight <= pushLeft) {
        start = other.end;
        end = start + duration;
      } else {
        end = other.start;
        start = end - duration;
      }
    }
  }

  // Re-clamp to grid after push
  start = Math.max(start, gridStartMin);
  end = Math.min(end, gridEndMin);

  return { start, end };
}

// ─── consolidateSlots ────────────────────────────────────────

/**
 * Merge all adjacent/overlapping same-type slots within an array.
 * Used after drag/resize to auto-join slots that now touch.
 */
export function consolidateSlots<T extends SlotLike>(slots: T[]): T[] {
  if (slots.length <= 1) return slots;

  // Group by type
  const byType = new Map<string, T[]>();
  for (const slot of slots) {
    const group = byType.get(slot.type) || [];
    group.push(slot);
    byType.set(slot.type, group);
  }

  const result: T[] = [];
  for (const [, group] of byType) {
    const sorted = [...group].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    const merged: T[] = [];
    for (const slot of sorted) {
      const last = merged[merged.length - 1];
      if (last && timeToMinutes(slot.start) <= timeToMinutes(last.end)) {
        // Overlapping or adjacent — extend the previous slot
        merged[merged.length - 1] = {
          ...last,
          end: minutesToTime(Math.max(timeToMinutes(last.end), timeToMinutes(slot.end))),
        };
      } else {
        merged.push({ ...slot });
      }
    }
    result.push(...merged);
  }
  return result;
}

/**
 * For resize: clamp the resizing edge against adjacent slots.
 */
export function clampResizeAgainstOthers(
  slots: SlotLike[],
  resizingIndex: number,
  edge: 'start' | 'end',
  newValue: number,
  gridStartMin: number,
  gridEndMin: number
): number {
  let clamped = newValue;

  // Grid bounds
  clamped = Math.max(clamped, gridStartMin);
  clamped = Math.min(clamped, gridEndMin);

  // Only clamp against different-type slots; same-type will be consolidated after
  const resizingType = slots[resizingIndex]?.type;
  for (let i = 0; i < slots.length; i++) {
    if (i === resizingIndex || slots[i].type === resizingType) continue;
    const oStart = timeToMinutes(slots[i].start);
    const oEnd = timeToMinutes(slots[i].end);

    if (edge === 'end' && clamped > oStart && timeToMinutes(slots[resizingIndex].start) < oStart) {
      clamped = Math.min(clamped, oStart);
    }
    if (edge === 'start' && clamped < oEnd && timeToMinutes(slots[resizingIndex].end) > oEnd) {
      clamped = Math.max(clamped, oEnd);
    }
  }

  return clamped;
}
