import { Migration } from '@mikro-orm/migrations';

export class Migration20261108235000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`outfit\` add column \`photo_id\` integer null constraint \`outfit_photo_id_foreign\` references \`file\` (\`id\`) on update cascade on delete set null;`);
    this.addSql(`create unique index \`outfit_photo_id_unique\` on \`outfit\` (\`photo_id\`);`);
  }

}
