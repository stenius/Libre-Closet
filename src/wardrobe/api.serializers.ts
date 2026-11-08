import { Garment } from '../dal/entity/garment.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { Outfit } from '../dal/entity/outfit.entity';

function splitColors(color?: string | null): string[] {
  return (
    color
      ?.split(',')
      .map((c) => c.trim())
      .filter(Boolean) ?? []
  );
}

function isoDate(date?: Date | null): string | null {
  return date ? new Date(date).toISOString().slice(0, 10) : null;
}

/** Explicit field list, so entity additions never leak through the API. */
export function serializeGarment(garment: Garment) {
  return {
    id: garment.id,
    name: garment.name ?? null,
    category: garment.category,
    brand: garment.brand || null,
    colors: splitColors(garment.color),
    size: garment.size ?? null,
    notes: garment.notes ?? null,
    washingDetails: garment.washingDetails ?? null,
    dateAcquired: isoDate(garment.dateAquired),
    archived: garment.archived,
    photo: garment.photo?.fileName ?? null,
    materials: garment.materials ?? null,
    warmthMinF: garment.warmthMinF ?? null,
    warmthMaxF: garment.warmthMaxF ?? null,
    waterResistance: garment.waterResistance ?? null,
    layer: garment.layer ?? null,
    formality: garment.formality ?? null,
    fitNotes: garment.fitNotes ?? null,
    condition: garment.condition ?? null,
    repairNotes: garment.repairNotes ?? null,
  };
}

export function serializeOutfit(outfit: Outfit) {
  return {
    id: outfit.id,
    name: outfit.name ?? null,
    notes: outfit.notes ?? null,
    garmentIds: outfit.garments.getItems().map((g) => g.id),
    garments: outfit.garments.getItems().map(serializeGarment),
  };
}

export function serializeCalendarEntry(entry: OutfitCalendar) {
  return {
    id: entry.id,
    date: isoDate(entry.date),
    outfitId: entry.outfit.id,
    outfitName: entry.outfit.unwrap().name ?? null,
    worn: entry.wornAt != null,
    wornAt: entry.wornAt ? new Date(entry.wornAt).toISOString() : null,
    notes: entry.notes ?? null,
  };
}
