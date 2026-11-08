import { BadRequestException } from '@nestjs/common';
import {
  GarmentAttributesInput,
  parseGarmentAttributes,
} from './garment-attributes';

export type Json = Record<string, unknown>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(field: string, value: unknown): Date {
  const date = new Date(typeof value === 'string' ? value : NaN);
  if (
    typeof value !== 'string' ||
    !DATE_PATTERN.test(value) ||
    isNaN(date.getTime())
  ) {
    throw new BadRequestException(`${field} must be a YYYY-MM-DD date`);
  }
  return date;
}

export function optionalString(field: string, value: unknown): string {
  if (value === null) return '';
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }
  return value;
}

function parseColors(value: unknown): string {
  const colors = Array.isArray(value) ? value : [value];
  if (colors.some((c) => c !== null && typeof c !== 'string')) {
    throw new BadRequestException('colors must be a list of strings');
  }
  return colors.filter(Boolean).join(',');
}

/** Turns a JSON body into a garment DTO containing only the supplied keys. */
export function parseGarmentBody(body: Json) {
  const dto: Record<string, unknown> = {};
  for (const field of ['name', 'brand', 'size', 'notes', 'washingDetails']) {
    if (body[field] !== undefined) {
      dto[field] = optionalString(field, body[field]);
    }
  }
  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || !body.category.trim()) {
      throw new BadRequestException('category must be a non-empty string');
    }
    dto.category = body.category;
  }
  if (body.colors !== undefined) dto.color = parseColors(body.colors);
  if (body.dateAcquired !== undefined) {
    if (body.dateAcquired !== null) {
      parseDate('dateAcquired', body.dateAcquired);
    }
    dto.dateAquired = body.dateAcquired ?? '';
  }
  return {
    ...dto,
    ...parseGarmentAttributes(body as GarmentAttributesInput),
  };
}
