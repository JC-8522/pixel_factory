import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import type { CreateAgentRequest } from "../../shared/ipc";
import type { AgentProfileRecord, AgentProfileSkillRecord, SkillRecord } from "../../shared/types/records";
import { AgentProfilePicker } from "./AgentProfilePicker";
import {
  hasCreateAgentFormErrors,
  validateCreateAgentForm,
  type CreateAgentFormErrors,
  type CreateAgentFormState
} from "./createAgentFormValidation";

const createId = (prefix: string): string => `${prefix}-${Date.now()}`;

const roleOptions = ["Developer Agent", "Reviewer Agent", "QA Agent", "Manager Agent", "Research Agent"];

type CreateAgentDialogProps = {
  agentCount: number;
  onClose(): void;
  onCreated(agentId: string): Promise<void>;
};

const initialForm = (agentCount: number): CreateAgentFormState => ({
  name: `Agent ${agentCount + 1}`,
  role: "Developer Agent",
  workingDirectory: ".",
  runtimeKind: "mock",
  permissionMode: "ask",
  autoRunMode: "manual",
  initialTask: "Introduce yourself and explain how you can help the manager."
});

export function CreateAgentDialog({ agentCount, onClose, onCreated }: CreateAgentDialogProps): ReactElement {
  const [form, setForm] = useState<CreateAgentFormState>(() => initialForm(agentCount));
  const [profiles, setProfiles] = useState<AgentProfileRecord[]>([]);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [profileSkills, setProfileSkills] = useState<AgentProfileSkillRecord[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [modelProfile, setModelProfile] = useState("");
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([window.codexOffice.profiles.list(), window.codexOffice.skills.list()]).then(
      ([loadedProfiles, loadedSkills]) => {
        setProfiles(loadedProfiles);
        setSkills(loadedSkills);
      }
    );
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  const selectedProfileSkillIds = useMemo(() => profileSkills.map((skill) => skill.skill_id), [profileSkills]);

  const updateField = (field: keyof CreateAgentFormState, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const chooseProfile = async (profileId: string): Promise<void> => {
    setSelectedProfileId(profileId);
    setProfileSkills([]);

    if (!profileId) {
      setSelectedSkillIds([]);
      return;
    }

    const profile = profiles.find((item) => item.id === profileId);
    const assignments = await window.codexOffice.profiles.listSkills(profileId);
    setProfileSkills(assignments);
    setSelectedSkillIds(assignments.map((assignment) => assignment.skill_id));

    if (profile) {
      setForm((current) => ({
        ...current,
        role: profile.role || current.role,
        permissionMode: profile.default_permission_mode || current.permissionMode,
        autoRunMode: profile.default_auto_run_mode || current.autoRunMode,
        initialTask: profile.instructions || current.initialTask
      }));
      setModelProfile(profile.default_model_profile ?? "");
    }
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
        runtimeKind: form.runtimeKind,
        permissionMode: form.permissionMode,
        autoRunMode: form.autoRunMode,
        modelProfile: modelProfile.trim() || null,
        profileId: selectedProfileId || null,
        skillIds: selectedSkillIds,
        currentTask: form.initialTask.trim(),
        metadata: {
          createdFromUi: true,
          managerControlled: form.role !== "Manager Agent"
        }
      };

      await window.codexOffice.runtime.spawnAgent(payload);
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
              <select onChange={(event) => updateField("role", event.target.value)} value={form.role}>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {errors.role ? <span className="form-error">{errors.role}</span> : null}
            </label>
          </div>

          <AgentProfilePicker profiles={profiles} selectedProfileId={selectedProfileId} onChange={(id) => void chooseProfile(id)} />

          {selectedProfile ? (
            <p className="profile-hint">
              {selectedProfile.name} defaults are loaded. The main process will generate the immutable snapshot.
            </p>
          ) : null}

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
              Runtime
              <select onChange={(event) => updateField("runtimeKind", event.target.value)} value={form.runtimeKind}>
                <option value="mock">Mock runtime</option>
                <option value="codex_cli">Codex CLI</option>
              </select>
              {errors.runtimeKind ? <span className="form-error">{errors.runtimeKind}</span> : null}
            </label>

            <label>
              Model profile
              <input onChange={(event) => setModelProfile(event.target.value)} placeholder="default" value={modelProfile} />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Permission mode
              <select onChange={(event) => updateField("permissionMode", event.target.value)} value={form.permissionMode}>
                <option value="ask">Ask</option>
                <option value="readonly">Read-only</option>
                <option value="full">Full local</option>
              </select>
              {errors.permissionMode ? <span className="form-error">{errors.permissionMode}</span> : null}
            </label>

            <label>
              Auto-run mode
              <select onChange={(event) => updateField("autoRunMode", event.target.value)} value={form.autoRunMode}>
                <option value="manual">Manual</option>
                <option value="auto">Auto</option>
                <option value="external">External</option>
              </select>
              {errors.autoRunMode ? <span className="form-error">{errors.autoRunMode}</span> : null}
            </label>
          </div>

          <fieldset className="skill-checklist">
            <legend>Skills</legend>
            {skills.length === 0 ? (
              <p className="empty-note">No skills scanned yet.</p>
            ) : (
              skills.map((skill) => (
                <label key={skill.id}>
                  <input
                    checked={selectedSkillIds.includes(skill.id)}
                    onChange={() => toggleSkill(skill.id)}
                    type="checkbox"
                  />
                  <span>{skill.name}</span>
                  {selectedProfileSkillIds.includes(skill.id) ? <em>profile default</em> : null}
                </label>
              ))
            )}
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
