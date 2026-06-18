import type { ConversationFlowRule } from "../../shared/types/conversation";

export const defaultReviewLoopRules = (maxRounds = 3): ConversationFlowRule[] => [
  {
    id: "developer-to-reviewer",
    label: "Developer output asks reviewer to inspect",
    fromRole: "developer",
    toRole: "reviewer",
    trigger: "after_message"
  },
  {
    id: "reviewer-to-developer",
    label: "Reviewer feedback returns to developer",
    fromRole: "reviewer",
    toRole: "developer",
    trigger: "revision_requested"
  },
  {
    id: "reviewer-accepts",
    label: "Reviewer acceptance stops the loop",
    fromRole: "reviewer",
    toRole: "manager",
    trigger: "accepted",
    stopCondition: "accepted"
  },
  {
    id: "max-rounds-escalation",
    label: "Escalate to manager when max rounds are reached",
    fromRole: "developer",
    toRole: "manager",
    trigger: "max_rounds",
    stopCondition: "max_rounds",
    maxRounds
  }
];
