import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { AgentRuntimeEvent } from "../shared/types/agent";
import type { AppInfo } from "../shared/types/app";
import type { WorkstationRecord } from "../shared/types/records";
import { MVP1_FLOOR_ID } from "../shared/office";
import { AgentDetailDrawer } from "./components/AgentDetailDrawer";
import { CreateAgentDialog } from "./components/CreateAgentDialog";
import { PermissionSettings } from "./components/PermissionSettings";
import { WorkstationDetailPanel } from "./components/WorkstationDetailPanel";
import { OfficeCanvas } from "./office/OfficeCanvas";
import { officeSlots } from "./office/officeLayout";
import { useAgentStore } from "./stores/agentStore";
import { useEventStore } from "./stores/eventStore";
import { useIntegrationStore } from "./stores/integrationStore";
import { useOfficeStore } from "./stores/officeStore";

type WorkspaceView = "office" | "permissions";

const createId = (prefix: string): string => `${prefix}-${Date.now()}`;

export function App(): ReactElement {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [view, setView] = useState<WorkspaceView>("office");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { agents, hydrate: hydrateAgents } = useAgentStore();
  const {
    floors,
    selectedSlotKey,
    workstations,
    hydrate: hydrateOffice,
    createWorkstation,
    selectSlot
  } = useOfficeStore();
  const { hydrate: hydrateEvents } = useEventStore();
  const { theme, hydrate: hydrateIntegrations } = useIntegrationStore();

  useEffect(() => {
    void window.codexOffice.app.getInfo().then(setAppInfo);
    void hydrateAgents();
    void hydrateOffice();
    void hydrateIntegrations();
  }, [hydrateAgents, hydrateIntegrations, hydrateOffice]);

  useEffect(() => {
    if (selectedAgentId && !agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    const unsubscribe = window.codexOffice.runtime.onEvent(() => {
      void hydrateAgents();
      if (selectedAgentId) {
        void hydrateEvents({ agentId: selectedAgentId });
      }
    });

    return unsubscribe;
  }, [hydrateAgents, hydrateEvents, selectedAgentId]);

  const workstationsBySlot = useMemo(
    () => new Map(workstations.map((workstation) => [workstation.slot_key, workstation])),
    [workstations]
  );
  const workstationByAgentId = useMemo(() => {
    const mapping = new Map<string, WorkstationRecord>();
    for (const workstation of workstations) {
      if (workstation.assigned_agent_id) {
        mapping.set(workstation.assigned_agent_id, workstation);
      }
    }
    return mapping;
  }, [workstations]);
  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );
  const selectedSlot = useMemo(
    () => officeSlots.find((slot) => slot.slotKey === selectedSlotKey) ?? null,
    [selectedSlotKey]
  );
  const selectedWorkstation = selectedSlotKey ? workstationsBySlot.get(selectedSlotKey) ?? null : null;
  const selectedWorkstationAgent =
    selectedWorkstation?.assigned_agent_id
      ? agents.find((agent) => agent.id === selectedWorkstation.assigned_agent_id) ?? null
      : null;
  const activeFloorId = floors[0]?.id ?? MVP1_FLOOR_ID;
  const nextUnbuiltSlot = officeSlots.find((slot) => !workstationsBySlot.has(slot.slotKey)) ?? null;

  const handleSelectSlot = (slotKey: string): void => {
    selectSlot(slotKey);
    const workstation = workstationsBySlot.get(slotKey) ?? null;
    setSelectedAgentId(workstation?.assigned_agent_id ?? null);
  };

  const handleSelectAgent = (agentId: string): void => {
    setSelectedAgentId(agentId);
    selectSlot(workstationByAgentId.get(agentId)?.slot_key ?? null);
  };

  const onRuntimeEvent = (event: AgentRuntimeEvent): void => {
    if (event.agentId === selectedAgentId) {
      void hydrateEvents({ agentId: event.agentId });
    }
  };

  const buildWorkstationAtSlot = async (slotKey: string | null): Promise<void> => {
    const nextSlotKey = slotKey ?? nextUnbuiltSlot?.slotKey ?? null;
    if (!nextSlotKey) {
      return;
    }

    if (workstationsBySlot.has(nextSlotKey)) {
      handleSelectSlot(nextSlotKey);
      return;
    }

    const workstation = await createWorkstation({
      id: createId("workstation"),
      floorId: activeFloorId,
      slotKey: nextSlotKey
    });
    await hydrateOffice();
    selectSlot(workstation.slot_key);
    setSelectedAgentId(null);
  };

  const afterAgentCreated = async (agentId: string, workstationId: string | null): Promise<void> => {
    await Promise.all([hydrateAgents(), hydrateOffice()]);
    setSelectedAgentId(agentId);

    const nextWorkstation = workstationId
      ? useOfficeStore.getState().workstations.find((item) => item.id === workstationId) ?? null
      : null;
    selectSlot(nextWorkstation?.slot_key ?? selectedSlotKey ?? null);
    setView("office");
  };

  const deleteSelectedAgent = async (agentId: string): Promise<void> => {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent || !window.confirm(`Delete ${agent.name} from the office?`)) {
      return;
    }

    const workstation = workstationByAgentId.get(agentId) ?? null;
    await window.codexOffice.agents.delete(agentId);
    await Promise.all([hydrateAgents(), hydrateOffice()]);
    setSelectedAgentId(null);
    selectSlot(workstation?.slot_key ?? null);
  };

  const openAgentDialog = (): void => {
    if (!selectedWorkstation || selectedWorkstation.assigned_agent_id) {
      return;
    }

    setCreateDialogOpen(true);
  };

  const toolbarAction = (() => {
    if (selectedSlot && !selectedWorkstation) {
      return {
        label: "Create Workstation",
        disabled: false,
        onClick: () => void buildWorkstationAtSlot(selectedSlot.slotKey)
      };
    }

    if (selectedWorkstation && !selectedWorkstation.assigned_agent_id) {
      const blocked = appInfo?.localCodex.status !== "ready";
      return {
        label: "Create Agent",
        disabled: blocked,
        onClick: () => openAgentDialog()
      };
    }

    return {
      label: nextUnbuiltSlot ? "Add Workstation" : "All Workstations Built",
      disabled: !nextUnbuiltSlot,
      onClick: () => void buildWorkstationAtSlot(nextUnbuiltSlot?.slotKey ?? null)
    };
  })();

  return (
    <main className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Local Codex Office</h1>
            <p>{appInfo ? `${appInfo.mode} v${appInfo.version}` : "Starting local workspace"}</p>
            {appInfo ? (
              <p className={`runtime-badge runtime-badge-${appInfo.localCodex.status}`}>
                {appInfo.localCodex.status === "ready" ? "Local Codex ready" : "Local Codex setup required"}
              </p>
            ) : null}
          </div>
        </div>

        <nav className="nav-list" aria-label="Workspace sections">
          <button className={view === "office" ? "nav-item active" : "nav-item"} onClick={() => setView("office")} type="button">
            Office
          </button>
          <button
            className={view === "permissions" ? "nav-item active" : "nav-item"}
            onClick={() => setView("permissions")}
            type="button"
          >
            Permissions
          </button>
        </nav>
      </aside>

      <section className="workspace">
        {view === "permissions" ? (
          <PermissionSettings />
        ) : (
          <>
            <header className="toolbar">
              <div>
                <p className="eyebrow">Human manager workspace</p>
                <h2>Pixel Office</h2>
              </div>
              <button className="primary-action" disabled={toolbarAction.disabled} onClick={toolbarAction.onClick} type="button">
                {toolbarAction.label}
              </button>
            </header>

            {appInfo && appInfo.localCodex.status !== "ready" ? (
              <section className="readiness-panel" aria-label="Local Codex setup">
                <div>
                  <p className="eyebrow">Machine Setup</p>
                  <h3>{appInfo.localCodex.message}</h3>
                  <p className="empty-note">
                    Agent creation is disabled until this machine can launch a local Codex executable.
                  </p>
                </div>
                <div className="readiness-facts">
                  <div>
                    <span>Detected source</span>
                    <strong>{appInfo.localCodex.sourcePath ?? "Not found"}</strong>
                  </div>
                  <div>
                    <span>Launch path</span>
                    <strong>{appInfo.localCodex.launchPath ?? "Not prepared"}</strong>
                  </div>
                  <div>
                    <span>Version</span>
                    <strong>{appInfo.localCodex.version ?? "Unknown"}</strong>
                  </div>
                </div>
                {appInfo.localCodex.guidance.length > 0 ? (
                  <ul className="readiness-list">
                    {appInfo.localCodex.guidance.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <div className="content-grid">
              <section className="office-surface" aria-label="Pixel office">
                {agents.length > 0 ? (
                  <div className="office-roster" aria-label="Office agents">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        className={agent.id === selectedAgentId ? "office-roster-item active" : "office-roster-item"}
                        data-agent-id={agent.id}
                        onClick={() => handleSelectAgent(agent.id)}
                        type="button"
                      >
                        {agent.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                <OfficeCanvas
                  agents={agents}
                  onSelectSlot={handleSelectSlot}
                  selectedSlotKey={selectedSlotKey}
                  workstations={workstations}
                />
                {workstations.length === 0 ? (
                  <div className="office-empty">
                    <p className="office-empty-kicker">Empty office</p>
                    <h3>Build your first workstation.</h3>
                    <p className="empty-note">
                      Start with a real desk in the room. Every agent in MVP1 should belong to a workstation.
                    </p>
                    <button className="primary-action" onClick={() => void buildWorkstationAtSlot(nextUnbuiltSlot?.slotKey ?? null)} type="button">
                      Build First Workstation
                    </button>
                  </div>
                ) : null}
              </section>

              {selectedAgent ? (
                <AgentDetailDrawer
                  agent={selectedAgent}
                  onClose={() => {
                    setSelectedAgentId(null);
                    selectSlot(null);
                  }}
                  onDelete={deleteSelectedAgent}
                  onRuntimeEvent={onRuntimeEvent}
                />
              ) : (
                <WorkstationDetailPanel
                  agent={selectedWorkstationAgent}
                  onClose={() => selectSlot(null)}
                  onCreateAgent={openAgentDialog}
                  onCreateWorkstation={() => buildWorkstationAtSlot(selectedSlot?.slotKey ?? null)}
                  slot={selectedSlot}
                  workstation={selectedWorkstation}
                />
              )}
            </div>

            {createDialogOpen && selectedWorkstation && !selectedWorkstation.assigned_agent_id ? (
              <CreateAgentDialog
                agentCount={agents.length}
                onClose={() => setCreateDialogOpen(false)}
                onCreated={afterAgentCreated}
                workstation={selectedWorkstation}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
