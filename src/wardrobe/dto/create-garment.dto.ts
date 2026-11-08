import { MultipartFile } from '@fastify/multipart';
import { GarmentAttributes } from '../garment-attributes';
export interface CreateGarmentDto extends Partial<GarmentAttributes> {
  name?: string;
  category: string;
  brand?: string;
  color?: string;
  size?: string;
  notes?: string;
  washingDetails?: string;
  dateAquired?: string;
  files?: AsyncIterableIterator<MultipartFile>;
}
