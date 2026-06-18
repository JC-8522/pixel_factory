import { describe, expect, it } from "vitest";
import { validateCreateAgentForm } from "./createAgentFormValidation";

describe("validateCreateAgentForm", () => {
  it("requires human-visible create-agent fields", () => {
    const errors = validateCreateAgentForm({
      name: "",
      role: "",
      workingDirectory: "",
      permissionMode: "mystery",
      initialTask: ""
    });

    expect(errors.name).toBeDefined();
    expect(errors.role).toBeDefined();
    expect(errors.workingDirectory).toBeDefined();
    expect(errors.permissionMode).toBeDefined();
    expect(errors.initialTask).toBeDefined();
  });

  it("accepts a complete local-agent creation form", () => {
    const errors = validateCreateAgentForm({
      name: "Builder",
      role: "Developer Agent",
      workingDirectory: "C:/repo",
      permissionMode: "ask",
      initialTask: "Build the next slice."
    });

    expect(errors).toEqual({});
  });
});
