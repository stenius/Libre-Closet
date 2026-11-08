import { BadRequestException } from '@nestjs/common';

export const MEASUREMENT_FIELDS = [
  'chest',
  'shoulders',
  'waist',
  'inseam',
  'neck',
] as const;

export type BodyMeasurements = {
  [K in (typeof MEASUREMENT_FIELDS)[number]]?: number;
};

const MAX_INCHES = 100;

/** Replaces the whole set: omitted or blank fields are not kept. */
export function parseMeasurements(
  input: Record<string, unknown> | undefined,
): BodyMeasurements {
  const result: BodyMeasurements = {};
  for (const field of MEASUREMENT_FIELDS) {
    const value = input?.[field];
    if (value === undefined || value === null || value === '') continue;
    const inches = Number(value);
    if (!Number.isFinite(inches) || inches <= 0 || inches > MAX_INCHES) {
      throw new BadRequestException(
        `${field} must be between 0 and ${MAX_INCHES} inches`,
      );
    }
    result[field] = inches;
  }
  return result;
}
