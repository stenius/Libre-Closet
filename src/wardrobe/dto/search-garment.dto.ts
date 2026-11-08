import { GarmentColor } from '../garment-color.enum';

export interface SearchGarmentDto {
  keyword?: string;
  category?: string;
  color?: GarmentColor;
  brand?: string;
  size?: string;
  archived?: string;
  layer?: string;
  condition?: string;
  waterResistance?: string;
  /** Temperature in °F that the garment's warmth range must include. */
  warmthAt?: number;
}
