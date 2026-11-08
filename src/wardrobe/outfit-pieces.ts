interface PieceGarment {
  id: number;
}

/**
 * An outfit's garments in the order they were arranged in its slots.
 * Garments missing from the slots, as in older outfits, follow at the end.
 */
export function orderOutfitPieces<T extends PieceGarment>(
  garments: T[],
  slots?: { garmentId: number | null }[] | null,
): T[] {
  const position = new Map<number, number>();
  (slots ?? []).forEach((slot, index) => {
    if (slot.garmentId != null && !position.has(slot.garmentId)) {
      position.set(slot.garmentId, index);
    }
  });
  const rank = (g: T) => position.get(g.id) ?? Number.MAX_SAFE_INTEGER;
  return [...garments].sort((a, b) => rank(a) - rank(b));
}
