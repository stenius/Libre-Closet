import { Migration } from '@mikro-orm/migrations';

export class Migration20261108231001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "api_token" ("id" serial primary key, "name" varchar(255) not null, "token_hash" varchar(255) not null, "pwf" varchar(255) not null, "created_at" timestamptz not null, "last_used_at" timestamptz null, "user_id" int not null);`);
    this.addSql(`alter table "api_token" add constraint "api_token_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create index "api_token_user_id_index" on "api_token" ("user_id");`);
    this.addSql(`alter table "api_token" add constraint "api_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "api_token" cascade;`);
  }

}
