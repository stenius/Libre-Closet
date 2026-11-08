import { Migration } from '@mikro-orm/migrations';

export class Migration20261108232001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "garment_photo" ("id" serial primary key, "garment_id" int not null, "file_id" int not null, "label" varchar(255) null, "created_at" timestamptz not null);`);
    this.addSql(`create index "garment_photo_garment_id_index" on "garment_photo" ("garment_id");`);
    this.addSql(`create index "garment_photo_file_id_index" on "garment_photo" ("file_id");`);
    this.addSql(`alter table "garment_photo" add constraint "garment_photo_garment_id_foreign" foreign key ("garment_id") references "garment" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "garment_photo" add constraint "garment_photo_file_id_foreign" foreign key ("file_id") references "file" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "garment_photo" cascade;`);
  }

}
