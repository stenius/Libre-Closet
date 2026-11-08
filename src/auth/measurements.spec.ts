import { BadRequestException } from '@nestjs/common';
import { parseMeasurements } from './measurements';

describe('parseMeasurements', () => {
  it('accepts form strings and decimals, dropping blanks', () => {
    expect(
      parseMeasurements({ chest: '40.5', waist: 33, neck: '', inseam: null }),
    ).toEqual({ chest: 40.5, waist: 33 });
  });

  it('ignores unknown fields', () => {
    expect(parseMeasurements({ chest: 40, ssn: 1 })).toEqual({ chest: 40 });
  });

  it.each([
    [{ chest: 'big' }],
    [{ waist: 0 }],
    [{ neck: -1 }],
    [{ inseam: 101 }],
  ])('rejects %j', (input) => {
    expect(() => parseMeasurements(input)).toThrow(BadRequestException);
  });
});
