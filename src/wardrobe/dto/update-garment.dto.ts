import { MultipartFile } from '@fastify/multipart';
import { GarmentColor } from '../garment-color.enum';
import { GarmentAttributes } from '../garment-attributes';

export interface UpdateGarmentDto extends Partial<GarmentAttributes> {
  name?: string;
  category?: string;
  brand?: string;
  color?: GarmentColor;
  size?: string;
  notes?: string;
  washingDetails?: string;
  dateAquired?: string;
  files?: AsyncIterableIterator<MultipartFile>;
}
