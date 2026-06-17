import type { DatabaseClient } from "../db/client";
import { assignTask, updateTaskStatus, type TaskRecord } from "../db/repositories";
import { recordAuditEvent } from "../audit/auditEngine";

export const assignTaskThroughEngine = (
  client: DatabaseClient,
  input: { taskId: string; agentId: string }
): TaskRecord => {
  const task = assignTask(client, input.taskId, input.agentId);
  recordAuditEvent(client, {
    id: `event-task-assigned-${input.taskId}-${input.agentId}`,
    type: "task_assigned",
    actorType: "user",
    actorId: "local-user",
    agentId: input.agentId,
    taskId: input.taskId,
    payload: { taskId: input.taskId, agentId: input.agentId, reason: "manager_assignment" }
  });
  return task;
};

export const updateTaskStatusThroughEngine = (
  client: DatabaseClient,
  input: { taskId: string; status: string; resultSummary?: string | null }
): TaskRecord => updateTaskStatus(client, input);
