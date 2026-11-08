import { Migration } from '@mikro-orm/migrations';

export class Migration20261108230000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` add column \`materials\` text null;`);
    this.addSql(`alter table \`garment\` add column \`warmth_min_f\` integer null;`);
    this.addSql(`alter table \`garment\` add column \`warmth_max_f\` integer null;`);
    this.addSql(`alter table \`garment\` add column \`water_resistance\` text null;`);
    this.addSql(`alter table \`garment\` add column \`layer\` text null;`);
    this.addSql(`alter table \`garment\` add column \`formality\` integer null;`);
    this.addSql(`alter table \`garment\` add column \`fit_notes\` text null;`);
    this.addSql(`alter table \`garment\` add column \`condition\` text null;`);
    this.addSql(`alter table \`garment\` add column \`repair_notes\` text null;`);
  }

}
