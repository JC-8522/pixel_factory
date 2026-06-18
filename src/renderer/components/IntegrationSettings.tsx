import { useEffect, useState, type ReactElement } from "react";
import type { OfficeTheme } from "../../shared/ipc";
import { useIntegrationStore } from "../stores/integrationStore";

const workspaceId = (): string => `workspace-${Date.now()}`;

export function IntegrationSettings(): ReactElement {
  const [name, setName] = useState("Client Workspace");
  const [rootPath, setRootPath] = useState("C:\\Users\\Administrator\\Desktop\\repo\\pixel_factory");
  const {
    workspaces,
    activeWorkspaceId,
    theme,
    status,
    replayEvents,
    loading,
    hydrate,
    createWorkspace,
    selectWorkspace,
    setTheme,
    refreshStatus
  } = useIntegrationStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onCreateWorkspace = async (): Promise<void> => {
    const workspace = await createWorkspace({ id: workspaceId(), name, rootPath });
    await selectWorkspace(workspace.id);
  };

  return (
    <section className="integration-workspace">
      <header className="toolbar">
        <div>
          <p className="eyebrow">V2 integration foundation</p>
          <h2>Integrations</h2>
        </div>
        <button className="primary-action" onClick={() => void refreshStatus()} type="button">Refresh Status</button>
      </header>

      <div className="integration-grid">
        <section className="ops-panel">
          <div className="panel-heading">
            <h3>Project Workspace</h3>
            <span>{activeWorkspaceId}</span>
          </div>
          <div className="integration-form">
            <label>
              Workspace name
              <input aria-label="Workspace name" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Root path
              <input aria-label="Workspace root path" value={rootPath} onChange={(event) => setRootPath(event.target.value)} />
            </label>
            <button onClick={() => void onCreateWorkspace()} type="button" disabled={loading}>Create And Select</button>
          </div>
          <div className="workspace-list">
            {workspaces.map((workspace) => (
              <button
                className={workspace.id === activeWorkspaceId ? "workspace-row active" : "workspace-row"}
                key={workspace.id}
                onClick={() => void selectWorkspace(workspace.id)}
                type="button"
              >
                <strong>{workspace.name}</strong>
                <span>{workspace.rootPath || "default local scope"}</span>
              </button>
            ))}
          </div>
          <p className="pack-note">Workspace selection is persisted and provides the V2 scoping boundary for agents, tasks, events, and future integrations.</p>
        </section>

        <section className="ops-panel">
          <div className="panel-heading">
            <h3>Attach / MCP</h3>
            <span>{status?.attach.status ?? "checking"}</span>
          </div>
          <div className="integration-status-list">
            <article className="pack-item">
              <strong>Attach Mode</strong>
              <span>{status?.attach.reason ?? "Attach status has not loaded yet."}</span>
              <code>detected={status?.attach.detectedSessions ?? 0}; controllable={String(status?.attach.controllable ?? false)}</code>
            </article>
            <article className="pack-item">
              <strong>MCP Runtime Bridge</strong>
              <span>{status?.mcp.reason ?? "MCP status has not loaded yet."}</span>
              <code>{status?.mcp.status ?? "unknown"}</code>
            </article>
            <article className="pack-item">
              <strong>GitHub PR Boundary</strong>
              <span>{status?.github.reason ?? "GitHub boundary has not loaded yet."}</span>
            </article>
            <article className="pack-item">
              <strong>Plugin Registry</strong>
              <span>{status?.plugins.reason ?? "Plugin boundary has not loaded yet."}</span>
            </article>
          </div>
        </section>

        <section className="ops-panel">
          <div className="panel-heading">
            <h3>Office Theme</h3>
            <span>{theme}</span>
          </div>
          <div className="theme-options" role="group" aria-label="Office theme">
            {(["default", "forest", "focus"] as OfficeTheme[]).map((item) => (
              <button
                className={theme === item ? "theme-swatch active" : "theme-swatch"}
                data-theme-name={item}
                key={item}
                onClick={() => void setTheme(item)}
                type="button"
              >
                <span aria-hidden="true" />
                {item}
              </button>
            ))}
          </div>
          <h4>Timeline Replay</h4>
          <div className="timeline-list compact">
            {replayEvents.map((event) => (
              <article className="timeline-event" key={event.id} data-severity={event.severity}>
                <strong>{event.type}</strong>
                <span>{event.created_at}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
