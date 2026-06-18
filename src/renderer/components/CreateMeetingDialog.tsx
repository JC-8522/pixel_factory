import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import type { ConversationFlowRule } from "../../shared/types/conversation";
import type { AgentRecord, MeetingRecord } from "../../shared/types/records";
import { createDefaultFlowRules, MeetingFlowEditor } from "./MeetingFlowEditor";

type CreateMeetingDialogProps = {
  agents: AgentRecord[];
  onClose(): void;
  onCreated(meeting: MeetingRecord): void;
};

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

export function CreateMeetingDialog({ agents, onClose, onCreated }: CreateMeetingDialogProps): ReactElement {
  const [title, setTitle] = useState("Implementation Review");
  const [goal, setGoal] = useState("Coordinate developer and reviewer agents on one outcome.");
  const [moderatorAgentId, setModeratorAgentId] = useState(agents[0]?.id ?? "");
  const [participantAgentIds, setParticipantAgentIds] = useState<string[]>(agents.slice(0, 2).map((agent) => agent.id));
  const [flowRules, setFlowRules] = useState<ConversationFlowRule[]>(createDefaultFlowRules());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!moderatorAgentId && agents[0]) {
      setModeratorAgentId(agents[0].id);
    }

    if (participantAgentIds.length === 0 && agents.length >= 2) {
      setParticipantAgentIds(agents.slice(0, 2).map((agent) => agent.id));
    }
  }, [agents, moderatorAgentId, participantAgentIds.length]);

  const toggleParticipant = (agentId: string): void => {
    setParticipantAgentIds((current) =>
      current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId]
    );
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (participantAgentIds.length < 2) {
      setError("Select at least two agents for a meeting.");
      return;
    }

    const meeting = await window.codexOffice.meetings.create({
      id: createId("meeting"),
      title: title.trim(),
      goal: goal.trim(),
      moderatorAgentId: moderatorAgentId || null,
      outputFormat: "moderator_summary",
      participantAgentIds,
      conversationMode: "review_loop",
      flowRules
    });
    onCreated(meeting);
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog-panel meeting-dialog" aria-label="Create meeting">
        <header className="dialog-header">
          <h3>Create Meeting</h3>
          <button className="icon-button" onClick={onClose} type="button">
            X
          </button>
        </header>
        <form className="create-agent-form" onSubmit={(event) => void submit(event)}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Goal
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} />
          </label>
          <label>
            Moderator
            <select value={moderatorAgentId} onChange={(event) => setModeratorAgentId(event.target.value)}>
              <option value="">Human manager</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="skill-checklist">
            <legend>Participants</legend>
            {agents.map((agent) => (
              <label key={agent.id}>
                <input
                  checked={participantAgentIds.includes(agent.id)}
                  onChange={() => toggleParticipant(agent.id)}
                  type="checkbox"
                />
                <span>{agent.name}</span>
                <em>{agent.role}</em>
              </label>
            ))}
          </fieldset>
          <MeetingFlowEditor onChange={setFlowRules} rules={flowRules} />
          {error ? <p className="form-error">{error}</p> : null}
          <div className="dialog-actions">
            <button onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-action" type="submit">
              Start Meeting
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
