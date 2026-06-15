import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso, nullable } from "./utils";

export type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  assigned_agent_id: string | null;
  status: string;
  required_skills_json: string;
  linked_files_json: string;
  result_summary: string | null;
  created_from: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskEventRecord = {
  task_id: string;
  event_id: string;
  linked_at: string;
};

export type CreateTaskInput = {
  id: string;
  title: string;
  description?: string | null;
  assignedAgentId?: string | null;
  status?: string;
  requiredSkills?: unknown;
  linkedFiles?: unknown;
  resultSummary?: string | null;
  createdFrom?: string | null;
};

export const createTask = (client: DatabaseClient, input: CreateTaskInput): TaskRecord => {
  const timestamp = nowIso();

  client.run(
    `INSERT INTO tasks (
      id,
      title,
      description,
      assigned_agent_id,
      status,
      required_skills_json,
      linked_files_json,
      result_summary,
      created_from,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.title,
      nullable(input.description),
      nullable(input.assignedAgentId),
      input.status ?? "backlog",
      jsonStringify(input.requiredSkills, "[]"),
      jsonStringify(input.linkedFiles, "[]"),
      nullable(input.resultSummary),
      nullable(input.createdFrom),
      timestamp,
      timestamp
    ]
  );

  return getTask(client, input.id) as TaskRecord;
};

export const getTask = (client: DatabaseClient, taskId: string): TaskRecord | null =>
  client.get<TaskRecord>("SELECT * FROM tasks WHERE id = ?", [taskId]);

export const listTasks = (client: DatabaseClient): TaskRecord[] =>
  client.all<TaskRecord>("SELECT * FROM tasks ORDER BY created_at ASC");

export const assignTask = (client: DatabaseClient, taskId: string, agentId: string): TaskRecord => {
  client.run("UPDATE tasks SET assigned_agent_id = ?, status = ?, updated_at = ? WHERE id = ?", [
    agentId,
    "assigned",
    nowIso(),
    taskId
  ]);
  const task = getTask(client, taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  return task;
};

export const updateTaskStatus = (
  client: DatabaseClient,
  input: { taskId: string; status: string; resultSummary?: string | null }
): TaskRecord => {
  client.run("UPDATE tasks SET status = ?, result_summary = COALESCE(?, result_summary), updated_at = ? WHERE id = ?", [
    input.status,
    input.resultSummary ?? null,
    nowIso(),
    input.taskId
  ]);
  const task = getTask(client, input.taskId);

  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  return task;
};

export const linkTaskEvent = (client: DatabaseClient, taskId: string, eventId: string): TaskEventRecord => {
  client.run(
    `INSERT INTO task_events (task_id, event_id, linked_at)
     VALUES (?, ?, ?)
     ON CONFLICT(task_id, event_id) DO UPDATE SET linked_at = excluded.linked_at`,
    [taskId, eventId, nowIso()]
  );

  return client.get<TaskEventRecord>("SELECT * FROM task_events WHERE task_id = ? AND event_id = ?", [
    taskId,
    eventId
  ]) as TaskEventRecord;
};

