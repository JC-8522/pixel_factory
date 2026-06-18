import type { ReactElement } from "react";
import type { ConversationFlowRule } from "../../shared/types/conversation";

type MeetingFlowEditorProps = {
  rules: ConversationFlowRule[];
  onChange(rules: ConversationFlowRule[]): void;
};

export const createDefaultFlowRules = (): ConversationFlowRule[] => [
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
    label: "Escalate to manager after max rounds",
    fromRole: "developer",
    toRole: "manager",
    trigger: "max_rounds",
    stopCondition: "max_rounds",
    maxRounds: 3
  }
];

export function MeetingFlowEditor({ rules, onChange }: MeetingFlowEditorProps): ReactElement {
  const updateRule = (ruleId: string, patch: Partial<ConversationFlowRule>): void => {
    onChange(rules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)));
  };

  return (
    <section className="flow-editor" aria-label="Meeting flow editor">
      <div className="panel-heading">
        <h3>Flow Rules</h3>
        <button onClick={() => onChange(createDefaultFlowRules())} type="button">
          Reset Loop
        </button>
      </div>
      {rules.map((rule) => (
        <div className="flow-rule" key={rule.id}>
          <input
            aria-label={`${rule.id} label`}
            value={rule.label}
            onChange={(event) => updateRule(rule.id, { label: event.target.value })}
          />
          <select
            aria-label={`${rule.id} from role`}
            value={rule.fromRole}
            onChange={(event) => updateRule(rule.id, { fromRole: event.target.value })}
          >
            <option value="developer">developer</option>
            <option value="reviewer">reviewer</option>
            <option value="auditor">auditor</option>
            <option value="manager">manager</option>
          </select>
          <span>to</span>
          <select
            aria-label={`${rule.id} to role`}
            value={rule.toRole}
            onChange={(event) => updateRule(rule.id, { toRole: event.target.value })}
          >
            <option value="developer">developer</option>
            <option value="reviewer">reviewer</option>
            <option value="auditor">auditor</option>
            <option value="manager">manager</option>
          </select>
        </div>
      ))}
    </section>
  );
}
