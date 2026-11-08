import { Migration } from '@mikro-orm/migrations';

export class Migration20261108230001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "garment" add column "materials" text null, add column "warmth_min_f" int null, add column "warmth_max_f" int null, add column "water_resistance" varchar(255) null, add column "layer" varchar(255) null, add column "formality" int null, add column "fit_notes" text null, add column "condition" varchar(255) null, add column "repair_notes" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "garment" drop column "materials", drop column "warmth_min_f", drop column "warmth_max_f", drop column "water_resistance", drop column "layer", drop column "formality", drop column "fit_notes", drop column "condition", drop column "repair_notes";`);
  }

}
