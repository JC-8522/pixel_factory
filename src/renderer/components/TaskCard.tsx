import type { ReactElement } from "react";
import type { AgentRecord, TaskRecord } from "../../shared/types/records";

type TaskCardProps = {
  task: TaskRecord;
  agents: AgentRecord[];
  onAssign(taskId: string, agentId: string): void;
  onStatus(taskId: string, status: string): void;
  onSelect(taskId: string): void;
};

const statusOptions = ["backlog", "assigned", "in_progress", "waiting_review", "done", "failed"];

export function TaskCard({ task, agents, onAssign, onStatus, onSelect }: TaskCardProps): ReactElement {
  const assignedAgent = agents.find((agent) => agent.id === task.assigned_agent_id);

  return (
    <article className="task-card" data-status={task.status}>
      <button className="task-card-title" onClick={() => onSelect(task.id)} type="button">
        {task.title}
      </button>
      {task.description ? <p>{task.description}</p> : null}
      <div className="task-meta">
        <span>{assignedAgent ? assignedAgent.name : "Unassigned"}</span>
        <span>{task.updated_at.slice(0, 16).replace("T", " ")}</span>
      </div>
      {task.result_summary ? <p className="task-result">{task.result_summary}</p> : null}
      <div className="task-card-controls">
        <select
          aria-label={`Assign ${task.title}`}
          value={task.assigned_agent_id ?? ""}
          onChange={(event) => {
            if (event.target.value) {
              onAssign(task.id, event.target.value);
            }
          }}
        >
          <option value="">Assign agent</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <select
          aria-label={`Move ${task.title}`}
          value={task.status}
          onChange={(event) => onStatus(task.id, event.target.value)}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
