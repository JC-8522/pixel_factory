import type {
  ConversationFlowRule,
  ConversationWorkflowDecision,
  ConversationWorkflowState
} from "../../shared/types/conversation";

export const evaluateConversationWorkflow = (
  state: ConversationWorkflowState
): ConversationWorkflowDecision => {
  const latestTurn = state.turns.at(-1);

  if (!latestTurn) {
    return { status: "running", reason: "waiting_for_first_message" };
  }

  if (latestTurn.needsManager) {
    return {
      status: "manager_escalation",
      triggeredRuleId: latestTurn.flowRuleId ?? undefined,
      reason: "latest_turn_requested_manager_escalation"
    };
  }

  if (latestTurn.accepted) {
    const acceptanceRule = state.rules.find((rule) => rule.trigger === "accepted");
    return {
      status: "accepted",
      triggeredRuleId: acceptanceRule?.id,
      reason: "reviewer_accepted_output"
    };
  }

  const maxRoundRule = state.rules.find((rule) => rule.stopCondition === "max_rounds" && rule.maxRounds !== undefined);
  if (maxRoundRule && state.round >= (maxRoundRule.maxRounds ?? 0)) {
    return {
      status: "max_rounds",
      triggeredRuleId: maxRoundRule.id,
      reason: "configured_max_rounds_reached"
    };
  }

  const nextRule = state.rules.find(
    (rule) =>
      rule.fromRole === latestTurn.sourceRole &&
      (rule.trigger === "after_message" ||
        (rule.trigger === "review_requested" && latestTurn.content.toLowerCase().includes("review")) ||
        (rule.trigger === "revision_requested" && latestTurn.content.toLowerCase().includes("revise")))
  );

  if (!nextRule) {
    return {
      status: "running",
      reason: "no_matching_flow_rule"
    };
  }

  return {
    status: "running",
    nextRole: nextRule.toRole,
    triggeredRuleId: nextRule.id,
    reason: `${nextRule.fromRole}_handoff_to_${nextRule.toRole}`
  };
};

export const buildWorkflowState = (
  rules: ConversationFlowRule[],
  turns: ConversationWorkflowState["turns"]
): ConversationWorkflowState => {
  const developerTurns = turns.filter((turn) => turn.sourceRole === "developer").length;
  return {
    rules,
    turns,
    round: Math.max(1, developerTurns),
    status: "running"
  };
};
