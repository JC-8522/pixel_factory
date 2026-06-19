import { initialSchemaMigration } from "./001_initial_schema";
import { schemaBackfillMigration } from "./002_schema_backfill";
import { officeFoundationMigration } from "./003_office_foundation";

export type Migration = {
  version: number;
  name: string;
  sql: string;
};

export const migrations: Migration[] = [initialSchemaMigration, schemaBackfillMigration, officeFoundationMigration];
