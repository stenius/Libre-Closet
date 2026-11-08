import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { File } from './file.entity';
import { Garment } from './garment.entity';

/** An extra photo of a garment. `Garment.photo` remains the primary one. */
@Entity()
export class GarmentPhoto {
  @PrimaryKey()
  public id!: number;

  @ManyToOne({ entity: () => Garment, deleteRule: 'cascade', ref: true })
  public garment!: Ref<Garment>;

  @ManyToOne({ entity: () => File, deleteRule: 'cascade', ref: true })
  public file!: Ref<File>;

  /** Optional description, such as "back" or "fit". */
  @Property({ type: 'string', nullable: true })
  public label?: string | null;

  @Property({ type: Date })
  public createdAt: Date = new Date();
}
