import { Migration } from '@mikro-orm/migrations';

export class Migration20261108231000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`api_token\` (\`id\` integer not null primary key autoincrement, \`name\` text not null, \`token_hash\` text not null, \`pwf\` text not null, \`created_at\` datetime not null, \`last_used_at\` datetime null, \`user_id\` integer not null, constraint \`api_token_user_id_foreign\` foreign key(\`user_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`);
    this.addSql(`create unique index \`api_token_token_hash_unique\` on \`api_token\` (\`token_hash\`);`);
    this.addSql(`create index \`api_token_user_id_index\` on \`api_token\` (\`user_id\`);`);
  }

}
