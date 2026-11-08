import { BadRequestException } from '@nestjs/common';
import { parsePhotoLabel } from './garment-attributes';

describe('parsePhotoLabel', () => {
  it('trims a label and turns blank into null', () => {
    expect(parsePhotoLabel(' back ')).toBe('back');
    expect(parsePhotoLabel('  ')).toBeNull();
    expect(parsePhotoLabel(undefined)).toBeNull();
  });

  it('rejects an over-long label', () => {
    expect(() => parsePhotoLabel('x'.repeat(51))).toThrow(BadRequestException);
  });
});
