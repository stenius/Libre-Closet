import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
  type Ref,
} from '@mikro-orm/core';
import { Garment } from './garment.entity';

/** A day a garment was worn, logged directly rather than through an outfit. */
@Entity()
@Unique({ properties: ['garment', 'wornOn'] })
export class GarmentWear {
  @PrimaryKey()
  public id!: number;

  @ManyToOne({ entity: () => Garment, deleteRule: 'cascade', ref: true })
  public garment!: Ref<Garment>;

  /** Calendar day as YYYY-MM-DD, so it can't shift across time zones. */
  @Property({ type: 'string' })
  public wornOn!: string;
}
