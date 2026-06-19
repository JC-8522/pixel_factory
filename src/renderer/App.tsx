import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { AgentRuntimeEvent } from "../shared/types/agent";
import type { AppInfo } from "../shared/types/app";
import type { WorkstationRecord } from "../shared/types/records";
import { MVP1_FLOOR_ID } from "../shared/office";
import { AgentDetailDrawer } from "./components/AgentDetailDrawer";
import { CreateAgentDialog } from "./components/CreateAgentDialog";
import { PermissionSettings } from "./components/PermissionSettings";
import { OfficeCanvas } from "./office/OfficeCanvas";
import { officeSlots } from "./office/officeLayout";
import { useAgentStore } from "./stores/agentStore";
import { useEventStore } from "./stores/eventStore";
import { useIntegrationStore } from "./stores/integrationStore";
import { useOfficeStore } from "./stores/officeStore";

const createId = (prefix: string): string => `${prefix}-${Date.now()}`;

type AgentConversationPreview = {
  text: string;
  role: "agent" | "user" | "system";
  updatedAt: string | null;
};

type TimeoutHandle = ReturnType<typeof setTimeout>;

const summarizeConversationText = (value: string | null | undefined, max = 92): string => {
  if (!value) {
    return "New AI employee conversation.";
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "New AI employee conversation.";
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
  ["message_chunk", "waiting_user_input", "error", "session_completed", "session_stopped"].includes(event.type);

const shouldRefreshActivityFeed = (event: AgentRuntimeEvent): boolean =>
  ["status_changed", "file_touched", "waiting_user_input", "error"].includes(event.type);

export function App(): ReactElement {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [officeMenuOpen, setOfficeMenuOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [agentPreviews, setAgentPreviews] = useState<Record<string, AgentConversationPreview>>({});
  const previewRefreshTimeoutsRef = useRef(new Map<string, TimeoutHandle>());
  const activityRefreshTimeoutRef = useRef<TimeoutHandle | null>(null);
  const selectedAgentIdRef = useRef<string | null>(null);
  const { agents, hydrate: hydrateAgents, applyRuntimeEvent } = useAgentStore();
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
    selectedAgentIdRef.current = selectedAgentId;
  }, [selectedAgentId]);

  useEffect(() => {
    if (!selectedSlotKey) {
      setCreateConfirmOpen(false);
      setCreateDialogOpen(false);
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

  const scheduleActivityRefresh = useCallback(
    (agentId: string): void => {
      if (selectedAgentIdRef.current !== agentId) {
        return;
      }

      if (activityRefreshTimeoutRef.current) {
        clearTimeout(activityRefreshTimeoutRef.current);
      }

      activityRefreshTimeoutRef.current = setTimeout(() => {
        activityRefreshTimeoutRef.current = null;
        void hydrateEvents({ agentId });
      }, 140);
    },
    [hydrateEvents]
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
      if (activityRefreshTimeoutRef.current) {
        clearTimeout(activityRefreshTimeoutRef.current);
      }
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
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );
  const conversationPreviews = useMemo(
    () => Object.fromEntries(Object.entries(agentPreviews).map(([agentId, preview]) => [agentId, preview.text])),
    [agentPreviews]
  );
  const selectedSlot = useMemo(
    () => officeSlots.find((slot) => slot.slotKey === selectedSlotKey) ?? null,
    [selectedSlotKey]
  );
  const selectedWorkstation = selectedSlotKey ? workstationsBySlot.get(selectedSlotKey) ?? null : null;
  const selectedAgentWorkstation = selectedAgent ? workstationByAgentId.get(selectedAgent.id) ?? null : null;
  const activeFloorId = floors[0]?.id ?? MVP1_FLOOR_ID;
  const runtimeReady = appInfo?.localCodex.status === "ready";

  const clearTransientPanels = (): void => {
    setCreateConfirmOpen(false);
    setCreateDialogOpen(false);
    setPermissionsOpen(false);
  };

  const clearSelection = (): void => {
    setSelectedAgentId(null);
    selectSlot(null);
    setCreateConfirmOpen(false);
    setCreateDialogOpen(false);
  };

  const closeCreateFlow = (): void => {
    setCreateConfirmOpen(false);
    setCreateDialogOpen(false);
  };

  const handleSelectSlot = (slotKey: string): void => {
    selectSlot(slotKey);
    const workstation = workstationsBySlot.get(slotKey) ?? null;

    if (workstation?.assigned_agent_id) {
      setSelectedAgentId(workstation.assigned_agent_id);
      setCreateConfirmOpen(false);
      setCreateDialogOpen(false);
      return;
    }

    setSelectedAgentId(null);
    setPermissionsOpen(false);
    setCreateDialogOpen(false);
    setCreateConfirmOpen(true);
  };

  const ensureWorkstationAtSlot = async (slotKey: string | null): Promise<WorkstationRecord | null> => {
    if (!slotKey) {
      return null;
    }

    const existing = workstationsBySlot.get(slotKey) ?? null;
    if (existing) {
      selectSlot(existing.slot_key);
      return existing;
    }

    const workstation = await createWorkstation({
      id: createId("workstation"),
      floorId: activeFloorId,
      slotKey
    });
    await hydrateOffice();
    selectSlot(workstation.slot_key);
    return workstation;
  };

  const openCreateDialogForSelectedSlot = async (): Promise<void> => {
    if (!selectedSlot) {
      return;
    }

    const workstation = await ensureWorkstationAtSlot(selectedSlot.slotKey);
    if (!workstation || workstation.assigned_agent_id) {
      return;
    }

    setCreateConfirmOpen(false);
    setSelectedAgentId(null);
    setCreateDialogOpen(true);
  };

  const afterAgentCreated = async (agentId: string, workstationId: string | null): Promise<void> => {
    await Promise.all([hydrateAgents(), hydrateOffice()]);
    setSelectedAgentId(agentId);
    setCreateDialogOpen(false);
    setCreateConfirmOpen(false);

    const nextWorkstation = workstationId
      ? useOfficeStore.getState().workstations.find((item) => item.id === workstationId) ?? null
      : null;
    selectSlot(nextWorkstation?.slot_key ?? selectedSlotKey ?? null);
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
    setCreateDialogOpen(false);
    setCreateConfirmOpen(false);
    selectSlot(workstation?.slot_key ?? null);
  };

  const onRuntimeEvent = useCallback(
    (event: AgentRuntimeEvent): void => {
      if (!shouldRefreshActivityFeed(event)) {
        return;
      }

      scheduleActivityRefresh(event.agentId);
    },
    [scheduleActivityRefresh]
  );

  return (
    <main className="app-shell single-office-shell" data-theme={theme}>
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
                      setSelectedAgentId(null);
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

          {selectedAgent ? (
            <AgentDetailDrawer
              agent={selectedAgent}
              className="detail-panel office-overlay-card office-agent-panel office-conversation-panel"
              conversationPreview={agentPreviews[selectedAgent.id]?.text ?? null}
              headingEyebrow="AI employee conversation"
              onClose={clearSelection}
              onDelete={deleteSelectedAgent}
              onRuntimeEvent={onRuntimeEvent}
              showSkills={false}
              showLogs={false}
              workstationName={selectedAgentWorkstation?.name ?? selectedAgentWorkstation?.slot_key ?? null}
            />
          ) : null}
        </section>
      </section>

      {createConfirmOpen && selectedSlot ? (
        <div className="dialog-backdrop" role="presentation">
          <section aria-label="Create agent confirmation" className="dialog-panel pixel-dialog office-confirm-dialog">
            <header className="dialog-header pixel-dialog-header">
              <div>
                <h3>Create New AI Employee?</h3>
                <p className="dialog-subtitle">{selectedSlot.label} is free and ready for a new persistent conversation.</p>
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
              <p>This workstation is ready for a new AI employee.</p>
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
                Open AI Employee
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

      {createDialogOpen && selectedWorkstation && !selectedWorkstation.assigned_agent_id ? (
        <CreateAgentDialog
          agentCount={agents.length}
          onClose={closeCreateFlow}
          onCreated={afterAgentCreated}
          workstation={selectedWorkstation}
        />
      ) : null}
    </main>
  );
}
