import type { ReactElement } from "react";
import type { AgentRecord, WorkstationRecord } from "../../shared/types/records";
import type { OfficeSlotDefinition } from "../../shared/office";

type WorkstationDetailPanelProps = {
  slot: OfficeSlotDefinition | null;
  workstation: WorkstationRecord | null;
  agent: AgentRecord | null;
  onClose(): void;
  onCreateWorkstation?(): Promise<void> | void;
  onCreateAgent?(): void;
};

export function WorkstationDetailPanel({
  slot,
  workstation,
  agent,
  onClose,
  onCreateWorkstation,
  onCreateAgent
}: WorkstationDetailPanelProps): ReactElement {
  if (!slot) {
    return (
      <aside aria-label="Selected workstation details" className="detail-panel workstation-panel">
        <p className="empty-note">Select a workstation slot to build or inspect the office.</p>
      </aside>
    );
  }

  const isBuilt = Boolean(workstation);
  const isOccupied = Boolean(workstation?.assigned_agent_id);

  return (
    <aside
      aria-label="Selected workstation details"
      className="detail-panel workstation-panel"
      data-slot-key={slot.slotKey}
      data-workstation-state={!isBuilt ? "unbuilt" : isOccupied ? "occupied" : "empty"}
    >
      <div className="drawer-heading">
        <div>
          <p className="eyebrow">Selected workstation</p>
          <h3>{workstation?.name ?? slot.label}</h3>
        </div>
        <div className="drawer-actions">
          <button className="icon-button" onClick={onClose} type="button" title="Close details">
            x
          </button>
        </div>
      </div>

      <dl>
        <div>
          <dt>Slot</dt>
          <dd>{slot.slotKey}</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>{!isBuilt ? "Not built" : isOccupied ? "Occupied" : "Ready for agent"}</dd>
        </div>
        <div>
          <dt>Assigned agent</dt>
          <dd>{agent?.name ?? "None"}</dd>
        </div>
      </dl>

      {!isBuilt ? (
        <section className="workstation-panel-section">
          <p className="empty-note">This slot is available. Build the workstation first, then place an agent on it.</p>
          {onCreateWorkstation ? (
            <button className="primary-action workstation-panel-action" onClick={() => void onCreateWorkstation()} type="button">
              Create Workstation
            </button>
          ) : null}
        </section>
      ) : !isOccupied ? (
        <section className="workstation-panel-section">
          <p className="empty-note">This workstation exists and is ready for its first agent.</p>
          {onCreateAgent ? (
            <button className="primary-action workstation-panel-action" onClick={onCreateAgent} type="button">
              Create Agent On Workstation
            </button>
          ) : null}
        </section>
      ) : (
        <section className="workstation-panel-section">
          <p className="empty-note">This workstation is occupied. Select the agent to chat or delete it from the office.</p>
        </section>
      )}
    </aside>
  );
}
