import { BadRequestException } from '@nestjs/common';
import {
  assertWarmthRange,
  formatWarmthRange,
  parseGarmentAttributes,
} from './garment-attributes';

describe('parseGarmentAttributes', () => {
  it('omits fields that were not submitted', () => {
    expect(parseGarmentAttributes({ materials: 'Wool' })).toEqual({
      materials: 'Wool',
    });
  });

  it('turns blank values into null so they clear the field', () => {
    expect(
      parseGarmentAttributes({ materials: ' ', warmthMinF: '', layer: '' }),
    ).toEqual({ materials: null, warmthMinF: null, layer: null });
  });

  it('accepts form strings and zero', () => {
    expect(
      parseGarmentAttributes({
        warmthMinF: '0',
        warmthMaxF: 40,
        formality: '3',
      }),
    ).toEqual({ warmthMinF: 0, warmthMaxF: 40, formality: 3 });
  });

  it.each([
    [{ warmthMinF: 'cold' }],
    [{ warmthMaxF: 1.5 }],
    [{ formality: 6 }],
    [{ layer: 'outerwear' }],
    [{ waterResistance: 'yes' }],
    [{ condition: 'bad' }],
    [{ materials: 5 }],
  ])('rejects %j', (input) => {
    expect(() => parseGarmentAttributes(input)).toThrow(BadRequestException);
  });
});

describe('assertWarmthRange', () => {
  const current = { warmthMinF: 10, warmthMaxF: 40 };

  it('checks a partial update against the stored value', () => {
    expect(() => assertWarmthRange(current, { warmthMinF: 50 })).toThrow(
      BadRequestException,
    );
  });

  it('allows clearing one end', () => {
    expect(() =>
      assertWarmthRange(current, { warmthMaxF: null, warmthMinF: 50 }),
    ).not.toThrow();
  });
});

describe('formatWarmthRange', () => {
  it('keeps zero visible', () => {
    expect(formatWarmthRange(0, 40)).toBe('0–40°F');
    expect(formatWarmthRange(0, null)).toBe('0°F and up');
  });

  it('returns null with no range', () => {
    expect(formatWarmthRange(null, undefined)).toBeNull();
  });
});
