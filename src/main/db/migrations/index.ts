import { initialSchemaMigration } from "./001_initial_schema";

export type Migration = {
  version: number;
  name: string;
  sql: string;
};

export const migrations: Migration[] = [initialSchemaMigration];

