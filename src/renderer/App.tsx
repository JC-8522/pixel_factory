import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { AgentRuntimeEvent } from "../shared/types/agent";
import type { AppInfo } from "../shared/types/app";
import type { WorkstationRecord } from "../shared/types/records";
import { MVP1_FLOOR_ID } from "../shared/office";
import { ConversationWorkspaceScene } from "./components/ConversationWorkspaceScene";
import { CreateAgentDialog } from "./components/CreateAgentDialog";
import { PermissionSettings } from "./components/PermissionSettings";
import { OfficeCanvas } from "./office/OfficeCanvas";
import { officeSlots } from "./office/officeLayout";
import { useAgentStore } from "./stores/agentStore";
import { useIntegrationStore } from "./stores/integrationStore";
import { useOfficeStore } from "./stores/officeStore";

const createId = (prefix: string): string => `${prefix}-${Date.now()}`;

type AgentConversationPreview = {
  text: string;
  role: "agent" | "user" | "system";
  updatedAt: string | null;
};

type TimeoutHandle = ReturnType<typeof setTimeout>;

type AppScene =
  | {
      kind: "office";
    }
  | {
      kind: "conversation";
      agentId: string;
    };

const summarizeConversationText = (value: string | null | undefined, max = 92): string => {
  if (!value) {
    return "Thread workspace ready.";
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "Thread workspace ready.";
  }

  return compact.length > max ? `${compact.slice(0, max - 1)}...` : compact;
};

const roleFromMessage = (role: string | null | undefined): "agent" | "user" | "system" => {
  if (role === "user" || role === "system") {
    return role;
  }

  return "agent";
};

const shouldRefreshConversationPreview = (event: AgentRuntimeEvent): boolean =>
  ["waiting_user_input", "error", "session_completed", "session_stopped"].includes(event.type);

export function App(): ReactElement {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [scene, setScene] = useState<AppScene>({ kind: "office" });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [createDialogWorkstation, setCreateDialogWorkstation] = useState<WorkstationRecord | null>(null);
  const [createFlowError, setCreateFlowError] = useState<string | null>(null);
  const [officeMenuOpen, setOfficeMenuOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [agentPreviews, setAgentPreviews] = useState<Record<string, AgentConversationPreview>>({});
  const previewRefreshTimeoutsRef = useRef(new Map<string, TimeoutHandle>());
  const agents = useAgentStore((state) => state.agents);
  const hydrateAgents = useAgentStore((state) => state.hydrate);
  const applyRuntimeEvent = useAgentStore((state) => state.applyRuntimeEvent);
  const floors = useOfficeStore((state) => state.floors);
  const selectedSlotKey = useOfficeStore((state) => state.selectedSlotKey);
  const workstations = useOfficeStore((state) => state.workstations);
  const hydrateOffice = useOfficeStore((state) => state.hydrate);
  const createWorkstation = useOfficeStore((state) => state.createWorkstation);
  const selectSlot = useOfficeStore((state) => state.selectSlot);
  const theme = useIntegrationStore((state) => state.theme);
  const hydrateIntegrations = useIntegrationStore((state) => state.hydrate);

  useEffect(() => {
    void window.codexOffice.app.getInfo().then(setAppInfo);
    void hydrateAgents();
    void hydrateOffice();
    void hydrateIntegrations();
  }, [hydrateAgents, hydrateIntegrations, hydrateOffice]);

  useEffect(() => {
    if (scene.kind === "conversation" && !agents.some((agent) => agent.id === scene.agentId)) {
      setScene({ kind: "office" });
    }
  }, [agents, scene]);

  useEffect(() => {
    if (!selectedSlotKey) {
      setCreateConfirmOpen(false);
      setCreateDialogOpen(false);
      setCreateDialogWorkstation(null);
      setCreateFlowError(null);
    }
  }, [selectedSlotKey]);

  const hydratePreviewForAgent = useCallback(async (agentId: string): Promise<void> => {
    const agent = useAgentStore.getState().agents.find((item) => item.id === agentId) ?? null;
    if (!agent) {
      setAgentPreviews((current) => {
        if (!(agentId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[agentId];
        return next;
      });
      return;
    }

    const sessions = await window.codexOffice.sessions.listByAgent(agent.id);
    const latestSession = sessions.at(-1) ?? null;
    const latestMessage = latestSession
      ? (await window.codexOffice.messages.listBySession(latestSession.id))
          .filter((message) => ["agent", "user", "system"].includes(message.role))
          .at(-1) ?? null
      : null;
    const nextPreview: AgentConversationPreview = {
      text: summarizeConversationText(latestMessage?.content ?? agent.current_task ?? `${agent.name} is ready.`),
      role: roleFromMessage(latestMessage?.role),
      updatedAt: latestMessage?.created_at ?? null
    };

    setAgentPreviews((current) => {
      const previous = current[agentId];
      if (
        previous?.text === nextPreview.text &&
        previous?.role === nextPreview.role &&
        previous?.updatedAt === nextPreview.updatedAt
      ) {
        return current;
      }

      return {
        ...current,
        [agentId]: nextPreview
      };
    });
  }, []);

  const schedulePreviewRefresh = useCallback(
    (agentId: string): void => {
      const current = previewRefreshTimeoutsRef.current.get(agentId);
      if (current) {
        clearTimeout(current);
      }

      const timeoutId = setTimeout(() => {
        previewRefreshTimeoutsRef.current.delete(agentId);
        void hydratePreviewForAgent(agentId);
      }, 180);

      previewRefreshTimeoutsRef.current.set(agentId, timeoutId);
    },
    [hydratePreviewForAgent]
  );

  useEffect(() => {
    const unsubscribe = window.codexOffice.runtime.onEvent((event) => {
      applyRuntimeEvent(event);
      if (shouldRefreshConversationPreview(event)) {
        schedulePreviewRefresh(event.agentId);
      }
    });

    return unsubscribe;
  }, [applyRuntimeEvent, schedulePreviewRefresh]);

  const agentIds = useMemo(() => agents.map((agent) => agent.id).sort(), [agents]);
  const agentIdsKey = useMemo(() => agentIds.join("|"), [agentIds]);

  useEffect(() => {
    if (!agentIdsKey) {
      setAgentPreviews({});
      return;
    }

    const stableAgentIds = agentIdsKey.split("|");
    const activeIds = new Set(stableAgentIds);
    setAgentPreviews((current) => {
      const nextEntries = Object.entries(current).filter(([agentId]) => activeIds.has(agentId));
      return nextEntries.length === Object.keys(current).length ? current : Object.fromEntries(nextEntries);
    });

    for (const agentId of stableAgentIds) {
      void hydratePreviewForAgent(agentId);
    }
  }, [agentIdsKey, hydratePreviewForAgent]);

  useEffect(
    () => () => {
      for (const timeoutId of previewRefreshTimeoutsRef.current.values()) {
        clearTimeout(timeoutId);
      }

      previewRefreshTimeoutsRef.current.clear();
    },
    []
  );

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
    () => (scene.kind === "conversation" ? agents.find((agent) => agent.id === scene.agentId) ?? null : null),
    [agents, scene]
  );
  const conversationPreviews = useMemo(
    () => Object.fromEntries(Object.entries(agentPreviews).map(([agentId, preview]) => [agentId, preview.text])),
    [agentPreviews]
  );
  const selectedSlot = useMemo(
    () => officeSlots.find((slot) => slot.slotKey === selectedSlotKey) ?? null,
    [selectedSlotKey]
  );
  const activeFloorId = floors[0]?.id ?? MVP1_FLOOR_ID;
  const runtimeReady = appInfo?.localCodex.status === "ready";

  const clearTransientPanels = (): void => {
    setCreateConfirmOpen(false);
    setCreateDialogOpen(false);
    setPermissionsOpen(false);
    setCreateDialogWorkstation(null);
    setCreateFlowError(null);
  };

  const openConversationScene = (agentId: string): void => {
    setOfficeMenuOpen(false);
    clearTransientPanels();
    setScene({ kind: "conversation", agentId });
  };

  const returnToOffice = (): void => {
    setOfficeMenuOpen(false);
    clearTransientPanels();
    setScene({ kind: "office" });
  };

  const clearSelection = (): void => {
    setOfficeMenuOpen(false);
    clearTransientPanels();
    setScene({ kind: "office" });
    selectSlot(null);
  };

  const closeCreateFlow = (): void => {
    setCreateConfirmOpen(false);
    setCreateDialogOpen(false);
    setCreateDialogWorkstation(null);
    setCreateFlowError(null);
  };

  const handleSelectSlot = (slotKey: string): void => {
    setOfficeMenuOpen(false);
    selectSlot(slotKey);
    setCreateFlowError(null);
    const workstation = workstationsBySlot.get(slotKey) ?? null;

    if (workstation?.assigned_agent_id) {
      openConversationScene(workstation.assigned_agent_id);
      return;
    }

    setScene({ kind: "office" });
    setPermissionsOpen(false);
    setCreateDialogOpen(false);
    setCreateDialogWorkstation(workstation);
    setCreateConfirmOpen(true);
  };

  const ensureWorkstationAtSlot = async (slotKey: string | null): Promise<WorkstationRecord | null> => {
    if (!slotKey) {
      return null;
    }

    const findWorkstation = (): WorkstationRecord | null =>
      useOfficeStore.getState().workstations.find((item) => item.slot_key === slotKey) ?? null;

    const existing = findWorkstation();
    if (existing) {
      selectSlot(existing.slot_key);
      return existing;
    }

    try {
      const workstation = await createWorkstation({
        id: createId("workstation"),
        floorId: activeFloorId,
        slotKey
      });
      selectSlot(workstation.slot_key);
      void hydrateOffice();
      return workstation;
    } catch (error) {
      await hydrateOffice();
      const recovered = findWorkstation();
      if (recovered) {
        selectSlot(recovered.slot_key);
        return recovered;
      }

      throw error;
    }
  };

  const openCreateDialogForSelectedSlot = async (): Promise<void> => {
    if (!selectedSlot) {
      return;
    }

    setCreateFlowError(null);

    try {
      const workstation = await ensureWorkstationAtSlot(selectedSlot.slotKey);
      if (!workstation || workstation.assigned_agent_id) {
        return;
      }

      setCreateConfirmOpen(false);
      setScene({ kind: "office" });
      setCreateDialogWorkstation(workstation);
      setCreateDialogOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to prepare this workstation.";
      console.error("Unable to prepare workstation for agent creation", error);
      setCreateFlowError(message);
    }
  };

  const afterAgentCreated = async (agentId: string, workstationId: string | null): Promise<void> => {
    await Promise.all([hydrateAgents(), hydrateOffice()]);
    const nextWorkstation = workstationId
      ? useOfficeStore.getState().workstations.find((item) => item.id === workstationId) ?? null
      : null;
    selectSlot(nextWorkstation?.slot_key ?? selectedSlotKey ?? null);
    openConversationScene(agentId);
  };

  const deleteSelectedAgent = async (agentId: string): Promise<void> => {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent || !window.confirm(`Delete ${agent.name} from the office?`)) {
      return;
    }

    const workstation = workstationByAgentId.get(agentId) ?? null;
    await window.codexOffice.agents.delete(agentId);
    await Promise.all([hydrateAgents(), hydrateOffice()]);
    setScene({ kind: "office" });
    clearTransientPanels();
    selectSlot(workstation?.slot_key ?? null);
  };

  const appShellClassName = selectedAgent
    ? "app-shell app-shell-conversation-workspace app-shell-conversation-focus"
    : "app-shell app-shell-office single-office-shell";
  const officeTheme = selectedAgent ? undefined : theme;

  return (
    <main
      className={appShellClassName}
      data-office-theme={officeTheme}
      data-scene={selectedAgent ? "conversation" : "office"}
    >
      {selectedAgent ? (
        <ConversationWorkspaceScene agent={selectedAgent} onClose={returnToOffice} onDelete={deleteSelectedAgent} />
      ) : (
        <section className="workspace workspace-office">
          <section className="office-surface single-office-view" aria-label="Office view">
            <div className="office-topbar">
              <div className="office-menu-wrap">
                <button
                  aria-expanded={officeMenuOpen}
                  className="office-menu-button"
                  onClick={() => setOfficeMenuOpen((current) => !current)}
                  type="button"
                >
                  Office
                </button>
                {officeMenuOpen ? (
                  <div className="office-menu-panel">
                    <button
                      onClick={() => {
                        setOfficeMenuOpen(false);
                        setPermissionsOpen(true);
                        setScene({ kind: "office" });
                        setCreateConfirmOpen(false);
                        setCreateDialogOpen(false);
                      }}
                      type="button"
                    >
                      Permissions
                    </button>
                    <button
                      onClick={() => {
                        setOfficeMenuOpen(false);
                        clearSelection();
                      }}
                      type="button"
                    >
                      Clear Selection
                    </button>
                  </div>
                ) : null}
              </div>

              {appInfo ? (
                <p className={`runtime-pill runtime-pill-${appInfo.localCodex.status}`}>
                  {appInfo.localCodex.status === "ready" ? "Local Codex ready" : appInfo.localCodex.message}
                </p>
              ) : null}
            </div>

            {!runtimeReady && appInfo ? (
              <section className="readiness-panel office-inline-panel" aria-label="Local Codex setup">
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

            <OfficeCanvas
              agents={agents}
              conversationPreviews={conversationPreviews}
              onSelectSlot={handleSelectSlot}
              selectedSlotKey={selectedSlotKey}
              workstations={workstations}
            />
          </section>
        </section>
      )}

      {createConfirmOpen && selectedSlot ? (
        <div className="dialog-backdrop" role="presentation">
          <section aria-label="Create agent confirmation" className="dialog-panel pixel-dialog office-confirm-dialog">
            <header className="dialog-header pixel-dialog-header">
              <div>
                <h3>Create New Agent?</h3>
                <p className="dialog-subtitle">{selectedSlot.label} is free and ready for a new persistent work thread.</p>
              </div>
              <button
                aria-label="Close create agent confirmation"
                className="icon-button pixel-close-button"
                onClick={clearSelection}
                type="button"
              >
                x
              </button>
            </header>
            <div className="office-confirm-body">
              <p>This workstation is ready for a new AI teammate workspace.</p>
              {createFlowError ? <p className="form-error">{createFlowError}</p> : null}
            </div>
            <footer className="dialog-actions office-confirm-actions">
              <button className="pixel-button pixel-button-secondary" onClick={clearSelection} type="button">
                Cancel
              </button>
              <button
                className="primary-action pixel-button pixel-button-primary"
                disabled={!runtimeReady}
                onClick={() => void openCreateDialogForSelectedSlot()}
                type="button"
              >
                Set Up Workspace
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {permissionsOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section aria-label="Office permissions" className="dialog-panel office-settings-dialog">
            <header className="dialog-header">
              <div>
                <h3>Office Permissions</h3>
                <p className="dialog-subtitle">All global controls now live behind the office button.</p>
              </div>
              <button
                aria-label="Close office permissions"
                className="icon-button"
                onClick={clearTransientPanels}
                type="button"
              >
                x
              </button>
            </header>
            <div className="office-settings-body">
              <PermissionSettings />
            </div>
          </section>
        </div>
      ) : null}

      {createDialogOpen && createDialogWorkstation && !createDialogWorkstation.assigned_agent_id ? (
        <CreateAgentDialog
          agentCount={agents.length}
          onClose={closeCreateFlow}
          onCreated={afterAgentCreated}
          workstation={createDialogWorkstation}
        />
      ) : null}
    </main>
  );
}
