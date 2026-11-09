import { Migration } from '@mikro-orm/migrations';

export class Migration20261109000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`outfit\` add column \`photo_label\` text null;`);
    this.addSql(`create table \`outfit_photo\` (\`id\` integer not null primary key autoincrement, \`outfit_id\` integer not null, \`file_id\` integer not null, \`label\` text null, \`created_at\` datetime not null, constraint \`outfit_photo_outfit_id_foreign\` foreign key(\`outfit_id\`) references \`outfit\`(\`id\`) on delete cascade on update cascade, constraint \`outfit_photo_file_id_foreign\` foreign key(\`file_id\`) references \`file\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create index \`outfit_photo_outfit_id_index\` on \`outfit_photo\` (\`outfit_id\`);`);
    this.addSql(`create index \`outfit_photo_file_id_index\` on \`outfit_photo\` (\`file_id\`);`);
  }

}
