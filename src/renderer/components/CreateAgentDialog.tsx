import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import type { CreateAgentRequest } from "../../shared/ipc";
import type { SkillRecord, WorkstationRecord } from "../../shared/types/records";
import { agentFrameIndex, agentSheetUrl, spriteSheetStyle } from "../office/officeLayout";
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

const initialForm = (agentCount: number): CreateAgentFormState => ({
  name: `AI Employee ${agentCount + 1}`,
  role: "Developer",
  workingDirectory: ".",
  permissionMode: "ask",
  initialTask: "Introduce yourself as a new AI employee and explain how you can help this one-person company."
});

export function CreateAgentDialog({
  agentCount,
  onClose,
  onCreated,
  workstation
}: CreateAgentDialogProps): ReactElement {
  const [form, setForm] = useState<CreateAgentFormState>(() => initialForm(agentCount));
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [modelProfile, setModelProfile] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewSpriteStyle = useMemo(() => spriteSheetStyle(agentSheetUrl, agentFrameIndex("idle")), []);

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
            <p className="eyebrow">AI Employee Setup</p>
            <h3>Create AI Employee</h3>
            <p className="dialog-subtitle">
              Seat: {workstation.name ?? workstation.slot_key}. Opening a persistent conversation on this workstation.
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
          <div className="create-agent-layout">
            <aside className="create-agent-hero-panel">
              <p className="create-agent-seat-badge">{workstation.name ?? workstation.slot_key}</p>
              <div className="create-agent-avatar-card">
                <span aria-hidden="true" className="create-agent-avatar-sprite" style={previewSpriteStyle} />
              </div>
              <div className="create-agent-hero-copy">
                <h4>Open a new AI employee conversation</h4>
                <p>
                  This creates one AI employee seated at this workstation. That employee keeps one persistent Codex-style
                  conversation history that you can reopen from the office floor.
                </p>
              </div>
              <ul className="create-agent-hero-list">
                <li>The seat label becomes the AI employee name.</li>
                <li>Replies stay attached to this workstation.</li>
                <li>Future office actions open from the same scene.</li>
              </ul>
            </aside>

            <div className="create-agent-fields">
              <div className="form-grid">
                <label>
                  AI employee name
                  <input className="pixel-field" onChange={(event) => updateField("name", event.target.value)} value={form.name} />
                  {errors.name ? <span className="form-error">{errors.name}</span> : null}
                </label>

                <label>
                  Role
                  <input
                    className="pixel-field"
                    onChange={(event) => updateField("role", event.target.value)}
                    placeholder="Developer, growth, operator, reviewer..."
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

              <details className="create-agent-advanced">
                <summary>Advanced setup</summary>
                <div className="create-agent-advanced-body">
                  <div className="form-grid">
                    <label>
                      Model profile
                      <input className="pixel-field" onChange={(event) => setModelProfile(event.target.value)} placeholder="default" value={modelProfile} />
                    </label>
                    <label>
                      Runtime
                      <input className="pixel-field" readOnly value="Local Codex" />
                    </label>
                  </div>

                  <fieldset className="skill-checklist">
                    <legend>Skills</legend>
                    <div className="skill-toolbar">
                      <input
                        aria-label="Search skills"
                        className="pixel-field"
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
                </div>
              </details>
            </div>
          </div>

          {submitError ? <p className="form-error">{submitError}</p> : null}

          <footer className="dialog-actions">
            <button className="pixel-button pixel-button-secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-action pixel-button pixel-button-primary" disabled={busy} type="submit">
              {busy ? "Creating..." : "Create AI Employee"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
