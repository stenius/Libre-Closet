import { Migration } from '@mikro-orm/migrations';

export class Migration20261108234001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" add column "disposition" varchar(255) null;`);
    this.addSql(`alter table "user" add column "measurements" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" drop column "disposition";`);
    this.addSql(`alter table "user" drop column "measurements";`);
  }

}
