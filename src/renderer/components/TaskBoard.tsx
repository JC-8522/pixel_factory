import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import type { TokenUsageSummary } from "../../shared/ipc";
import type { MessageRecord, SessionRecord, TokenUsageRecord } from "../../shared/types/records";
import { useAgentStore } from "../stores/agentStore";
import { useEventStore } from "../stores/eventStore";
import { useTaskStore } from "../stores/taskStore";
import { ActivityTimeline } from "./ActivityTimeline";
import { AgentHealthPanel } from "./AgentHealthPanel";
import { ManagerCostDashboard } from "./ManagerCostDashboard";
import { RunHistory } from "./RunHistory";
import { TaskCard } from "./TaskCard";

const columns = [
  { id: "backlog", label: "Backlog" },
  { id: "assigned", label: "Assigned" },
  { id: "in_progress", label: "In Progress" },
  { id: "waiting_review", label: "Waiting Review" },
  { id: "done", label: "Done" },
  { id: "failed", label: "Failed" }
];

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

export function TaskBoard(): ReactElement {
  const { agents, hydrate: hydrateAgents } = useAgentStore();
  const { tasks, hydrate: hydrateTasks, createTask, assignTask, updateStatus } = useTaskStore();
  const { events, hydrate: hydrateEvents } = useEventStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [sessionsByAgent, setSessionsByAgent] = useState<Record<string, SessionRecord[]>>({});
  const [messagesBySession, setMessagesBySession] = useState<Record<string, MessageRecord[]>>({});
  const [summariesByAgent, setSummariesByAgent] = useState<Record<string, TokenUsageSummary>>({});
  const [usageByAgent, setUsageByAgent] = useState<Record<string, TokenUsageRecord[]>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    void hydrateAgents();
    void hydrateTasks();
    void hydrateEvents();
  }, [hydrateAgents, hydrateEvents, hydrateTasks]);

  useEffect(() => {
    void hydrateEvents({
      agentId: selectedAgentId || undefined,
      taskId: selectedTaskId || undefined,
      type: selectedEventType || undefined
    });
  }, [hydrateEvents, selectedAgentId, selectedEventType, selectedTaskId]);

  useEffect(() => {
    const hydrateOperationalData = async (): Promise<void> => {
      const sessionEntries = await Promise.all(
        agents.map(async (agent) => [agent.id, await window.codexOffice.sessions.listByAgent(agent.id)] as const)
      );
      const nextSessions = Object.fromEntries(sessionEntries);
      setSessionsByAgent(nextSessions);

      const sessionIds = sessionEntries.flatMap(([, sessions]) => sessions.map((session) => session.id));
      const messageEntries = await Promise.all(
        sessionIds.map(async (sessionId) => [sessionId, await window.codexOffice.messages.listBySession(sessionId)] as const)
      );
      setMessagesBySession(Object.fromEntries(messageEntries));

      const summaryEntries = await Promise.all(
        agents.map(async (agent) => [agent.id, await window.codexOffice.tokenUsage.summaryByAgent(agent.id)] as const)
      );
      setSummariesByAgent(Object.fromEntries(summaryEntries));

      const usageEntries = await Promise.all(
        agents.map(async (agent) => [agent.id, await window.codexOffice.tokenUsage.listByAgent(agent.id)] as const)
      );
      setUsageByAgent(Object.fromEntries(usageEntries));
    };

    void hydrateOperationalData();
  }, [agents]);

  const selectedSessions = selectedAgentId ? sessionsByAgent[selectedAgentId] ?? [] : agents[0] ? sessionsByAgent[agents[0].id] ?? [] : [];

  useEffect(() => {
    if (!selectedSessionId && selectedSessions.length > 0) {
      setSelectedSessionId(selectedSessions.at(-1)?.id ?? null);
    }
  }, [selectedSessionId, selectedSessions]);

  const tasksByColumn = useMemo(
    () =>
      Object.fromEntries(
        columns.map((column) => [column.id, tasks.filter((task) => task.status === column.id)])
      ) as Record<string, typeof tasks>,
    [tasks]
  );

  const submitTask = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    const task = await createTask({
      id: createId("task"),
      title: title.trim(),
      description: description.trim() || null,
      assignedAgentId: selectedAgentId || null,
      createdFrom: "task_board"
    });
    if (selectedAgentId) {
      await assignTask({ taskId: task.id, agentId: selectedAgentId });
    }
    await hydrateEvents();
    setTitle("");
    setDescription("");
  };

  const handleAssign = async (taskId: string, agentId: string): Promise<void> => {
    await assignTask({ taskId, agentId });
    setSelectedAgentId(agentId);
    await hydrateEvents({ agentId, taskId });
  };

  const handleStatus = async (taskId: string, status: string): Promise<void> => {
    await updateStatus({
      taskId,
      status,
      resultSummary: status === "done" ? "Completed from Task Board." : status === "failed" ? "Marked failed from Task Board." : null
    });
    setSelectedTaskId(taskId);
    await hydrateEvents({ taskId });
  };

  return (
    <div className="task-workspace">
      <header className="toolbar">
        <div>
          <p className="eyebrow">Task Engine / Audit Engine</p>
          <h2>Task Board</h2>
        </div>
      </header>

      <form className="task-create-form" onSubmit={(event) => void submitTask(event)}>
        <input aria-label="Task title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
        <input
          aria-label="Task description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Result, context, or acceptance note"
        />
        <select aria-label="Assign new task" value={selectedAgentId} onChange={(event) => setSelectedAgentId(event.target.value)}>
          <option value="">No agent</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <button type="submit">Create Task</button>
      </form>

      <section className="task-columns" aria-label="Task board columns">
        {columns.map((column) => (
          <div className="task-column" key={column.id}>
            <div className="column-heading">
              <h3>{column.label}</h3>
              <span>{tasksByColumn[column.id]?.length ?? 0}</span>
            </div>
            {(tasksByColumn[column.id] ?? []).map((task) => (
              <TaskCard
                agents={agents}
                key={task.id}
                onAssign={(taskId, agentId) => void handleAssign(taskId, agentId)}
                onSelect={setSelectedTaskId}
                onStatus={(taskId, status) => void handleStatus(taskId, status)}
                task={task}
              />
            ))}
          </div>
        ))}
      </section>

      <div className="ops-grid">
        <AgentHealthPanel
          agents={agents}
          onSelectAgent={setSelectedAgentId}
          selectedAgentId={selectedAgentId}
          sessionsByAgent={sessionsByAgent}
        />
        <RunHistory
          messagesBySession={messagesBySession}
          onSelectSession={setSelectedSessionId}
          selectedSessionId={selectedSessionId}
          sessions={selectedSessions}
        />
        <ManagerCostDashboard
          agents={agents}
          selectedAgentId={selectedAgentId}
          summariesByAgent={summariesByAgent}
          usageByAgent={usageByAgent}
        />
        <ActivityTimeline
          agents={agents}
          events={events}
          onFilterAgent={setSelectedAgentId}
          onFilterTask={setSelectedTaskId}
          onFilterType={setSelectedEventType}
          selectedAgentId={selectedAgentId}
          selectedTaskId={selectedTaskId}
          selectedType={selectedEventType}
          tasks={tasks}
        />
      </div>
    </div>
  );
}
