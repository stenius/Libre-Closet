import { Migration } from '@mikro-orm/migrations';

export class Migration20261108232000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`garment_photo\` (\`id\` integer not null primary key autoincrement, \`garment_id\` integer not null, \`file_id\` integer not null, \`label\` text null, \`created_at\` datetime not null, constraint \`garment_photo_garment_id_foreign\` foreign key(\`garment_id\`) references \`garment\`(\`id\`) on delete cascade on update cascade, constraint \`garment_photo_file_id_foreign\` foreign key(\`file_id\`) references \`file\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create index \`garment_photo_garment_id_index\` on \`garment_photo\` (\`garment_id\`);`);
    this.addSql(`create index \`garment_photo_file_id_index\` on \`garment_photo\` (\`file_id\`);`);
  }

}
