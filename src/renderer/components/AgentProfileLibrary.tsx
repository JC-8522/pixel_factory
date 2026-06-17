import { useEffect, useMemo, type ReactElement } from "react";
import { useProfileStore } from "../stores/profileStore";
import { useSkillStore } from "../stores/skillStore";
import { AgentCapabilityMatrix } from "./AgentCapabilityMatrix";
import { AgentProfileEditor } from "./AgentProfileEditor";

const createId = (prefix: string): string => `${prefix}-${Date.now()}`;

export function AgentProfileLibrary(): ReactElement {
  const {
    profiles,
    selectedProfileId,
    capabilityMatrix,
    exportedProfile,
    hydrate,
    selectProfile,
    createProfile,
    duplicateProfile,
    deleteProfile,
    assignSkill,
    exportProfile
  } = useProfileStore();
  const { skills, hydrate: hydrateSkills, scan } = useSkillStore();

  useEffect(() => {
    void hydrate();
    void hydrateSkills();
  }, [hydrate, hydrateSkills]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  const createDefaultProfile = async (): Promise<void> => {
    const id = createId("profile");
    await createProfile({
      id,
      name: `Developer Profile ${profiles.length + 1}`,
      role: "Developer Agent",
      persona: "Careful local coding agent",
      instructions: "Work in small verified steps and report concrete changes.",
      defaultPermissionMode: "ask_before_edit",
      defaultAutoRunMode: "manual",
      communicationStyle: "concise",
      collaborationBehavior: { reviewLoop: "developer_reviewer" },
      validationPolicy: { requiresTests: true },
      visualIdentity: { color: "green" }
    });
  };

  const assignFirstSkill = async (): Promise<void> => {
    if (!selectedProfileId) {
      return;
    }

    if (skills.length === 0) {
      await scan();
    }

    const skill = useSkillStore.getState().skills[0];
    if (skill) {
      await assignSkill({ profileId: selectedProfileId, skillId: skill.id, required: false });
    }
  };

  return (
    <section className="profile-library" aria-label="Agent profile library">
      <div className="profile-library-header">
        <div>
          <p className="eyebrow">Agent Registry</p>
          <h2>Agent Profiles</h2>
        </div>
        <button className="primary-action" onClick={() => void createDefaultProfile()} type="button">
          New Profile
        </button>
      </div>

      <div className="profile-grid">
        <section className="profile-panel" aria-label="Profiles">
          <h3>Library</h3>
          <div className="profile-list">
            {profiles.length === 0 ? (
              <p className="empty-note">No profiles yet.</p>
            ) : (
              profiles.map((profile) => (
                <button
                  className={profile.id === selectedProfileId ? "profile-row active" : "profile-row"}
                  key={profile.id}
                  onClick={() => void selectProfile(profile.id)}
                  type="button"
                >
                  <strong>{profile.name}</strong>
                  <span>{profile.role}</span>
                </button>
              ))
            )}
          </div>

          <div className="profile-actions">
            <button disabled={!selectedProfile} onClick={() => selectedProfile && void duplicateProfile({ profileId: selectedProfile.id, newProfileId: createId("profile-copy") })} type="button">
              Duplicate
            </button>
            <button disabled={!selectedProfile} onClick={() => selectedProfile && void exportProfile(selectedProfile.id)} type="button">
              Export
            </button>
            <button disabled={!selectedProfile} onClick={() => selectedProfile && void assignFirstSkill()} type="button">
              Add First Skill
            </button>
            <button disabled={!selectedProfile} onClick={() => selectedProfile && void deleteProfile(selectedProfile.id)} type="button">
              Delete
            </button>
          </div>
        </section>

        <AgentProfileEditor profile={selectedProfile} />
        <AgentCapabilityMatrix matrix={capabilityMatrix} />
      </div>

      {exportedProfile ? (
        <section className="profile-panel" aria-label="Exported profile">
          <h3>Export Preview</h3>
          <pre className="profile-export">{JSON.stringify(exportedProfile, null, 2)}</pre>
        </section>
      ) : null}
    </section>
  );
}
