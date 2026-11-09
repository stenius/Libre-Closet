import { File } from './file.entity';
import {
  OneToOne,
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { Garment } from './garment.entity';
import { ShareableId } from './shareableId.entity';
import { User } from './user.entity';

export interface OutfitSlot {
  category: string;
  garmentId: number | null;
}

@Entity()
export class Outfit extends ShareableId {
  @PrimaryKey()
  public id!: number;

  @Property({ nullable: true })
  public name?: string;

  @Property({ nullable: true })
  public notes?: string;

  @Property({ type: 'json', nullable: true })
  public slots?: OutfitSlot[];

  @OneToOne({ entity: () => File, nullable: true, deleteRule: 'set null' })
  public photo?: Ref<File>;

  @Property({ type: 'string', nullable: true })
  public photoLabel?: string | null;

  @ManyToMany(() => Garment, (garment) => garment.outfits, { owner: true })
  public garments = new Collection<Garment>(this);

  @ManyToOne({
    entity: () => User,
    deleteRule: 'cascade',
    ref: true,
    nullable: true,
  })
  public owner?: Ref<User>;
}
