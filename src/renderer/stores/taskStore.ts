import { create } from "zustand";
import type { AssignTaskRequest, CreateTaskRequest, UpdateTaskStatusRequest } from "../../shared/ipc";
import type { TaskRecord } from "../../shared/types/records";

type TaskState = {
  tasks: TaskRecord[];
  loading: boolean;
  hydrate(): Promise<void>;
  createTask(input: CreateTaskRequest): Promise<TaskRecord>;
  assignTask(input: AssignTaskRequest): Promise<TaskRecord>;
  updateStatus(input: UpdateTaskStatusRequest): Promise<TaskRecord>;
  reset(): void;
};

const upsertTask = (tasks: TaskRecord[], task: TaskRecord): TaskRecord[] => [
  ...tasks.filter((item) => item.id !== task.id),
  task
];

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
  hydrate: async () => {
    set({ loading: true });
    const tasks = await window.codexOffice.tasks.list();
    set({ tasks, loading: false });
  },
  createTask: async (input) => {
    const task = await window.codexOffice.tasks.create(input);
    set((state) => ({ tasks: upsertTask(state.tasks, task) }));
    return task;
  },
  assignTask: async (input) => {
    const task = await window.codexOffice.tasks.assign(input);
    set((state) => ({ tasks: upsertTask(state.tasks, task) }));
    return task;
  },
  updateStatus: async (input) => {
    const task = await window.codexOffice.tasks.updateStatus(input);
    set((state) => ({ tasks: upsertTask(state.tasks, task) }));
    return task;
  },
  reset: () => set({ tasks: [], loading: false })
}));

