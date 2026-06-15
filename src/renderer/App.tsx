import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { AppInfo, OfficeAgentPreview } from "../shared/types/app";

const previewAgents: OfficeAgentPreview[] = [
  {
    id: "manager-agent",
    name: "Manager Agent",
    role: "Manager Agent",
    status: "thinking",
    zone: "meeting_room"
  },
  {
    id: "frontend-agent",
    name: "Frontend",
    role: "Frontend Engineer",
    status: "idle",
    zone: "desks"
  },
  {
    id: "qa-agent",
    name: "QA",
    role: "QA Tester",
    status: "waiting_user_input",
    zone: "whiteboard"
  }
];

const statusLabel: Record<OfficeAgentPreview["status"], string> = {
  idle: "Idle",
  thinking: "Thinking",
  running_command: "Running",
  reading_files: "Reading",
  editing_files: "Editing",
  waiting_user_input: "Needs input",
  error: "Error",
  completed: "Completed",
  stopped: "Stopped"
};

export function App(): ReactElement {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState(previewAgents[0]?.id ?? "");

  useEffect(() => {
    void window.codexOffice.app.getInfo().then(setAppInfo);
  }, []);

  const selectedAgent = useMemo(
    () => previewAgents.find((agent) => agent.id === selectedAgentId) ?? previewAgents[0],
    [selectedAgentId]
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Local Codex Office</h1>
            <p>{appInfo ? `${appInfo.mode} v${appInfo.version}` : "Starting local workspace"}</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Workspace sections">
          <button className="nav-item active" type="button">Office</button>
          <button className="nav-item" type="button">Agents</button>
          <button className="nav-item" type="button">Skills</button>
          <button className="nav-item" type="button">Tasks</button>
          <button className="nav-item" type="button">Timeline</button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="toolbar">
          <div>
            <p className="eyebrow">Human manager workspace</p>
            <h2>Pixel Office</h2>
          </div>
          <button className="primary-action" type="button">Create Agent</button>
        </header>

        <div className="content-grid">
          <section className="office-surface" aria-label="Pixel office preview">
            <div className="office-zone meeting-room">Meeting room</div>
            <div className="office-zone whiteboard">Whiteboard</div>
            <div className="office-zone desks">Desks</div>
            <div className="office-zone shelf">Skill shelf</div>

            {previewAgents.map((agent, index) => (
              <button
                className={`agent-sprite ${agent.id === selectedAgentId ? "selected" : ""}`}
                data-status={agent.status}
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                style={{
                  left: `${22 + index * 23}%`,
                  top: `${38 + (index % 2) * 24}%`
                }}
                type="button"
              >
                <span className="agent-head" aria-hidden="true" />
                <span className="agent-body" aria-hidden="true" />
                <span className="agent-label">{agent.name}</span>
              </button>
            ))}
          </section>

          <aside className="detail-panel" aria-label="Selected agent details">
            <p className="eyebrow">Selected agent</p>
            <h3>{selectedAgent.name}</h3>
            <dl>
              <div>
                <dt>Role</dt>
                <dd>{selectedAgent.role}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{statusLabel[selectedAgent.status]}</dd>
              </div>
              <div>
                <dt>Zone</dt>
                <dd>{selectedAgent.zone.replaceAll("_", " ")}</dd>
              </div>
            </dl>
            <div className="chat-preview">
              <p>Chat and runtime events will appear here after the runtime task is implemented.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
