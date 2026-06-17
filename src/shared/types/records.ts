export type JsonObject = Record<string, unknown>;

export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  profile_id: string | null;
  profile_snapshot_json: string;
  status: string;
  current_task: string | null;
  working_directory: string;
  current_branch: string | null;
  last_command: string | null;
  runtime_kind: string;
  permission_mode: string;
  auto_run_mode: string;
  position_x: number;
  position_y: number;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

export type AgentSkillRecord = {
  agent_id: string;
  skill_id: string;
  assigned_at: string;
  assigned_by: string;
};

export type AgentProfileRecord = {
  id: string;
  name: string;
  description: string | null;
  role: string;
  persona: string | null;
  instructions: string | null;
  default_model_profile: string | null;
  default_permission_mode: string | null;
  default_auto_run_mode: string | null;
  workspace_scope_json: string;
  tool_access_json: string;
  memory_preferences_json: string;
  startup_workflow_json: string;
  validation_policy_json: string;
  collaboration_behavior_json: string;
  communication_style: string | null;
  risk_tolerance: string | null;
  output_preferences_json: string;
  visual_identity_json: string;
  source_pack_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentProfileSkillRecord = {
  profile_id: string;
  skill_id: string;
  required: number;
  created_at: string;
};

export type SessionRecord = {
  id: string;
  agent_id: string;
  runtime_kind: string;
  external_session_id: string | null;
  process_id: number | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  working_directory: string;
  initial_prompt: string | null;
  model_profile: string | null;
  exit_code: number | null;
  error_message: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  estimated_cost: number | null;
  cost_currency: string | null;
  usage_source: string | null;
  metadata_json: string;
};

export type MessageRecord = {
  id: string;
  session_id: string | null;
  agent_id: string | null;
  meeting_id: string | null;
  role: string;
  content: string;
  stream_state: string;
  parent_message_id: string | null;
  metadata_json: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  usage_source: string | null;
  created_at: string;
  updated_at: string;
};

export type TokenUsageRecord = {
  id: string;
  agent_id: string | null;
  session_id: string | null;
  message_id: string | null;
  task_id: string | null;
  model_profile: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  estimated_cost: number | null;
  cost_currency: string | null;
  usage_source: string;
  metadata_json: string;
  created_at: string;
};

export type SkillRecord = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  root_path: string;
  skill_md_path: string;
  installed: number;
  metadata_json: string;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  assigned_agent_id: string | null;
  status: string;
  required_skills_json: string;
  linked_files_json: string;
  result_summary: string | null;
  created_from: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingRecord = {
  id: string;
  title: string;
  goal: string;
  moderator_agent_id: string | null;
  output_format: string | null;
  status: string;
  summary: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  updated_at: string;
};

export type MeetingMessageRecord = {
  id: string;
  meeting_id: string;
  agent_id: string | null;
  role: string;
  content: string;
  created_at: string;
  metadata_json: string;
};

export type EventRecord = {
  id: string;
  type: string;
  actor_type: string;
  actor_id: string | null;
  agent_id: string | null;
  session_id: string | null;
  task_id: string | null;
  meeting_id: string | null;
  severity: string;
  payload_json: string;
  created_at: string;
};

export type SettingRecord = {
  key: string;
  value_json: string;
  updated_at: string;
};
