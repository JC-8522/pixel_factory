/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { deriveStatusFromLogLine, deriveStatusFromRuntimeEvent } from "./agentStatusMachine";

describe("agentStatusMachine", () => {
  it("maps log patterns to visible agent statuses", () => {
    expect(deriveStatusFromLogLine("Thinking about the task")).toBe("thinking");
    expect(deriveStatusFromLogLine("running command: pnpm test")).toBe("running_command");
    expect(deriveStatusFromLogLine("Reading src/main/index.ts")).toBe("reading_files");
    expect(deriveStatusFromLogLine("updated src/main/index.ts")).toBe("editing_files");
    expect(deriveStatusFromLogLine("approval required")).toBe("waiting_user_input");
    expect(deriveStatusFromLogLine("Error: failed", "stderr")).toBe("error");
    expect(deriveStatusFromLogLine("complete")).toBe("completed");
  });

  it("maps runtime events to statuses", () => {
    expect(deriveStatusFromRuntimeEvent({ id: "1", at: "now", agentId: "a", sessionId: "s", type: "session_started" })).toBe("idle");
    expect(
      deriveStatusFromRuntimeEvent({
        id: "2",
        at: "now",
        agentId: "a",
        sessionId: "s",
        type: "file_touched",
        path: "src/App.tsx",
        action: "updated"
      })
    ).toBe("editing_files");
    expect(deriveStatusFromRuntimeEvent({ id: "3", at: "now", agentId: "a", sessionId: "s", type: "session_stopped" })).toBe("stopped");
  });
});
