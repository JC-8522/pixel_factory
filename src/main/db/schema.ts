export const SCHEMA_VERSION = 1;

export const INITIAL_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agent_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  author TEXT,
  version TEXT,
  source_type TEXT,
  source_uri TEXT,
  installed_path TEXT,
  checksum TEXT,
  signature_status TEXT,
  permission_manifest_json TEXT NOT NULL DEFAULT '{}',
  validation_status TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  installed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  root_path TEXT NOT NULL,
  skill_md_path TEXT NOT NULL,
  installed INTEGER NOT NULL DEFAULT 1 CHECK (installed IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  last_scanned_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL,
  persona TEXT,
  instructions TEXT,
  default_model_profile TEXT,
  default_permission_mode TEXT,
  default_auto_run_mode TEXT,
  workspace_scope_json TEXT NOT NULL DEFAULT '{}',
  tool_access_json TEXT NOT NULL DEFAULT '{}',
  memory_preferences_json TEXT NOT NULL DEFAULT '{}',
  startup_workflow_json TEXT NOT NULL DEFAULT '[]',
  validation_policy_json TEXT NOT NULL DEFAULT '{}',
  collaboration_behavior_json TEXT NOT NULL DEFAULT '{}',
  communication_style TEXT,
  risk_tolerance TEXT,
  output_preferences_json TEXT NOT NULL DEFAULT '{}',
  visual_identity_json TEXT NOT NULL DEFAULT '{}',
  source_pack_id TEXT REFERENCES agent_packs(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_profile_skills (
  profile_id TEXT NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
  created_at TEXT NOT NULL,
  PRIMARY KEY (profile_id, skill_id)
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  profile_id TEXT REFERENCES agent_profiles(id) ON DELETE SET NULL,
  profile_snapshot_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN (
    'idle',
    'thinking',
    'running_command',
    'reading_files',
    'editing_files',
    'waiting_user_input',
    'error',
    'completed',
    'stopped'
  )),
  current_task TEXT,
  working_directory TEXT NOT NULL,
  current_branch TEXT,
  last_command TEXT,
  runtime_kind TEXT NOT NULL,
  permission_mode TEXT NOT NULL,
  auto_run_mode TEXT NOT NULL,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  runtime_kind TEXT NOT NULL,
  external_session_id TEXT,
  process_id INTEGER,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  working_directory TEXT NOT NULL,
  initial_prompt TEXT,
  model_profile TEXT,
  exit_code INTEGER,
  error_message TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost REAL,
  cost_currency TEXT,
  usage_source TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  moderator_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  output_format TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'running', 'completed', 'failed', 'cancelled')),
  summary TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (meeting_id, agent_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  meeting_id TEXT REFERENCES meetings(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system', 'tool', 'moderator')),
  content TEXT NOT NULL,
  stream_state TEXT NOT NULL DEFAULT 'complete',
  parent_message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  usage_source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS token_usage (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  model_profile TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost REAL,
  cost_currency TEXT,
  usage_source TEXT NOT NULL CHECK (usage_source IN ('reported', 'estimated', 'manual')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meeting_messages (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system', 'tool', 'moderator')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  PRIMARY KEY (agent_id, skill_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('backlog', 'assigned', 'in_progress', 'waiting_review', 'done', 'failed')),
  required_skills_json TEXT NOT NULL DEFAULT '[]',
  linked_files_json TEXT NOT NULL DEFAULT '[]',
  result_summary TEXT,
  created_from TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system')),
  actor_id TEXT,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  meeting_id TEXT REFERENCES meetings(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_events (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (task_id, event_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permission_rules (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  rule_kind TEXT NOT NULL,
  command_pattern TEXT NOT NULL,
  decision TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_meeting_id ON messages(meeting_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent_id ON token_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_session_id ON token_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_task_id ON token_usage(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent_id ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_events_agent_id ON events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_task_id ON events(task_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

CREATE TRIGGER IF NOT EXISTS trg_sessions_agent_exists
BEFORE INSERT ON sessions
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.agent_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: sessions.agent_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_agent_skills_agent_exists
BEFORE INSERT ON agent_skills
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.agent_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: agent_skills.agent_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_agent_skills_skill_exists
BEFORE INSERT ON agent_skills
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM skills WHERE id = NEW.skill_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: agent_skills.skill_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_tasks_agent_exists
BEFORE INSERT ON tasks
FOR EACH ROW
WHEN NEW.assigned_agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.assigned_agent_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: tasks.assigned_agent_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_task_update_agent_exists
BEFORE UPDATE OF assigned_agent_id ON tasks
FOR EACH ROW
WHEN NEW.assigned_agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.assigned_agent_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: tasks.assigned_agent_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_session_exists
BEFORE INSERT ON messages
FOR EACH ROW
WHEN NEW.session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sessions WHERE id = NEW.session_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: messages.session_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_agent_exists
BEFORE INSERT ON messages
FOR EACH ROW
WHEN NEW.agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.agent_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: messages.agent_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_meeting_participants_meeting_exists
BEFORE INSERT ON meeting_participants
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM meetings WHERE id = NEW.meeting_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: meeting_participants.meeting_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_meeting_participants_agent_exists
BEFORE INSERT ON meeting_participants
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.agent_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: meeting_participants.agent_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_events_agent_exists
BEFORE INSERT ON events
FOR EACH ROW
WHEN NEW.agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.agent_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: events.agent_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_events_task_exists
BEFORE INSERT ON events
FOR EACH ROW
WHEN NEW.task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tasks WHERE id = NEW.task_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: events.task_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_token_usage_agent_exists
BEFORE INSERT ON token_usage
FOR EACH ROW
WHEN NEW.agent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM agents WHERE id = NEW.agent_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: token_usage.agent_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_token_usage_session_exists
BEFORE INSERT ON token_usage
FOR EACH ROW
WHEN NEW.session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sessions WHERE id = NEW.session_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: token_usage.session_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_token_usage_message_exists
BEFORE INSERT ON token_usage
FOR EACH ROW
WHEN NEW.message_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM messages WHERE id = NEW.message_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: token_usage.message_id');
END;

CREATE TRIGGER IF NOT EXISTS trg_token_usage_task_exists
BEFORE INSERT ON token_usage
FOR EACH ROW
WHEN NEW.task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tasks WHERE id = NEW.task_id)
BEGIN
  SELECT RAISE(ABORT, 'foreign key constraint failed: token_usage.task_id');
END;
`;
