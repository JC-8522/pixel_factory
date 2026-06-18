import type { ReactElement } from "react";
import type { AgentProfileRecord } from "../../shared/types/records";

type AgentProfilePickerProps = {
  profiles: AgentProfileRecord[];
  selectedProfileId: string;
  onChange(profileId: string): void;
};

export function AgentProfilePicker({ profiles, selectedProfileId, onChange }: AgentProfilePickerProps): ReactElement {
  return (
    <label>
      Agent Profile
      <select onChange={(event) => onChange(event.target.value)} value={selectedProfileId}>
        <option value="">No profile</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name} - {profile.role}
          </option>
        ))}
      </select>
    </label>
  );
}
