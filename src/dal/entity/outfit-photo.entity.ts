import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { File } from './file.entity';
import { Outfit } from './outfit.entity';

/** An additional outfit photo. `Outfit.photo` remains the cover. */
@Entity()
export class OutfitPhoto {
  @PrimaryKey()
  public id!: number;

  @ManyToOne({ entity: () => Outfit, deleteRule: 'cascade', ref: true })
  public outfit!: Ref<Outfit>;

  @ManyToOne({ entity: () => File, deleteRule: 'cascade', ref: true })
  public file!: Ref<File>;

  /** Optional description, such as "Jacket on". */
  @Property({ type: 'string', nullable: true })
  public label?: string | null;

  @Property({ type: Date })
  public createdAt: Date = new Date();
}
