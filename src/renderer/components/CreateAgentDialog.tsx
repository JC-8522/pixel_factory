import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import type { CreateAgentRequest } from "../../shared/ipc";
import type { SkillRecord } from "../../shared/types/records";
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
  onCreated(agentId: string): Promise<void>;
};

const initialForm = (agentCount: number): CreateAgentFormState => ({
  name: `Agent ${agentCount + 1}`,
  role: "Developer",
  workingDirectory: ".",
  permissionMode: "ask",
  initialTask: "Introduce yourself and explain how you can help the manager."
});

export function CreateAgentDialog({
  agentCount,
  onClose,
  onCreated
}: CreateAgentDialogProps): ReactElement {
  const [form, setForm] = useState<CreateAgentFormState>(() => initialForm(agentCount));
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [modelProfile, setModelProfile] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.codexOffice.skills.list().then(setSkills);
  }, []);
  const visibleSkills = useMemo(
    () =>
      skills.filter((skill) => {
        const normalizedQuery = skillQuery.trim().toLowerCase();
        if (normalizedQuery.length === 0) {
          return false;
        }
        const matchesQuery =
          skill.name.toLowerCase().includes(normalizedQuery) ||
          (skill.description ?? "").toLowerCase().includes(normalizedQuery);
        return matchesQuery;
      }),
    [skillQuery, skills]
  );
  const selectedSkills = useMemo(
    () => skills.filter((skill) => selectedSkillIds.includes(skill.id)),
    [selectedSkillIds, skills]
  );

  const updateField = (field: keyof CreateAgentFormState, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleSkill = (skillId: string): void => {
    setSelectedSkillIds((current) =>
      current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId]
    );
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
        role: form.role,
        workingDirectory: form.workingDirectory.trim(),
        runtimeKind: "codex_cli",
        permissionMode: form.permissionMode,
        autoRunMode: "manual",
        modelProfile: modelProfile.trim() || null,
        skillIds: selectedSkillIds,
        currentTask: form.initialTask.trim(),
        metadata: {
          createdFromUi: true,
          managerControlled: true
        }
      };

      await window.codexOffice.agents.create(payload);
      await onCreated(agentId);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create agent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section aria-label="Create agent" className="dialog-panel">
        <header className="dialog-header">
          <div>
            <p className="eyebrow">Agent Registry</p>
            <h3>Create Agent</h3>
          </div>
          <button aria-label="Close create agent dialog" className="icon-button" onClick={onClose} type="button">
            x
          </button>
        </header>

        <form className="create-agent-form" onSubmit={(event) => void submit(event)}>
          <div className="form-grid">
            <label>
              Agent name
              <input onChange={(event) => updateField("name", event.target.value)} value={form.name} />
              {errors.name ? <span className="form-error">{errors.name}</span> : null}
            </label>

            <label>
              Role
              <input onChange={(event) => updateField("role", event.target.value)} placeholder="Developer, growth, operator, reviewer..." value={form.role} />
              {errors.role ? <span className="form-error">{errors.role}</span> : null}
            </label>
          </div>

          <label>
            Working directory
            <div className="directory-row">
              <input onChange={(event) => updateField("workingDirectory", event.target.value)} value={form.workingDirectory} />
              <button onClick={() => void pickWorkingDirectory()} type="button">
                Browse
              </button>
            </div>
            {errors.workingDirectory ? <span className="form-error">{errors.workingDirectory}</span> : null}
          </label>

          <div className="form-grid">
            <label>
              Model profile
              <input onChange={(event) => setModelProfile(event.target.value)} placeholder="default" value={modelProfile} />
            </label>
            <label>
              Runtime
              <input readOnly value="Local Codex" />
            </label>
          </div>

          <label>
            Permission mode
            <select onChange={(event) => updateField("permissionMode", event.target.value)} value={form.permissionMode}>
              <option value="ask">Ask</option>
              <option value="readonly">Read-only</option>
              <option value="full">Full local</option>
            </select>
            {errors.permissionMode ? <span className="form-error">{errors.permissionMode}</span> : null}
          </label>

          <fieldset className="skill-checklist">
            <legend>Skills</legend>
            <div className="skill-toolbar">
              <input
                aria-label="Search skills"
                onChange={(event) => setSkillQuery(event.target.value)}
                placeholder="Search skills"
                value={skillQuery}
              />
            </div>
            {skills.length === 0 ? (
              <p className="empty-note">No skills available yet.</p>
            ) : skillQuery.trim().length === 0 ? (
              <p className="empty-note">Search to find skills.</p>
            ) : visibleSkills.length === 0 ? (
              <p className="empty-note">No skills match this search.</p>
            ) : (
              visibleSkills.slice(0, 12).map((skill) => (
                <label key={skill.id}>
                  <input
                    checked={selectedSkillIds.includes(skill.id)}
                    onChange={() => toggleSkill(skill.id)}
                    type="checkbox"
                  />
                  <span>{skill.name}</span>
                </label>
              ))
            )}
            {selectedSkills.length > 0 ? (
              <div className="skill-selected-list">
                <strong>Selected</strong>
                <div className="skill-badges">
                  {selectedSkills.map((skill) => (
                    <button className="skill-badge" key={skill.id} onClick={() => toggleSkill(skill.id)} type="button">
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </fieldset>

          <label>
            Initial task
            <textarea onChange={(event) => updateField("initialTask", event.target.value)} value={form.initialTask} />
            {errors.initialTask ? <span className="form-error">{errors.initialTask}</span> : null}
          </label>

          {submitError ? <p className="form-error">{submitError}</p> : null}

          <footer className="dialog-actions">
            <button onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-action" disabled={busy} type="submit">
              {busy ? "Creating..." : "Create agent"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
