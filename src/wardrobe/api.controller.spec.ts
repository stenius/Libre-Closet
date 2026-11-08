import { BadRequestException } from '@nestjs/common';
import { parseDate, parseGarmentBody } from './api.parsers';
import { colorMatchConditions } from './garment-filters';
import { serializeGarment } from './api.serializers';

describe('parseGarmentBody', () => {
  it('includes only supplied keys so PATCH leaves the rest alone', () => {
    expect(parseGarmentBody({ notes: 'hole' })).toEqual({ notes: 'hole' });
  });

  it('joins colors and maps null to a clear', () => {
    expect(parseGarmentBody({ colors: ['red', 'blue'], brand: null })).toEqual({
      color: 'red,blue',
      brand: '',
    });
  });

  it.each([
    [{ category: '' }],
    [{ name: 5 }],
    [{ dateAcquired: 'soon' }],
    [{ layer: 'bad' }],
  ])('rejects %j', (body) => {
    expect(() => parseGarmentBody(body)).toThrow(BadRequestException);
  });
});

describe('parseDate', () => {
  it('accepts a calendar date', () => {
    expect(parseDate('d', '2026-11-09').toISOString()).toContain('2026-11-09');
  });

  it.each(['11/09/2026', '2026-13-40', undefined])('rejects %j', (value) => {
    expect(() => parseDate('d', value)).toThrow(BadRequestException);
  });
});

describe('colorMatchConditions', () => {
  it('matches a color alone or anywhere in a comma list', () => {
    expect(colorMatchConditions('red')).toEqual([
      { color: 'red' },
      { color: { $like: 'red,%' } },
      { color: { $like: '%,red' } },
      { color: { $like: '%,red,%' } },
    ]);
  });
});

describe('serializeGarment', () => {
  it('never exposes the owner', () => {
    const json = serializeGarment({
      id: 1,
      category: 'Jacket',
      archived: false,
      color: 'red,blue',
      owner: { password: 'secret' },
    } as any);
    expect(json.colors).toEqual(['red', 'blue']);
    expect(JSON.stringify(json)).not.toContain('secret');
  });
});
