import { useState, type FormEvent, type ReactElement } from "react";
import type { CreateAgentRequest } from "../../shared/ipc";
import type { WorkstationRecord } from "../../shared/types/records";
import {
  hasCreateAgentFormErrors,
  validateCreateAgentForm,
  type CreateAgentFormErrors,
  type CreateAgentFormState
} from "./createAgentFormValidation";

const createId = (prefix: string): string => `${prefix}-${Date.now()}`;

type CreateAgentDialogProps = {
  agentCount: number;
  onClose(): void;
  onCreated(agentId: string, workstationId: string | null): Promise<void>;
  workstation: WorkstationRecord;
};

const initialForm = (agentCount: number, workstation: WorkstationRecord): CreateAgentFormState => ({
  name: workstation.name?.trim() || `Agent ${agentCount + 1}`,
  role: "Codex Agent",
  workingDirectory: ".",
  permissionMode: "ask",
  initialTask: "Introduce yourself as the new agent for this workstation and explain how you can help this team."
});

export function CreateAgentDialog({
  agentCount,
  onClose,
  onCreated,
  workstation
}: CreateAgentDialogProps): ReactElement {
  const [form, setForm] = useState<CreateAgentFormState>(() => initialForm(agentCount, workstation));
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateField = (field: keyof CreateAgentFormState, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const pickWorkingDirectory = async (): Promise<void> => {
    const selected = await window.codexOffice.app.pickWorkingDirectory();
    if (selected) {
      updateField("workingDirectory", selected);
    }
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const nextErrors = validateCreateAgentForm(form);
    setErrors(nextErrors);
    setSubmitError(null);

    if (hasCreateAgentFormErrors(nextErrors)) {
      return;
    }

    setBusy(true);
    try {
      const agentId = createId("agent");
      const payload: CreateAgentRequest = {
        id: agentId,
        name: form.name.trim(),
        role: form.role.trim(),
        workingDirectory: form.workingDirectory.trim(),
        runtimeKind: "codex_cli",
        permissionMode: form.permissionMode,
        autoRunMode: "manual",
        currentTask: form.initialTask.trim(),
        workstationId: workstation.id,
        metadata: {
          createdFromUi: true,
          managerControlled: true,
          workstationSlotKey: workstation.slot_key
        }
      };

      await window.codexOffice.agents.create(payload);
      await onCreated(agentId, workstation.id);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create agent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section aria-label="Create agent" className="dialog-panel pixel-dialog create-agent-dialog">
        <header className="dialog-header pixel-dialog-header">
          <div>
            <p className="eyebrow">Agent Workspace Setup</p>
            <h3>Create Agent</h3>
            <p className="dialog-subtitle">
              Seat: {workstation.name ?? workstation.slot_key}. This creates one persistent AI employee workspace for
              the selected workstation.
            </p>
          </div>
          <button
            aria-label="Close create agent dialog"
            className="icon-button pixel-close-button"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <form className="create-agent-form" onSubmit={(event) => void submit(event)}>
          <div className="create-agent-fields">
            <div className="form-grid">
              <label>
                Agent name
                <input className="pixel-field" onChange={(event) => updateField("name", event.target.value)} value={form.name} />
                {errors.name ? <span className="form-error">{errors.name}</span> : null}
              </label>

              <label>
                Role
                <input
                  className="pixel-field"
                  onChange={(event) => updateField("role", event.target.value)}
                  placeholder="Developer, operator, reviewer..."
                  value={form.role}
                />
                {errors.role ? <span className="form-error">{errors.role}</span> : null}
              </label>
            </div>

            <label>
              Initial brief
              <textarea className="pixel-field" onChange={(event) => updateField("initialTask", event.target.value)} value={form.initialTask} />
              {errors.initialTask ? <span className="form-error">{errors.initialTask}</span> : null}
            </label>

            <div className="form-grid">
              <label>
                Working directory
                <div className="directory-row">
                  <input className="pixel-field" onChange={(event) => updateField("workingDirectory", event.target.value)} value={form.workingDirectory} />
                  <button className="pixel-button pixel-button-secondary" onClick={() => void pickWorkingDirectory()} type="button">
                    Browse
                  </button>
                </div>
                {errors.workingDirectory ? <span className="form-error">{errors.workingDirectory}</span> : null}
              </label>

              <label>
                Permission mode
                <select className="pixel-field" onChange={(event) => updateField("permissionMode", event.target.value)} value={form.permissionMode}>
                  <option value="ask">Ask</option>
                  <option value="readonly">Read-only</option>
                  <option value="full">Full local</option>
                </select>
                {errors.permissionMode ? <span className="form-error">{errors.permissionMode}</span> : null}
              </label>
            </div>

            <section className="create-agent-simple-note" aria-label="Create agent summary">
              <strong>What happens next</strong>
              <p>The workstation gets one AI employee, one persistent thread workspace, and one manager-controlled run history.</p>
            </section>
          </div>

          {submitError ? <p className="form-error">{submitError}</p> : null}

          <footer className="dialog-actions">
            <button className="pixel-button pixel-button-secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-action pixel-button pixel-button-primary" disabled={busy} type="submit">
              {busy ? "Creating..." : "Create Agent"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
