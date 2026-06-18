import { INITIAL_SCHEMA_SQL } from "../schema";

export const schemaBackfillMigration = {
  version: 2,
  name: "schema_backfill",
  sql: INITIAL_SCHEMA_SQL
} as const;
