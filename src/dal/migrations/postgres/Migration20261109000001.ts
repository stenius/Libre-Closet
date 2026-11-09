import { Migration } from '@mikro-orm/migrations';

export class Migration20261109000001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "outfit" add column "photo_label" varchar(255) null;`);
    this.addSql(`create table "outfit_photo" ("id" serial primary key, "outfit_id" int not null, "file_id" int not null, "label" varchar(255) null, "created_at" timestamptz not null);`);
    this.addSql(`create index "outfit_photo_outfit_id_index" on "outfit_photo" ("outfit_id");`);
    this.addSql(`create index "outfit_photo_file_id_index" on "outfit_photo" ("file_id");`);
    this.addSql(`alter table "outfit_photo" add constraint "outfit_photo_outfit_id_foreign" foreign key ("outfit_id") references "outfit" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "outfit_photo" add constraint "outfit_photo_file_id_foreign" foreign key ("file_id") references "file" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "outfit_photo" cascade;`);
    this.addSql(`alter table "outfit" drop column "photo_label";`);
  }

}
