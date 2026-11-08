import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { User } from './user.entity';

@Entity()
export class ApiToken {
  @PrimaryKey()
  public id!: number;

  @Property()
  public name!: string;

  /** SHA-256 of the token. The token itself is only shown once, at creation. */
  @Property({ unique: true })
  public tokenHash!: string;

  /** Password fingerprint at creation, so a password change revokes the token. */
  @Property()
  public pwf!: string;

  @Property({ type: Date })
  public createdAt: Date = new Date();

  @Property({ type: Date, nullable: true })
  public lastUsedAt?: Date | null;

  @ManyToOne({
    entity: () => User,
    deleteRule: 'cascade',
    ref: true,
  })
  public user!: Ref<User>;
}
