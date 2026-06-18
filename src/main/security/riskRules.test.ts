import { describe, expect, it } from "vitest";
import { assessCommandRisk } from "./riskRules";

describe("assessCommandRisk", () => {
  it("treats non-command chat as safe conversation", () => {
    expect(assessCommandRisk("Can you summarize this bug?")).toMatchObject({
      isCommand: false,
      riskLevel: "safe"
    });
  });

  it("allows safe command previews without approval", () => {
    expect(assessCommandRisk("cmd: pwd")).toMatchObject({
      isCommand: true,
      riskLevel: "safe",
      riskKinds: []
    });
  });

  it("flags delete, install, and network commands", () => {
    expect(assessCommandRisk("cmd: rm -rf build").riskKinds).toContain("delete");
    expect(assessCommandRisk("cmd: npm install sql.js").riskKinds).toContain("install");
    expect(assessCommandRisk("cmd: curl https://example.com").riskKinds).toContain("network");
  });

  it("redacts credential-like values", () => {
    expect(assessCommandRisk("cmd: curl --token secret123 https://example.com").redactedCommand).toContain(
      "[REDACTED]"
    );
  });
});
