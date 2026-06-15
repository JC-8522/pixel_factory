import { INITIAL_SCHEMA_SQL, SCHEMA_VERSION } from "../schema";

export const initialSchemaMigration = {
  version: SCHEMA_VERSION,
  name: "initial_schema",
  sql: INITIAL_SCHEMA_SQL
} as const;

