import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import type { AgentProfileRecord } from "../../shared/types/records";
import { useProfileStore } from "../stores/profileStore";

type Props = {
  profile: AgentProfileRecord | null;
};

export function AgentProfileEditor({ profile }: Props): ReactElement {
  const { updateProfile } = useProfileStore();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [instructions, setInstructions] = useState("");
  const [permissionMode, setPermissionMode] = useState("ask_before_edit");
  const [communicationStyle, setCommunicationStyle] = useState("concise");

  useEffect(() => {
    setName(profile?.name ?? "");
    setRole(profile?.role ?? "");
    setInstructions(profile?.instructions ?? "");
    setPermissionMode(profile?.default_permission_mode ?? "ask_before_edit");
    setCommunicationStyle(profile?.communication_style ?? "concise");
  }, [profile]);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!profile) {
      return;
    }

    await updateProfile({
      profileId: profile.id,
      patch: {
        name,
        role,
        instructions,
        defaultPermissionMode: permissionMode,
        communicationStyle
      }
    });
  };

  return (
    <section className="profile-panel" aria-label="Agent profile editor">
      <h3>Profile Editor</h3>
      {!profile ? (
        <p className="empty-note">Create or select a profile.</p>
      ) : (
        <form className="profile-form" onSubmit={(event) => void submit(event)}>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Role
            <input value={role} onChange={(event) => setRole(event.target.value)} />
          </label>
          <label>
            Permission preset
            <select value={permissionMode} onChange={(event) => setPermissionMode(event.target.value)}>
              <option value="readonly">readonly</option>
              <option value="ask_before_edit">ask_before_edit</option>
              <option value="workspace_write">workspace_write</option>
              <option value="auto_run_safe_commands">auto_run_safe_commands</option>
            </select>
          </label>
          <label>
            Communication style
            <input value={communicationStyle} onChange={(event) => setCommunicationStyle(event.target.value)} />
          </label>
          <label>
            Instructions
            <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} />
          </label>
          <button className="primary-action" type="submit">Save Profile</button>
        </form>
      )}
    </section>
  );
}
