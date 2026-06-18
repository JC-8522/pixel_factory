import type { ReactElement } from "react";
import type { AgentRecord, EventRecord, TaskRecord } from "../../shared/types/records";

type ActivityTimelineProps = {
  agents: AgentRecord[];
  tasks: TaskRecord[];
  events: EventRecord[];
  selectedAgentId: string;
  selectedTaskId: string;
  selectedType: string;
  onFilterAgent(agentId: string): void;
  onFilterTask(taskId: string): void;
  onFilterType(type: string): void;
};

const eventTypes = [
  "",
  "task_created",
  "task_assigned",
  "task_status_changed",
  "agent_created",
  "message_sent",
  "meeting_created",
  "meeting_message_routed",
  "meeting_summary_saved",
  "token_usage_recorded"
];

export function ActivityTimeline({
  agents,
  tasks,
  events,
  selectedAgentId,
  selectedTaskId,
  selectedType,
  onFilterAgent,
  onFilterTask,
  onFilterType
}: ActivityTimelineProps): ReactElement {
  return (
    <section className="ops-panel timeline-panel" aria-label="Activity timeline">
      <div className="panel-heading">
        <h3>Activity Timeline</h3>
        <span>{events.length} events</span>
      </div>
      <div className="timeline-filters">
        <select aria-label="Filter timeline by agent" value={selectedAgentId} onChange={(event) => onFilterAgent(event.target.value)}>
          <option value="">All agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter timeline by task" value={selectedTaskId} onChange={(event) => onFilterTask(event.target.value)}>
          <option value="">All tasks</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
        <select aria-label="Filter timeline by event type" value={selectedType} onChange={(event) => onFilterType(event.target.value)}>
          {eventTypes.map((type) => (
            <option key={type || "all"} value={type}>
              {type || "All event types"}
            </option>
          ))}
        </select>
      </div>
      <div className="timeline-list">
        {events.map((event) => (
          <article className="timeline-event" data-severity={event.severity} key={event.id}>
            <div>
              <strong>{event.type}</strong>
              <span>{event.created_at.slice(0, 19).replace("T", " ")}</span>
            </div>
            <code>{event.payload_json}</code>
          </article>
        ))}
        {events.length === 0 ? <p className="empty-note">No events match the current filters.</p> : null}
      </div>
    </section>
  );
}
