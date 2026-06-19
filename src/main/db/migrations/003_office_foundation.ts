export const officeFoundationMigration = {
  version: 3,
  name: "office_foundation",
  sql: `
CREATE TABLE IF NOT EXISTS floors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  floor_index INTEGER NOT NULL,
  layout_preset TEXT NOT NULL DEFAULT 'mvp1_4x3',
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workstations (
  id TEXT PRIMARY KEY,
  floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  name TEXT,
  assigned_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (floor_id, slot_key)
);

CREATE INDEX IF NOT EXISTS idx_floors_index ON floors(floor_index);
CREATE INDEX IF NOT EXISTS idx_workstations_floor_id ON workstations(floor_id);
CREATE INDEX IF NOT EXISTS idx_workstations_assigned_agent_id ON workstations(assigned_agent_id);
`
} as const;
