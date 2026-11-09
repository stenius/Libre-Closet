import { buildOutfitGallery } from './outfit-gallery';

describe('buildOutfitGallery', () => {
  it('puts the cover first and keeps extras in order', () => {
    const gallery = buildOutfitGallery({ fileName: 'c.webp' }, 'Jacket on', [
      { id: 2, fileName: 'a.webp', label: 'Jacket off' },
      { id: 3, fileName: 'b.webp' },
    ]);
    expect(gallery.map((p) => p.fileName)).toEqual([
      'c.webp',
      'a.webp',
      'b.webp',
    ]);
    expect(gallery[0]).toMatchObject({ isCover: true, label: 'Jacket on' });
    expect(gallery[2]).toMatchObject({ isCover: false, label: null });
  });

  it('is empty with no photos', () => {
    expect(buildOutfitGallery(null, null, [])).toEqual([]);
  });
});
