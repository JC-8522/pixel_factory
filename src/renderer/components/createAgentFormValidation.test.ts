import { describe, expect, it } from "vitest";
import { validateCreateAgentForm } from "./createAgentFormValidation";

describe("validateCreateAgentForm", () => {
  it("requires human-visible create-agent fields", () => {
    const errors = validateCreateAgentForm({
      name: "",
      role: "",
      workingDirectory: "",
      runtimeKind: "unknown",
      permissionMode: "mystery",
      autoRunMode: "ghost",
      initialTask: ""
    });

    expect(errors.name).toBeDefined();
    expect(errors.role).toBeDefined();
    expect(errors.workingDirectory).toBeDefined();
    expect(errors.runtimeKind).toBeDefined();
    expect(errors.permissionMode).toBeDefined();
    expect(errors.autoRunMode).toBeDefined();
    expect(errors.initialTask).toBeDefined();
  });

  it("accepts a complete mock-agent creation form", () => {
    const errors = validateCreateAgentForm({
      name: "Builder",
      role: "Developer Agent",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual",
      initialTask: "Build the next slice."
    });

    expect(errors).toEqual({});
  });
});
