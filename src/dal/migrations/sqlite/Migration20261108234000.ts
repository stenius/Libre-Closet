import { Migration } from '@mikro-orm/migrations';

export class Migration20261108234000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` add column \`disposition\` text null;`);
    this.addSql(`alter table \`user\` add column \`measurements\` json null;`);
  }

}
