import { initialSchemaMigration } from "./001_initial_schema";
import { schemaBackfillMigration } from "./002_schema_backfill";

export type Migration = {
  version: number;
  name: string;
  sql: string;
};

export const migrations: Migration[] = [initialSchemaMigration, schemaBackfillMigration];
