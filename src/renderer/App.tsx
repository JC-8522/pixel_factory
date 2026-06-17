import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import type { AgentRuntimeEvent } from "../shared/types/agent";
import type { AppInfo } from "../shared/types/app";
import type { AgentRecord } from "../shared/types/records";
import { AgentDetailDrawer } from "./components/AgentDetailDrawer";
import { AgentProfileLibrary } from "./components/AgentProfileLibrary";
import { CreateAgentDialog } from "./components/CreateAgentDialog";
import { MeetingRoom } from "./components/MeetingRoom";
import { TaskBoard } from "./components/TaskBoard";
import { OfficeCanvas } from "./office/OfficeCanvas";
import { useAgentStore } from "./stores/agentStore";
import { useEventStore } from "./stores/eventStore";
import { useSkillStore } from "./stores/skillStore";

type WorkspaceView = "office" | "profiles" | "tasks" | "meeting";

const isDetectedExternalAgent = (agentId: string, agents: AgentRecord[]): boolean => {
  const agent = agents.find((item) => item.id === agentId) ?? null;
  if (!agent) {
    return false;
  }

  try {
    const metadata = JSON.parse(agent.metadata_json) as { detected?: boolean };
    return metadata.detected === true || agent.permission_mode === "external" || agent.auto_run_mode === "external";
  } catch {
    return agent.permission_mode === "external" || agent.auto_run_mode === "external";
  }
};

export function App(): ReactElement {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [view, setView] = useState<WorkspaceView>("office");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { agents, hydrate, updatePosition } = useAgentStore();
  const { scan } = useSkillStore();
  const { hydrate: hydrateEvents } = useEventStore();

  useEffect(() => {
    void window.codexOffice.app.getInfo().then(setAppInfo);
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const unsubscribe = window.codexOffice.runtime.onEvent(() => {
      void hydrate();
      if (selectedAgentId) {
        void hydrateEvents({ agentId: selectedAgentId });
      }
    });

    return unsubscribe;
  }, [hydrate, hydrateEvents, selectedAgentId]);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  const afterAgentCreated = async (agentId: string): Promise<void> => {
    await hydrate();
    setSelectedAgentId(agentId);
    setView("office");
  };

  const discoverAgents = async (): Promise<void> => {
    const discovered = await window.codexOffice.runtime.discoverAgents();
    await hydrate();
    if (!selectedAgentId && discovered[0]) {
      setSelectedAgentId(discovered[0].id);
    }
  };

  const onMoveAgent = useCallback(
    (agentId: string, x: number, y: number) => {
      if (isDetectedExternalAgent(agentId, agents)) {
        return;
      }
      void updatePosition({ agentId, x, y });
    },
    [agents, updatePosition]
  );

  const onRuntimeEvent = useCallback((event: AgentRuntimeEvent) => {
    if (event.agentId === selectedAgentId) {
      void hydrateEvents({ agentId: event.agentId });
    }
  }, [hydrateEvents, selectedAgentId]);

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
          <button className={view === "office" ? "nav-item active" : "nav-item"} onClick={() => setView("office")} type="button">Office</button>
          <button className={view === "profiles" ? "nav-item active" : "nav-item"} onClick={() => setView("profiles")} type="button">Profiles</button>
          <button className={view === "tasks" ? "nav-item active" : "nav-item"} onClick={() => setView("tasks")} type="button">Tasks</button>
          <button className={view === "meeting" ? "nav-item active" : "nav-item"} onClick={() => setView("meeting")} type="button">Meeting Room</button>
          <button className="nav-item" onClick={() => void discoverAgents()} type="button">Discover</button>
          <button className="nav-item" onClick={() => void scan()} type="button">Scan Skills</button>
        </nav>
      </aside>

      <section className="workspace">
        {view === "profiles" ? (
          <AgentProfileLibrary />
        ) : view === "tasks" ? (
          <TaskBoard />
        ) : view === "meeting" ? (
          <MeetingRoom />
        ) : (
          <>
            <header className="toolbar">
              <div>
                <p className="eyebrow">Human manager workspace</p>
                <h2>Pixel Office</h2>
              </div>
              <button className="primary-action" onClick={() => setCreateDialogOpen(true)} type="button">Create Agent</button>
            </header>

            <div className="content-grid">
              <section className="office-surface" aria-label="Pixel office">
                {agents.length === 0 ? (
                  <div className="office-empty">
                    <p>No agents yet.</p>
                    <button className="primary-action" onClick={() => setCreateDialogOpen(true)} type="button">Create Agent</button>
                  </div>
                ) : (
                  <OfficeCanvas
                    agents={agents}
                    onMoveAgent={onMoveAgent}
                    onSelectAgent={setSelectedAgentId}
                    selectedAgentId={selectedAgentId}
                  />
                )}
              </section>

              <AgentDetailDrawer agent={selectedAgent} onClose={() => setSelectedAgentId(null)} onRuntimeEvent={onRuntimeEvent} />
            </div>
            {createDialogOpen ? (
              <CreateAgentDialog
                agentCount={agents.length}
                onClose={() => setCreateDialogOpen(false)}
                onCreated={afterAgentCreated}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
