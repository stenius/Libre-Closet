import { computeWearStats } from './wear-stats';

describe('computeWearStats', () => {
  const garments = [
    { id: 1, name: 'Parka', category: 'Jacket' },
    { id: 2, name: 'Tee', category: 'T-Shirt' },
    { id: 3, category: 'Hat' },
  ];

  it('counts a garment once per day', () => {
    const [stat] = computeWearStats(garments.slice(0, 1), [
      { garmentId: 1, day: '2026-11-01' },
      { garmentId: 1, day: '2026-11-01' },
      { garmentId: 1, day: '2026-11-03' },
    ]);
    expect(stat).toMatchObject({ wearCount: 2, lastWorn: '2026-11-03' });
  });

  it('sorts never worn first, then longest since worn', () => {
    const ids = computeWearStats(garments, [
      { garmentId: 1, day: '2026-11-03' },
      { garmentId: 2, day: '2026-01-01' },
    ]).map((s) => s.garmentId);
    expect(ids).toEqual([3, 2, 1]);
  });

  it('ignores events for garments not listed', () => {
    const stats = computeWearStats(garments.slice(0, 1), [
      { garmentId: 9, day: '2026-11-03' },
    ]);
    expect(stats[0].wearCount).toBe(0);
  });
});
