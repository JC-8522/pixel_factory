import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { migrations } from "./migrations";

export type SqlValue = string | number | Uint8Array | null;
export type SqlParams = SqlValue[];

let sqlModulePromise: Promise<SqlJsStatic> | null = null;
const require = createRequire(import.meta.url);

const loadSqlModule = (): Promise<SqlJsStatic> => {
  const sqlJsEntry = require.resolve("sql.js");
  sqlModulePromise ??= initSqlJs({
    locateFile: (file) => `${dirname(sqlJsEntry)}/${file}`
  });
  return sqlModulePromise;
};

export type DatabaseClientOptions = {
  filePath?: string;
};

export class DatabaseClient {
  readonly filePath: string | undefined;

  private constructor(
    private readonly database: Database,
    options: DatabaseClientOptions
  ) {
    this.filePath = options.filePath;
    this.exec("PRAGMA foreign_keys = ON;");
  }

  static async create(options: DatabaseClientOptions = {}): Promise<DatabaseClient> {
    const SQL = await loadSqlModule();
    const bytes = options.filePath && existsSync(options.filePath) ? readFileSync(options.filePath) : undefined;
    return new DatabaseClient(new SQL.Database(bytes), options);
  }

  run(sql: string, params: SqlParams = []): void {
    this.database.run(sql, params);
  }

  exec(sql: string): void {
    this.database.exec(sql);
  }

  get<T extends Record<string, unknown>>(sql: string, params: SqlParams = []): T | null {
    const statement = this.database.prepare(sql);

    try {
      statement.bind(params);
      if (!statement.step()) {
        return null;
      }

      return statement.getAsObject() as T;
    } finally {
      statement.free();
    }
  }

  all<T extends Record<string, unknown>>(sql: string, params: SqlParams = []): T[] {
    const statement = this.database.prepare(sql);
    const rows: T[] = [];

    try {
      statement.bind(params);
      while (statement.step()) {
        rows.push(statement.getAsObject() as T);
      }

      return rows;
    } finally {
      statement.free();
    }
  }

  transaction<T>(operation: () => T): T {
    this.run("BEGIN");

    try {
      const result = operation();
      this.run("COMMIT");
      return result;
    } catch (error) {
      this.run("ROLLBACK");
      throw error;
    }
  }

  migrate(): void {
    this.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    for (const migration of migrations) {
      const existing = this.get<{ version: number }>(
        "SELECT version FROM schema_migrations WHERE version = ?",
        [migration.version]
      );

      if (existing) {
        continue;
      }

      this.transaction(() => {
        this.exec(migration.sql);
        this.run("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)", [
          migration.version,
          migration.name,
          new Date().toISOString()
        ]);
      });
    }

    this.ensureSchemaCompatibility();
    this.exec("PRAGMA foreign_keys = ON;");
  }

  private ensureColumn(tableName: string, columnName: string, columnSql: string): void {
    const columns = this.all<{ name: string }>(`PRAGMA table_info(${tableName})`);
    if (columns.some((column) => column.name === columnName)) {
      return;
    }

    this.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`);
  }

  private ensureSchemaCompatibility(): void {
    this.ensureColumn("sessions", "input_tokens", "input_tokens INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("sessions", "output_tokens", "output_tokens INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("sessions", "total_tokens", "total_tokens INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("sessions", "cached_tokens", "cached_tokens INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("sessions", "reasoning_tokens", "reasoning_tokens INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("sessions", "estimated_cost", "estimated_cost REAL");
    this.ensureColumn("sessions", "cost_currency", "cost_currency TEXT");
    this.ensureColumn("sessions", "usage_source", "usage_source TEXT");
    this.ensureColumn("sessions", "metadata_json", "metadata_json TEXT NOT NULL DEFAULT '{}'");

    this.ensureColumn("messages", "input_tokens", "input_tokens INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("messages", "output_tokens", "output_tokens INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("messages", "total_tokens", "total_tokens INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("messages", "usage_source", "usage_source TEXT");
  }

  exportBytes(): Uint8Array {
    return this.database.export();
  }

  save(): void {
    if (!this.filePath) {
      return;
    }

    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, this.exportBytes());
  }

  close(): void {
    this.database.close();
  }
}

export const createMigratedDatabaseClient = async (
  options: DatabaseClientOptions = {}
): Promise<DatabaseClient> => {
  const client = await DatabaseClient.create(options);
  client.migrate();
  client.save();
  return client;
};
