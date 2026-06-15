import { describe, expect, it } from "vitest";
import type { OfficeAgentPreview } from "./app";

describe("shared app types", () => {
  it("accepts the scaffold agent preview shape", () => {
    const agent: OfficeAgentPreview = {
      id: "agent-1",
      name: "Frontend",
      role: "Frontend Engineer",
      status: "idle",
      zone: "desks"
    };

    expect(agent.status).toBe("idle");
  });
});
