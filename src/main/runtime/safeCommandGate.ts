import type { PermissionRequestRecord } from "../../shared/ipc";
import { PermissionRequiredError } from "../security/permissionPolicy";
import type { PermissionPolicyEngine } from "../security/permissionPolicy";

export type SafeCommandGateInput = {
  requestId: string;
  agentId: string;
  sessionId: string;
  projectPath: string;
  commandSource: string;
};

export type SafeCommandGateResult =
  | { status: "not_command" | "allowed" }
  | { status: "pending"; request: PermissionRequestRecord };

export const gateCommandOrThrow = (
  policy: PermissionPolicyEngine,
  input: SafeCommandGateInput
): SafeCommandGateResult => {
  const result = policy.evaluate(input);

  if (result.status === "pending") {
    throw new PermissionRequiredError(result.request.id);
  }

  if (result.status === "allow") {
    return { status: "allowed" };
  }

  return { status: "not_command" };
};
