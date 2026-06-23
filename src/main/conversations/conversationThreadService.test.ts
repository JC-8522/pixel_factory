/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import type { EventRecord, SessionRecord } from "../../shared/types/records";
import { deriveRunStatus } from "./conversationThreadService";

const createSession = (overrides?: Partial<SessionRecord>): SessionRecord => ({
  id: "session-1",
  agent_id: "agent-1",
  runtime_kind: "codex_cli",
  external_session_id: null,
  process_id: null,
  status: "running",
  started_at: "2026-06-23T00:00:00.000Z",
  ended_at: null,
  working_directory: "C:/repo/pixel_factory",
  initial_prompt: "Check the transient status path.",
  model_profile: "5.4 High",
  exit_code: null,
  error_message: null,
  input_tokens: 0,
  output_tokens: 0,
  total_tokens: 0,
  cached_tokens: 0,
  reasoning_tokens: 0,
  estimated_cost: null,
  cost_currency: null,
  usage_source: null,
  metadata_json: "{}",
  ...overrides
});

const createEvent = (type: string, payload: Record<string, unknown>, createdAt: string): EventRecord => ({
  id: `${type}-${createdAt}`,
  type,
  actor_type: "agent",
  actor_id: "agent-1",
  agent_id: "agent-1",
  session_id: "session-1",
  task_id: null,
  meeting_id: null,
  severity: "info",
  payload_json: JSON.stringify(payload),
  created_at: createdAt
});

describe("deriveRunStatus", () => {
  it("ignores transient error status_changed events while the session is still running", () => {
    const session = createSession();
    const events = [
      createEvent("status_changed", { status: "thinking" }, "2026-06-23T00:00:01.000Z"),
      createEvent("status_changed", { status: "reading_files" }, "2026-06-23T00:00:02.000Z"),
      createEvent("status_changed", { status: "error" }, "2026-06-23T00:00:03.000Z")
    ];

    expect(deriveRunStatus(session, events)).toBe("reading_files");
  });

  it("still respects terminal session states", () => {
    expect(deriveRunStatus(createSession({ status: "failed" }), [])).toBe("failed");
    expect(deriveRunStatus(createSession({ status: "completed" }), [])).toBe("completed");
  });
});
