import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { EventRecord, PermissionRuleRecord } from "../../shared/types/records";
import type { ProjectWorkspace } from "../../shared/ipc";

export function PermissionSettings(): ReactElement {
  const [rules, setRules] = useState<PermissionRuleRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [workspaces, setWorkspaces] = useState<ProjectWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("default");

  const hydrate = async (): Promise<void> => {
    const [nextRules, nextEvents, nextWorkspaces, nextActiveWorkspaceId] = await Promise.all([
      window.codexOffice.permissions.listRules(),
      window.codexOffice.events.list(),
      window.codexOffice.workspaces.list(),
      window.codexOffice.workspaces.getActive()
    ]);

    setRules(nextRules);
    setEvents(
      nextEvents.filter((event) =>
        ["permission_requested", "permission_decided", "permission_denied", "permission_rule_revoked"].includes(event.type)
      )
    );
    setWorkspaces(nextWorkspaces);
    setActiveWorkspaceId(nextActiveWorkspaceId);
  };

  useEffect(() => {
    void hydrate();
  }, []);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const displayedRules = useMemo(() => {
    if (!activeWorkspace?.rootPath) {
      return rules;
    }

    const matching = rules.filter((rule) => rule.project_path === activeWorkspace.rootPath);
    return matching.length > 0 ? matching : rules;
  }, [activeWorkspace?.rootPath, rules]);

  const revoke = async (ruleId: string): Promise<void> => {
    await window.codexOffice.permissions.revokeRule(ruleId);
    await hydrate();
  };

  return (
    <section className="integration-workspace">
      <header className="toolbar">
        <div>
          <p className="eyebrow">Governance / Audit</p>
          <h2>Permissions</h2>
        </div>
        <button className="primary-action" onClick={() => void hydrate()} type="button">
          Refresh
        </button>
      </header>

      <div className="integration-grid">
        <section className="ops-panel">
          <div className="panel-heading">
            <h3>Scoped Allow Rules</h3>
            <span>{displayedRules.length}</span>
          </div>
          <p className="pack-note">
            {activeWorkspace?.rootPath
              ? `Showing rules for ${activeWorkspace.name} when available.`
              : "Showing all project-scoped allow rules."}
          </p>
          <div className="workspace-list">
            {displayedRules.length === 0 ? (
              <p className="empty-note">No saved allow rules yet.</p>
            ) : (
              displayedRules.map((rule) => (
                <article className="pack-item permission-rule-item" key={rule.id}>
                  <strong>{rule.rule_kind || "review"}</strong>
                  <span>{rule.project_path}</span>
                  <code>{rule.command_pattern}</code>
                  <button onClick={() => void revoke(rule.id)} type="button">
                    Revoke
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="ops-panel">
          <div className="panel-heading">
            <h3>Permission Activity</h3>
            <span>{events.length}</span>
          </div>
          <div className="timeline-list compact">
            {events.length === 0 ? (
              <p className="empty-note">No permission events yet.</p>
            ) : (
              events.slice(0, 20).map((event) => (
                <article className="timeline-event" data-severity={event.severity} key={event.id}>
                  <strong>{event.type}</strong>
                  <span>{event.created_at}</span>
                  <pre>{event.payload_json}</pre>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
