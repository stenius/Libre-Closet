export interface WearEvent {
  garmentId: number;
  /** YYYY-MM-DD */
  day: string;
}

export interface WearStat {
  garmentId: number;
  name: string | null;
  category: string;
  wearCount: number;
  lastWorn: string | null;
}

/**
 * Counts each garment at most once per day, so a direct log and a worn
 * outfit on the same day aren't double counted. Never-worn garments sort
 * first, then the longest since last worn.
 */
export function computeWearStats(
  garments: { id: number; name?: string | null; category: string }[],
  events: WearEvent[],
): WearStat[] {
  const days = new Map<number, Set<string>>();
  for (const { garmentId, day } of events) {
    if (!days.has(garmentId)) days.set(garmentId, new Set());
    days.get(garmentId)!.add(day);
  }

  return garments
    .map((garment) => {
      const worn = [...(days.get(garment.id) ?? [])].sort();
      return {
        garmentId: garment.id,
        name: garment.name ?? null,
        category: garment.category,
        wearCount: worn.length,
        lastWorn: worn.at(-1) ?? null,
      };
    })
    .sort((a, b) => (a.lastWorn ?? '').localeCompare(b.lastWorn ?? ''));
}
