export type CreateAgentFormState = {
  name: string;
  role: string;
  workingDirectory: string;
  runtimeKind: string;
  permissionMode: string;
  autoRunMode: string;
  initialTask: string;
};

export type CreateAgentFormErrors = Partial<Record<keyof CreateAgentFormState, string>>;

export const validateCreateAgentForm = (form: CreateAgentFormState): CreateAgentFormErrors => {
  const errors: CreateAgentFormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Agent name is required.";
  }

  if (!form.role.trim()) {
    errors.role = "Role is required.";
  }

  if (!form.workingDirectory.trim()) {
    errors.workingDirectory = "Working directory is required.";
  }

  if (!["mock", "codex_cli"].includes(form.runtimeKind)) {
    errors.runtimeKind = "Choose a supported runtime.";
  }

  if (!["ask", "readonly", "full"].includes(form.permissionMode)) {
    errors.permissionMode = "Choose a permission mode.";
  }

  if (!["manual", "auto", "external"].includes(form.autoRunMode)) {
    errors.autoRunMode = "Choose an auto-run mode.";
  }

  if (!form.initialTask.trim()) {
    errors.initialTask = "Initial task is required so the agent has a first session.";
  }

  return errors;
};

export const hasCreateAgentFormErrors = (errors: CreateAgentFormErrors): boolean => Object.keys(errors).length > 0;
