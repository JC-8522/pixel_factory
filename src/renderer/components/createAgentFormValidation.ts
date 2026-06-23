export type CreateAgentFormState = {
  name: string;
  role: string;
  workingDirectory: string;
  permissionMode: string;
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

  if (!["ask", "readonly", "full"].includes(form.permissionMode)) {
    errors.permissionMode = "Choose a permission mode.";
  }

  if (!form.initialTask.trim()) {
    errors.initialTask = "Initial brief is required so the agent has a first run.";
  }

  return errors;
};

export const hasCreateAgentFormErrors = (errors: CreateAgentFormErrors): boolean => Object.keys(errors).length > 0;
