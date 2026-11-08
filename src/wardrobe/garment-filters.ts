import { FilterQuery } from '@mikro-orm/core';
import { Garment } from '../dal/entity/garment.entity';
import { GarmentColor } from './garment-color.enum';

/** Colors are stored comma-joined, so match any position in the list. */
export function colorMatchConditions(color: string): FilterQuery<Garment>[] {
  return [
    { color: color as GarmentColor },
    { color: { $like: `${color},%` } },
    { color: { $like: `%,${color}` } },
    { color: { $like: `%,${color},%` } },
  ];
}
