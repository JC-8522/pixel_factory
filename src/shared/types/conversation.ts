export type ConversationFlowRule = {
  id: string;
  label: string;
  fromRole: string;
  toRole: string;
  trigger: "after_message" | "review_requested" | "revision_requested" | "accepted" | "max_rounds";
  stopCondition?: "accepted" | "max_rounds" | "manager_escalation";
  maxRounds?: number;
};

export type ConversationTurn = {
  messageId: string;
  sourceAgentId?: string | null;
  targetAgentId?: string | null;
  sourceRole: string;
  content: string;
  accepted?: boolean;
  needsManager?: boolean;
  parentMessageId?: string | null;
  flowRuleId?: string | null;
};

export type ConversationWorkflowState = {
  rules: ConversationFlowRule[];
  turns: ConversationTurn[];
  round: number;
  status: "running" | "accepted" | "max_rounds" | "manager_escalation";
};

export type ConversationWorkflowDecision = {
  status: ConversationWorkflowState["status"];
  nextRole?: string;
  triggeredRuleId?: string;
  reason: string;
};
