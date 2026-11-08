import { Migration } from '@mikro-orm/migrations';

export class Migration20261108233001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "garment_wear" ("id" serial primary key, "garment_id" int not null, "worn_on" varchar(255) not null);`);
    this.addSql(`create index "garment_wear_garment_id_index" on "garment_wear" ("garment_id");`);
    this.addSql(`alter table "garment_wear" add constraint "garment_wear_garment_id_worn_on_unique" unique ("garment_id", "worn_on");`);
    this.addSql(`alter table "garment_wear" add constraint "garment_wear_garment_id_foreign" foreign key ("garment_id") references "garment" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "garment_wear" cascade;`);
  }

}
