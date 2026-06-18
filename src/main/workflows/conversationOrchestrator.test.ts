/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { defaultReviewLoopRules } from "../meetings/meetingFlowRules";
import { buildWorkflowState, evaluateConversationWorkflow } from "./conversationOrchestrator";

describe("conversationOrchestrator", () => {
  it("routes a developer-reviewer feedback loop without UI dependencies", () => {
    const rules = defaultReviewLoopRules(2);

    expect(
      evaluateConversationWorkflow(
        buildWorkflowState(rules, [
          {
            messageId: "m1",
            sourceRole: "developer",
            content: "Implementation ready for review."
          }
        ])
      )
    ).toMatchObject({ status: "running", nextRole: "reviewer" });

    expect(
      evaluateConversationWorkflow(
        buildWorkflowState(rules, [
          {
            messageId: "m1",
            sourceRole: "developer",
            content: "Implementation ready for review."
          },
          {
            messageId: "m2",
            sourceRole: "reviewer",
            content: "Please revise error handling."
          }
        ])
      )
    ).toMatchObject({ status: "running", nextRole: "developer" });
  });

  it("stops on acceptance or max rounds", () => {
    const rules = defaultReviewLoopRules(1);

    expect(
      evaluateConversationWorkflow(
        buildWorkflowState(rules, [
          {
            messageId: "m1",
            sourceRole: "reviewer",
            content: "Accepted.",
            accepted: true
          }
        ])
      )
    ).toMatchObject({ status: "accepted" });

    expect(
      evaluateConversationWorkflow(
        buildWorkflowState(rules, [
          {
            messageId: "m1",
            sourceRole: "developer",
            content: "Round one needs review."
          }
        ])
      )
    ).toMatchObject({ status: "max_rounds" });
  });
});
