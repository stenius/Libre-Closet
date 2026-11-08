import { BadRequestException } from '@nestjs/common';

export const WATER_RESISTANCE_LEVELS = [
  'none',
  'resistant',
  'waterproof',
] as const;
export const GARMENT_LAYERS = ['base', 'mid', 'outer', 'accessory'] as const;
export const GARMENT_CONDITIONS = ['good', 'worn', 'damaged'] as const;

export const FORMALITY_MIN = 1;
export const FORMALITY_MAX = 5;
const WARMTH_MIN_F = -100;
const WARMTH_MAX_F = 150;

export type WaterResistance = (typeof WATER_RESISTANCE_LEVELS)[number];
export type GarmentLayer = (typeof GARMENT_LAYERS)[number];
export type GarmentCondition = (typeof GARMENT_CONDITIONS)[number];

export interface GarmentAttributes {
  materials: string | null;
  warmthMinF: number | null;
  warmthMaxF: number | null;
  waterResistance: WaterResistance | null;
  layer: GarmentLayer | null;
  formality: number | null;
  fitNotes: string | null;
  condition: GarmentCondition | null;
  repairNotes: string | null;
}

export type GarmentAttributesInput = {
  [K in keyof GarmentAttributes]?: unknown;
};

function isBlank(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  );
}

function parseText(field: string, value: unknown): string | null {
  if (isBlank(value)) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }
  return value.trim();
}

function parseInteger(
  field: string,
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (isBlank(value)) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(
      `${field} must be a whole number from ${min} to ${max}`,
    );
  }
  return parsed;
}

function parseChoice<T extends string>(
  field: string,
  value: unknown,
  choices: readonly T[],
): T | null {
  if (isBlank(value)) return null;
  if (!choices.includes(value as T)) {
    throw new BadRequestException(
      `${field} must be one of: ${choices.join(', ')}`,
    );
  }
  return value as T;
}

/**
 * Validates submitted attributes. Only fields present in the input appear in
 * the result, so a partial update leaves the others alone; a blank value
 * clears its field.
 */
export function parseGarmentAttributes(
  input: GarmentAttributesInput,
): Partial<GarmentAttributes> {
  const parsers: {
    [K in keyof GarmentAttributes]: (value: unknown) => GarmentAttributes[K];
  } = {
    materials: (v) => parseText('materials', v),
    warmthMinF: (v) =>
      parseInteger('warmthMinF', v, WARMTH_MIN_F, WARMTH_MAX_F),
    warmthMaxF: (v) =>
      parseInteger('warmthMaxF', v, WARMTH_MIN_F, WARMTH_MAX_F),
    waterResistance: (v) =>
      parseChoice('waterResistance', v, WATER_RESISTANCE_LEVELS),
    layer: (v) => parseChoice('layer', v, GARMENT_LAYERS),
    formality: (v) =>
      parseInteger('formality', v, FORMALITY_MIN, FORMALITY_MAX),
    fitNotes: (v) => parseText('fitNotes', v),
    condition: (v) => parseChoice('condition', v, GARMENT_CONDITIONS),
    repairNotes: (v) => parseText('repairNotes', v),
  };

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(parsers) as (keyof GarmentAttributes)[]) {
    if (input[key] !== undefined) result[key] = parsers[key](input[key]);
  }
  return result as Partial<GarmentAttributes>;
}

const ATTRIBUTE_KEYS: (keyof GarmentAttributes)[] = [
  'materials',
  'warmthMinF',
  'warmthMaxF',
  'waterResistance',
  'layer',
  'formality',
  'fitNotes',
  'condition',
  'repairNotes',
];

/** Copies only the attribute fields that are present in a parsed DTO. */
export function pickGarmentAttributes(
  dto: Partial<GarmentAttributes>,
): Partial<GarmentAttributes> {
  const picked: Record<string, unknown> = {};
  for (const key of ATTRIBUTE_KEYS) {
    if (key in dto && dto[key] !== undefined) picked[key] = dto[key];
  }
  return picked as Partial<GarmentAttributes>;
}

/** Rejects a range that would be inverted once the update is applied. */
export function assertWarmthRange(
  current: Pick<GarmentAttributes, 'warmthMinF' | 'warmthMaxF'>,
  update: Partial<GarmentAttributes>,
): void {
  const min = 'warmthMinF' in update ? update.warmthMinF : current.warmthMinF;
  const max = 'warmthMaxF' in update ? update.warmthMaxF : current.warmthMaxF;
  if (min != null && max != null && min > max) {
    throw new BadRequestException('warmthMinF cannot be above warmthMaxF');
  }
}

/** Display text for a range; returned as a string so 0°F stays visible. */
export function formatWarmthRange(
  min?: number | null,
  max?: number | null,
): string | null {
  if (min != null && max != null) return `${min}–${max}°F`;
  if (min != null) return `${min}°F and up`;
  if (max != null) return `Up to ${max}°F`;
  return null;
}
