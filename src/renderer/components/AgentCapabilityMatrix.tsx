import type { ReactElement } from "react";
import type { AgentCapabilityMatrix as Matrix } from "../../shared/ipc";

type Props = {
  matrix: Matrix | null;
};

export function AgentCapabilityMatrix({ matrix }: Props): ReactElement {
  if (!matrix) {
    return (
      <section className="profile-panel" aria-label="Agent capability matrix">
        <h3>Capability Matrix</h3>
        <p className="empty-note">Select a profile to inspect capabilities.</p>
      </section>
    );
  }

  return (
    <section className="profile-panel" aria-label="Agent capability matrix">
      <h3>Capability Matrix</h3>
      <dl className="profile-facts">
        <div>
          <dt>Role</dt>
          <dd>{matrix.role}</dd>
        </div>
        <div>
          <dt>Permission</dt>
          <dd>{matrix.permissionPreset ?? "not set"}</dd>
        </div>
        <div>
          <dt>Skills</dt>
          <dd>{matrix.skills.length}</dd>
        </div>
      </dl>

      <div className="capability-list">
        {matrix.skills.length === 0 ? (
          <p className="empty-note">No default skills assigned.</p>
        ) : (
          matrix.skills.map((skill) => (
            <span className="skill-badge" key={skill.id}>
              {skill.name}
              {skill.required ? " required" : ""}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
