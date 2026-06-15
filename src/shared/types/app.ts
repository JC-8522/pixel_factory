export type AppInfo = {
  name: string;
  version: string;
  mode: "development" | "production";
};

export type OfficeZone = "desks" | "meeting_room" | "whiteboard" | "idle_area" | "blocked_area" | "skill_shelf";

export type AgentStatus =
  | "idle"
  | "thinking"
  | "running_command"
  | "reading_files"
  | "editing_files"
  | "waiting_user_input"
  | "error"
  | "completed"
  | "stopped";

export type OfficeAgentPreview = {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  zone: OfficeZone;
};
