import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import type { ConversationFlowRule } from "../../shared/types/conversation";
import type { MeetingMessageRecord, MeetingRecord } from "../../shared/types/records";
import { useAgentStore } from "../stores/agentStore";
import { useMeetingStore } from "../stores/meetingStore";
import { useTaskStore } from "../stores/taskStore";
import { CreateMeetingDialog } from "./CreateMeetingDialog";
import { createDefaultFlowRules, MeetingFlowEditor } from "./MeetingFlowEditor";

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const parseMetadata = (message: MeetingMessageRecord): Record<string, unknown> => {
  try {
    return JSON.parse(message.metadata_json) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export function MeetingRoom(): ReactElement {
  const { agents, hydrate: hydrateAgents } = useAgentStore();
  const { createTask } = useTaskStore();
  const {
    meetings,
    messagesByMeeting,
    participantsByMeeting,
    hydrate,
    hydrateMessages,
    hydrateParticipants,
    sendMessage,
    finishMeeting
  } = useMeetingStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [targetAgentId, setTargetAgentId] = useState("");
  const [message, setMessage] = useState("Please review the implementation plan and route feedback.");
  const [summary, setSummary] = useState("Decision: implementation is accepted after reviewer feedback.");
  const [flowRules, setFlowRules] = useState<ConversationFlowRule[]>(createDefaultFlowRules());

  useEffect(() => {
    void hydrateAgents();
    void hydrate();
  }, [hydrate, hydrateAgents]);

  const selectedMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedMeetingId) ?? meetings.at(-1) ?? null,
    [meetings, selectedMeetingId]
  );
  const meetingMessages = selectedMeeting ? messagesByMeeting[selectedMeeting.id] ?? [] : [];
  const participants = selectedMeeting ? participantsByMeeting[selectedMeeting.id] ?? [] : [];
  const participantAgents = participants
    .map((participant) => agents.find((agent) => agent.id === participant.agent_id))
    .filter((agent): agent is NonNullable<typeof agent> => Boolean(agent));

  useEffect(() => {
    if (!selectedMeeting) {
      return;
    }

    void hydrateMessages(selectedMeeting.id);
    void hydrateParticipants(selectedMeeting.id);
  }, [hydrateMessages, hydrateParticipants, selectedMeeting]);

  const onCreated = async (meeting: MeetingRecord): Promise<void> => {
    setSelectedMeetingId(meeting.id);
    setDialogOpen(false);
    await hydrate();
    await hydrateParticipants(meeting.id);
    await hydrateMessages(meeting.id);
  };

  const submitMessage = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!selectedMeeting || !message.trim()) {
      return;
    }
    await sendMessage({
      id: createId("meeting-message"),
      meetingId: selectedMeeting.id,
      role: "user",
      content: message.trim(),
      agentId: null,
      metadata: {
        sourceAgentId: null,
        targetAgentId: targetAgentId || null,
        parentMessageId: meetingMessages.at(-1)?.id ?? null,
        flowRuleId: targetAgentId ? "manager-addressed-message" : "manager-broadcast",
        route: targetAgentId ? "manager_to_agent" : "manager_broadcast"
      }
    });
    setMessage("");
    await hydrateMessages(selectedMeeting.id);
  };

  const runReviewLoop = async (): Promise<void> => {
    if (!selectedMeeting || participantAgents.length < 2) {
      return;
    }

    const developer = participantAgents[0];
    const reviewer = participantAgents[1];
    const developerRule = flowRules.find((rule) => rule.fromRole === "developer" && rule.toRole === "reviewer") ?? flowRules[0];
    const reviewerRule = flowRules.find((rule) => rule.fromRole === "reviewer" && rule.toRole === "developer") ?? flowRules[1];
    const parentMessageId = meetingMessages.at(-1)?.id ?? null;
    const developerMessage = await sendMessage({
      id: createId("meeting-message"),
      meetingId: selectedMeeting.id,
      role: "agent",
      agentId: developer.id,
      content: "Developer: I completed the implementation and request review.",
      metadata: {
        sourceAgentId: developer.id,
        targetAgentId: reviewer.id,
        sourceRole: "developer",
        targetRole: "reviewer",
        parentMessageId,
        flowRuleId: developerRule?.id ?? "developer-to-reviewer",
        route: "agent_to_agent"
      }
    });
    const reviewerMessage = await sendMessage({
      id: createId("meeting-message"),
      meetingId: selectedMeeting.id,
      role: "agent",
      agentId: reviewer.id,
      content: "Reviewer: Please revise the validation notes and then return for acceptance.",
      metadata: {
        sourceAgentId: reviewer.id,
        targetAgentId: developer.id,
        sourceRole: "reviewer",
        targetRole: "developer",
        parentMessageId: developerMessage.id,
        flowRuleId: reviewerRule?.id ?? "reviewer-to-developer",
        route: "agent_to_agent"
      }
    });
    await sendMessage({
      id: createId("meeting-message"),
      meetingId: selectedMeeting.id,
      role: "agent",
      agentId: developer.id,
      content: "Developer: Revision complete; reviewer acceptance requested.",
      metadata: {
        sourceAgentId: developer.id,
        targetAgentId: reviewer.id,
        sourceRole: "developer",
        targetRole: "reviewer",
        parentMessageId: reviewerMessage.id,
        flowRuleId: developerRule?.id ?? "developer-to-reviewer",
        route: "agent_to_agent"
      }
    });
    await sendMessage({
      id: createId("meeting-message"),
      meetingId: selectedMeeting.id,
      role: "moderator",
      agentId: reviewer.id,
      content: "Reviewer: Accepted. Escalation is not required.",
      metadata: {
        sourceAgentId: reviewer.id,
        targetAgentId: null,
        sourceRole: "reviewer",
        targetRole: "manager",
        parentMessageId: reviewerMessage.id,
        flowRuleId: "reviewer-accepts",
        route: "agent_to_manager",
        accepted: true
      }
    });
    await hydrateMessages(selectedMeeting.id);
  };

  const saveSummary = async (): Promise<void> => {
    if (!selectedMeeting || !summary.trim()) {
      return;
    }
    await finishMeeting({ meetingId: selectedMeeting.id, summary: summary.trim() });
    await hydrate();
  };

  const convertSummaryToTask = async (): Promise<void> => {
    if (!selectedMeeting || !summary.trim()) {
      return;
    }
    await createTask({
      id: createId("task"),
      title: `Follow up: ${selectedMeeting.title}`,
      description: summary.trim(),
      assignedAgentId: participantAgents[0]?.id ?? null,
      createdFrom: selectedMeeting.id
    });
  };

  return (
    <div className="meeting-workspace">
      <header className="toolbar">
        <div>
          <p className="eyebrow">Orchestration / Message Router</p>
          <h2>Meeting Room</h2>
        </div>
        <button className="primary-action" onClick={() => setDialogOpen(true)} type="button">
          Create Meeting
        </button>
      </header>

      <div className="meeting-layout">
        <aside className="ops-panel meeting-list" aria-label="Meetings">
          <div className="panel-heading">
            <h3>Meetings</h3>
            <span>{meetings.length}</span>
          </div>
          {meetings.map((meeting) => (
            <button
              className={selectedMeeting?.id === meeting.id ? "meeting-row active" : "meeting-row"}
              key={meeting.id}
              onClick={() => setSelectedMeetingId(meeting.id)}
              type="button"
            >
              <strong>{meeting.title}</strong>
              <span>{meeting.status}</span>
            </button>
          ))}
          {meetings.length === 0 ? <p className="empty-note">Create a meeting with two agents to start.</p> : null}
        </aside>

        <section className="meeting-main" aria-label="Active meeting">
          {selectedMeeting ? (
            <>
              <div className="meeting-banner">
                <div>
                  <h3>{selectedMeeting.title}</h3>
                  <p>{selectedMeeting.goal}</p>
                </div>
                <div className="participant-strip">
                  {participantAgents.map((agent) => (
                    <span key={agent.id}>{agent.name}</span>
                  ))}
                </div>
              </div>
              <div className="meeting-messages">
                {meetingMessages.map((item) => {
                  const metadata = parseMetadata(item);
                  return (
                    <article className="meeting-message" data-role={item.role} key={item.id}>
                      <div>
                        <strong>{agents.find((agent) => agent.id === item.agent_id)?.name ?? item.role}</strong>
                        <span>{item.created_at.slice(0, 19).replace("T", " ")}</span>
                      </div>
                      <p>{item.content}</p>
                      <code>
                        source={String(metadata.sourceAgentId ?? item.agent_id ?? "human")} target=
                        {String(metadata.targetAgentId ?? "all")} rule={String(metadata.flowRuleId ?? "manual")}
                      </code>
                    </article>
                  );
                })}
              </div>
              <form className="meeting-compose" onSubmit={(event) => void submitMessage(event)}>
                <select value={targetAgentId} onChange={(event) => setTargetAgentId(event.target.value)} aria-label="Meeting message target">
                  <option value="">All agents</option>
                  {participantAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <input value={message} onChange={(event) => setMessage(event.target.value)} aria-label="Meeting message" />
                <button type="submit">Send</button>
              </form>
              <div className="meeting-actions">
                <button onClick={() => void runReviewLoop()} type="button">
                  Run Review Loop
                </button>
                <button onClick={() => void saveSummary()} type="button">
                  Save Summary
                </button>
                <button onClick={() => void convertSummaryToTask()} type="button">
                  Convert To Task
                </button>
              </div>
              <textarea
                className="summary-box"
                aria-label="Meeting summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </>
          ) : (
            <p className="empty-note">No meeting selected.</p>
          )}
        </section>

        <MeetingFlowEditor onChange={setFlowRules} rules={flowRules} />
      </div>

      {dialogOpen ? <CreateMeetingDialog agents={agents} onClose={() => setDialogOpen(false)} onCreated={(meeting) => void onCreated(meeting)} /> : null}
    </div>
  );
}
