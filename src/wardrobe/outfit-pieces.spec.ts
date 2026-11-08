import { orderOutfitPieces } from './outfit-pieces';

describe('orderOutfitPieces', () => {
  const garments = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const ids = (list: { id: number }[]) => list.map((g) => g.id);

  it('follows slot order', () => {
    const slots = [{ garmentId: 3 }, { garmentId: null }, { garmentId: 1 }];
    expect(ids(orderOutfitPieces(garments, slots))).toEqual([3, 1, 2]);
  });

  it('keeps the original order without slots', () => {
    expect(ids(orderOutfitPieces(garments, null))).toEqual([1, 2, 3]);
  });

  it('does not mutate its input', () => {
    orderOutfitPieces(garments, [{ garmentId: 3 }]);
    expect(ids(garments)).toEqual([1, 2, 3]);
  });
});
