import { Migration } from '@mikro-orm/migrations';

export class Migration20261108235001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "outfit" add column "photo_id" int null;`);
    this.addSql(`alter table "outfit" add constraint "outfit_photo_id_unique" unique ("photo_id");`);
    this.addSql(`alter table "outfit" add constraint "outfit_photo_id_foreign" foreign key ("photo_id") references "file" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "outfit" drop constraint "outfit_photo_id_foreign";`);
    this.addSql(`alter table "outfit" drop constraint "outfit_photo_id_unique";`);
    this.addSql(`alter table "outfit" drop column "photo_id";`);
  }

}
