import { Migration } from '@mikro-orm/migrations';

export class Migration20261108233000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`garment_wear\` (\`id\` integer not null primary key autoincrement, \`garment_id\` integer not null, \`worn_on\` text not null, constraint \`garment_wear_garment_id_foreign\` foreign key(\`garment_id\`) references \`garment\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create index \`garment_wear_garment_id_index\` on \`garment_wear\` (\`garment_id\`);`);
    this.addSql(`create unique index \`garment_wear_garment_id_worn_on_unique\` on \`garment_wear\` (\`garment_id\`, \`worn_on\`);`);
  }

}
