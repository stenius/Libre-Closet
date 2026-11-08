import {
  Collection,
  Entity,
  Enum,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { File } from './file.entity';
import { Outfit } from './outfit.entity';
import { ShareableId } from './shareableId.entity';
import { User } from './user.entity';
import { GarmentColor } from '../../wardrobe/garment-color.enum';
import type {
  GarmentCondition,
  GarmentDisposition,
  GarmentLayer,
  WaterResistance,
} from '../../wardrobe/garment-attributes';

export { GarmentColor };

@Entity()
export class Garment extends ShareableId {
  @PrimaryKey()
  public id!: number;

  @Property({ nullable: true })
  public name?: string;

  @Property()
  public category!: string;

  @Enum({ nullable: true })
  public color?: GarmentColor;

  @Property({ nullable: true })
  public brand?: string;

  @Property({ nullable: true })
  public size?: string;

  @Property({ type: Date, nullable: true })
  public dateAquired?: Date;

  @Property({ nullable: true })
  public notes?: string;

  @Property({ default: false })
  public archived = false;
  @Property({ nullable: true, columnType: 'text' })
  public washingDetails?: string;

  @Property({ type: 'text', nullable: true })
  public materials?: string | null;

  @Property({ type: 'integer', nullable: true })
  public warmthMinF?: number | null;

  @Property({ type: 'integer', nullable: true })
  public warmthMaxF?: number | null;

  @Property({ type: 'string', nullable: true })
  public waterResistance?: WaterResistance | null;

  @Property({ type: 'string', nullable: true })
  public layer?: GarmentLayer | null;

  @Property({ type: 'integer', nullable: true })
  public formality?: number | null;

  @Property({ type: 'text', nullable: true })
  public fitNotes?: string | null;

  @Property({ type: 'string', nullable: true })
  public condition?: GarmentCondition | null;

  @Property({ type: 'text', nullable: true })
  public repairNotes?: string | null;

  @Property({ type: 'string', nullable: true })
  public disposition?: GarmentDisposition | null;

  @OneToOne({
    entity: () => File,
    nullable: true,
  })
  public photo?: Ref<File>;

  @ManyToOne({
    entity: () => User,
    deleteRule: 'cascade',
    ref: true,
    nullable: true,
  })
  public owner?: Ref<User>;

  @ManyToMany(() => Outfit, (outfit) => outfit.garments)
  public outfits = new Collection<Outfit>(this);
}
