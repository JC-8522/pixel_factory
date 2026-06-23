import type {
  PermissionDecisionInput,
  PermissionDecisionResult,
  PermissionRequestRecord
} from "../../shared/ipc";
import type { PermissionRuleRecord } from "../../shared/types/records";
import type { DatabaseClient } from "../db/client";
import {
  createPermissionRule,
  deletePermissionRule,
  listPermissionRules,
  updateAgentStatus
} from "../db/repositories";
import { recordAuditEvent } from "../audit/auditEngine";
import { assessCommandRisk, type CommandRiskAssessment } from "./riskRules";

type PendingPermissionRequest = PermissionRequestRecord & {
  commandPattern: string;
};

type EvaluatePermissionInput = {
  requestId: string;
  agentId: string;
  sessionId: string;
  projectPath: string;
  commandSource: string;
};

type EvaluatePermissionResult =
  | { status: "not_command" }
  | { status: "allow"; assessment: CommandRiskAssessment; matchedRuleId?: string | null }
  | { status: "pending"; request: PermissionRequestRecord };

type ApprovalKey = string;

const oneTimeKey = (projectPath: string, commandPattern: string): ApprovalKey => `${projectPath}::${commandPattern}`;

export class PermissionRequiredError extends Error {
  constructor(readonly requestId: string) {
    super(`PERMISSION_REQUIRED:${requestId}`);
  }
}

export class PermissionPolicyEngine {
  private readonly pendingRequests = new Map<string, PendingPermissionRequest>();
  private readonly oneTimeApprovals = new Set<ApprovalKey>();

  constructor(private readonly client: DatabaseClient) {}

  evaluate(input: EvaluatePermissionInput): EvaluatePermissionResult {
    const assessment = assessCommandRisk(input.commandSource);
    if (!assessment.isCommand) {
      return { status: "not_command" };
    }

    if (assessment.riskLevel === "safe") {
      recordAuditEvent(this.client, {
        id: `${input.requestId}-safe`,
        type: "permission_safe_command_allowed",
        actorType: "system",
        actorId: "permission-policy",
        agentId: input.agentId,
        sessionId: input.sessionId,
        severity: "info",
        payload: {
          projectPath: input.projectPath,
          command: assessment.redactedCommand
        }
      });
      return { status: "allow", assessment, matchedRuleId: null };
    }

    const onceKey = oneTimeKey(input.projectPath, assessment.commandPattern);
    if (this.oneTimeApprovals.has(onceKey)) {
      this.oneTimeApprovals.delete(onceKey);
      recordAuditEvent(this.client, {
        id: `${input.requestId}-allow-once`,
        type: "permission_decided",
        actorType: "user",
        actorId: "local-user",
        agentId: input.agentId,
        sessionId: input.sessionId,
        severity: "warning",
        payload: {
          decision: "allow_once",
          projectPath: input.projectPath,
          command: assessment.redactedCommand
        }
      });
      return { status: "allow", assessment, matchedRuleId: null };
    }

    const matchedRule = listPermissionRules(this.client, input.projectPath).find((rule) => {
      if (rule.decision !== "allow_project") {
        return false;
      }

      return rule.command_pattern === assessment.commandPattern;
    });

    if (matchedRule) {
      recordAuditEvent(this.client, {
        id: `${input.requestId}-allow-project`,
        type: "permission_decided",
        actorType: "user",
        actorId: "local-user",
        agentId: input.agentId,
        sessionId: input.sessionId,
        severity: "warning",
        payload: {
          decision: "allow_project",
          projectPath: input.projectPath,
          command: assessment.redactedCommand,
          ruleId: matchedRule.id
        }
      });
      return { status: "allow", assessment, matchedRuleId: matchedRule.id };
    }

    const request: PendingPermissionRequest = {
      id: input.requestId,
      agentId: input.agentId,
      sessionId: input.sessionId,
      projectPath: input.projectPath,
      command: assessment.command,
      redactedCommand: assessment.redactedCommand,
      riskKinds: assessment.riskKinds,
      reasons: assessment.reasons,
      riskLevel: assessment.riskLevel,
      createdAt: new Date().toISOString(),
      commandPattern: assessment.commandPattern
    };

    this.pendingRequests.set(request.id, request);
    updateAgentStatus(this.client, input.agentId, "waiting_user_input");
    recordAuditEvent(this.client, {
      id: `${request.id}-requested`,
      type: "permission_requested",
      actorType: "agent",
      actorId: input.agentId,
      agentId: input.agentId,
      sessionId: input.sessionId,
      severity: "warning",
      payload: {
        projectPath: request.projectPath,
        command: request.redactedCommand,
        riskKinds: request.riskKinds,
        reasons: request.reasons
      }
    });
    recordAuditEvent(this.client, {
      id: `${request.id}-waiting`,
      type: "waiting_user_input",
      actorType: "agent",
      actorId: input.agentId,
      agentId: input.agentId,
      sessionId: input.sessionId,
      severity: "warning",
      payload: {
        prompt: "Approval is required before this command can continue.",
        command: request.redactedCommand,
        reasons: request.reasons
      }
    });

    return { status: "pending", request };
  }

  getRequest(requestId: string): PermissionRequestRecord | null {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return null;
    }

    const { commandPattern: _unused, ...record } = pending;
    return record;
  }

  getPendingRequestForAgent(agentId: string): PermissionRequestRecord | null {
    const pending = Array.from(this.pendingRequests.values())
      .filter((request) => request.agentId === agentId)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

    if (!pending) {
      return null;
    }

    const { commandPattern: _unused, ...record } = pending;
    return record;
  }

  decide(input: PermissionDecisionInput): PermissionDecisionResult {
    const pending = this.pendingRequests.get(input.requestId);
    if (!pending) {
      throw new Error(`Permission request not found: ${input.requestId}`);
    }

    this.pendingRequests.delete(input.requestId);
    const payload = {
      projectPath: pending.projectPath,
      command: pending.redactedCommand,
      riskKinds: pending.riskKinds,
      reasons: pending.reasons
    };

    if (input.decision === "allow_once") {
      this.oneTimeApprovals.add(oneTimeKey(pending.projectPath, pending.commandPattern));
      updateAgentStatus(this.client, pending.agentId, "idle");
      recordAuditEvent(this.client, {
        id: `${input.requestId}-decided`,
        type: "permission_decided",
        actorType: "user",
        actorId: "local-user",
        agentId: pending.agentId,
        sessionId: pending.sessionId,
        severity: "warning",
        payload: { ...payload, decision: input.decision }
      });
      return { requestId: input.requestId, status: "approved", storedRuleId: null };
    }

    if (input.decision === "allow_project") {
      const rule = createPermissionRule(this.client, {
        id: `permission-rule-${Date.now()}`,
        projectPath: pending.projectPath,
        ruleKind: pending.riskKinds.join(","),
        commandPattern: pending.commandPattern,
        decision: input.decision,
        metadata: {
          redactedCommand: pending.redactedCommand,
          reasons: pending.reasons
        }
      });
      updateAgentStatus(this.client, pending.agentId, "idle");
      recordAuditEvent(this.client, {
        id: `${input.requestId}-decided`,
        type: "permission_decided",
        actorType: "user",
        actorId: "local-user",
        agentId: pending.agentId,
        sessionId: pending.sessionId,
        severity: "warning",
        payload: { ...payload, decision: input.decision, ruleId: rule.id }
      });
      return { requestId: input.requestId, status: "approved", storedRuleId: rule.id };
    }

    updateAgentStatus(this.client, pending.agentId, "idle");
    recordAuditEvent(this.client, {
      id: `${input.requestId}-denied`,
      type: "permission_denied",
      actorType: "user",
      actorId: "local-user",
      agentId: pending.agentId,
      sessionId: pending.sessionId,
      severity: "error",
      payload: { ...payload, decision: input.decision }
    });
    return { requestId: input.requestId, status: "denied", storedRuleId: null };
  }

  listRules(projectPath?: string): PermissionRuleRecord[] {
    return listPermissionRules(this.client, projectPath);
  }

  revokeRule(ruleId: string): PermissionRuleRecord | null {
    const removed = deletePermissionRule(this.client, ruleId);
    if (removed) {
      recordAuditEvent(this.client, {
        id: `${ruleId}-revoked`,
        type: "permission_rule_revoked",
        actorType: "user",
        actorId: "local-user",
        severity: "warning",
        payload: {
          projectPath: removed.project_path,
          commandPattern: removed.command_pattern
        }
      });
    }
    return removed;
  }
}
