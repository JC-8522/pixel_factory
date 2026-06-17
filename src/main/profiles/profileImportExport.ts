import type { DatabaseClient } from "../db/client";
import type { CreateAgentProfileInput } from "../db/repositories";
import { createProfile, generateProfileSnapshot, type AgentProfileSnapshot } from "./profileService";

export type AgentProfileExport = {
  format: "local-codex-office.agent-profile";
  version: 1;
  exportedAt: string;
  profile: AgentProfileSnapshot;
};

export const exportProfile = (client: DatabaseClient, profileId: string): AgentProfileExport => ({
  format: "local-codex-office.agent-profile",
  version: 1,
  exportedAt: new Date().toISOString(),
  profile: generateProfileSnapshot(client, profileId)
});

export const importProfile = (client: DatabaseClient, input: CreateAgentProfileInput) => createProfile(client, input);
