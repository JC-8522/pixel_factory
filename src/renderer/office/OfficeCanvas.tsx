import { useState, type ReactElement } from "react";
import type { AgentRecord, WorkstationRecord } from "../../shared/types/records";
import {
  agentFrameIndex,
  agentSheetUrl,
  floorRoomShellUrl,
  officeSlots,
  spriteSheetStyle,
  workstationFrameIndex,
  workstationSheetUrl
} from "./officeLayout";

const summarizeAgentPreview = (value: string | null | undefined, max = 72): string => {
  if (!value) {
    return "Thread workspace ready.";
  }

  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}...` : compact;
};

type OfficeCanvasProps = {
  agents: AgentRecord[];
  conversationPreviews?: Record<string, string>;
  selectedSlotKey: string | null;
  workstations: WorkstationRecord[];
  onSelectSlot(slotKey: string): void;
};

export function OfficeCanvas({
  agents,
  conversationPreviews = {},
  selectedSlotKey,
  workstations,
  onSelectSlot
}: OfficeCanvasProps): ReactElement {
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);
  const workstationsBySlot = new Map(workstations.map((workstation) => [workstation.slot_key, workstation]));
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));

  return (
    <div className="office-stage">
      <div className="office-stage-frame">
        <img alt="" aria-hidden="true" className="office-floor-image" src={floorRoomShellUrl} />
        <div className="office-slot-layer">
          {officeSlots.map((slot) => {
            const workstation = workstationsBySlot.get(slot.slotKey) ?? null;
            const assignedAgent =
              workstation?.assigned_agent_id ? agentsById.get(workstation.assigned_agent_id) ?? null : null;
            const isSelected = selectedSlotKey === slot.slotKey;
            const isHovered = hoveredSlotKey === slot.slotKey;
            const workstationState = workstation
              ? workstation.assigned_agent_id
                ? "occupied"
                : "empty"
              : "unbuilt";
            const spriteStyle = assignedAgent
              ? spriteSheetStyle(agentSheetUrl, agentFrameIndex(assignedAgent.status))
              : spriteSheetStyle(workstationSheetUrl, workstationFrameIndex(isHovered, isSelected));
            const helperText = assignedAgent
              ? `${assignedAgent.name}\n${conversationPreviews[assignedAgent.id] ?? assignedAgent.current_task ?? "Open workspace"}`
              : "Empty Workstation\nClick to create";

            return (
              <button
                key={slot.slotKey}
                aria-label={
                  assignedAgent ? `${assignedAgent.name} at ${slot.label}` : `${slot.label} workstation`
                }
                className={`office-slot office-slot-${workstationState}${isSelected ? " is-selected" : ""}`}
                data-agent-id={assignedAgent?.id ?? ""}
                data-seat-state={assignedAgent ? "occupied" : "available"}
                data-slot-key={slot.slotKey}
                data-workstation-id={workstation?.id ?? ""}
                data-workstation-state={workstationState}
                onBlur={() => setHoveredSlotKey((current) => (current === slot.slotKey ? null : current))}
                onClick={() => onSelectSlot(slot.slotKey)}
                onMouseEnter={() => setHoveredSlotKey(slot.slotKey)}
                onMouseLeave={() => setHoveredSlotKey((current) => (current === slot.slotKey ? null : current))}
                style={{
                  left: `${slot.leftPct}%`,
                  top: `${slot.topPct}%`,
                  width: `${slot.widthPct}%`,
                  height: `${slot.heightPct}%`
                }}
                type="button"
              >
                <span className="office-slot-sprite" style={spriteStyle} />
                <span className="office-slot-label">{assignedAgent?.name ?? workstation?.name ?? slot.label}</span>
                {assignedAgent ? <span className={`office-slot-status is-${assignedAgent.status}`} /> : null}
                {assignedAgent && (isSelected || isHovered) ? (
                  <span className="office-slot-preview">
                    {conversationPreviews[assignedAgent.id] ?? summarizeAgentPreview(assignedAgent.current_task)}
                  </span>
                ) : null}
                {isHovered ? <span className="office-slot-helper">{helperText}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
