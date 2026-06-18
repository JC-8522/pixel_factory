import { beforeEach, describe, expect, it } from "vitest";
import { createMigratedDatabaseClient, type DatabaseClient } from "../db/client";
import { createAgent, createSession } from "../db/repositories";
import { PermissionPolicyEngine } from "./permissionPolicy";

describe("PermissionPolicyEngine", () => {
  let client: DatabaseClient;
  let engine: PermissionPolicyEngine;

  beforeEach(async () => {
    client = await createMigratedDatabaseClient();
    createAgent(client, {
      id: "agent-1",
      name: "Security Agent",
      role: "Developer Agent",
      workingDirectory: "C:/repo/project",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual"
    });
    createSession(client, {
      id: "session-1",
      agentId: "agent-1",
      runtimeKind: "mock",
      status: "running",
      workingDirectory: "C:/repo/project"
    });
    engine = new PermissionPolicyEngine(client);
  });

  it("creates a pending request for risky commands", () => {
    const result = engine.evaluate({
      requestId: "permission-1",
      agentId: "agent-1",
      sessionId: "session-1",
      projectPath: "C:/repo/project",
      commandSource: "cmd: npm install vitest"
    });

    expect(result.status).toBe("pending");
    expect(engine.getRequest("permission-1")).toMatchObject({
      redactedCommand: "npm install vitest",
      projectPath: "C:/repo/project"
    });
  });

  it("applies allow once to only one matching command", () => {
    engine.evaluate({
      requestId: "permission-2",
      agentId: "agent-1",
      sessionId: "session-1",
      projectPath: "C:/repo/project",
      commandSource: "cmd: curl https://example.com"
    });
    engine.decide({ requestId: "permission-2", decision: "allow_once" });

    expect(
      engine.evaluate({
        requestId: "permission-3",
        agentId: "agent-1",
        sessionId: "session-1",
        projectPath: "C:/repo/project",
        commandSource: "cmd: curl https://example.com"
      }).status
    ).toBe("allow");

    expect(
      engine.evaluate({
        requestId: "permission-4",
        agentId: "agent-1",
        sessionId: "session-1",
        projectPath: "C:/repo/project",
        commandSource: "cmd: curl https://example.com"
      }).status
    ).toBe("pending");
  });

  it("stores project allow rules and scopes them to a project path", () => {
    engine.evaluate({
      requestId: "permission-5",
      agentId: "agent-1",
      sessionId: "session-1",
      projectPath: "C:/repo/project-a",
      commandSource: "cmd: npm install sql.js"
    });
    const decision = engine.decide({ requestId: "permission-5", decision: "allow_project" });

    expect(decision.storedRuleId).toBeTruthy();
    expect(engine.listRules("C:/repo/project-a")).toHaveLength(1);
    expect(
      engine.evaluate({
        requestId: "permission-6",
        agentId: "agent-1",
        sessionId: "session-1",
        projectPath: "C:/repo/project-a",
        commandSource: "cmd: npm install sql.js"
      }).status
    ).toBe("allow");
    expect(
      engine.evaluate({
        requestId: "permission-7",
        agentId: "agent-1",
        sessionId: "session-1",
        projectPath: "C:/repo/project-b",
        commandSource: "cmd: npm install sql.js"
      }).status
    ).toBe("pending");
  });

  it("records denied decisions without approving execution", () => {
    engine.evaluate({
      requestId: "permission-8",
      agentId: "agent-1",
      sessionId: "session-1",
      projectPath: "C:/repo/project",
      commandSource: "cmd: rm -rf dist"
    });

    expect(engine.decide({ requestId: "permission-8", decision: "deny" })).toMatchObject({
      status: "denied"
    });
    expect(engine.getRequest("permission-8")).toBeNull();
  });
});
