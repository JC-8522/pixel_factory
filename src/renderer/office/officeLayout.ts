import {
  FLOOR_TEXTURE_HEIGHT,
  FLOOR_TEXTURE_WIDTH,
  MVP1_WORKSTATION_SLOTS,
  type OfficeSlotDefinition
} from "../../shared/office";

export const floorRoomShellUrl = new URL("../../../assets/pixel_office/mvp1/floor/floor_room_shell_day.png", import.meta.url)
  .href;
export const workstationSheetUrl = new URL(
  "../../../assets/pixel_office/mvp1/workstation/workstation_state_sheet.png",
  import.meta.url
).href;
export const agentSheetUrl = new URL("../../../assets/pixel_office/mvp1/agent/agent_state_sheet.png", import.meta.url).href;

export const officeSlots: OfficeSlotDefinition[] = MVP1_WORKSTATION_SLOTS;

export type OfficeZone = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
};

export const officeZones: OfficeZone[] = officeSlots.map((slot) => ({
  id: slot.slotKey,
  label: slot.label,
  x: Math.round((slot.leftPct / 100) * FLOOR_TEXTURE_WIDTH),
  y: Math.round((slot.topPct / 100) * FLOOR_TEXTURE_HEIGHT),
  width: Math.round((slot.widthPct / 100) * FLOOR_TEXTURE_WIDTH),
  height: Math.round((slot.heightPct / 100) * FLOOR_TEXTURE_HEIGHT),
  color: 0xcaa26a
}));

export const spriteSheetStyle = (sheetUrl: string, frameIndex: number): Record<string, string> => ({
  backgroundImage: `url("${sheetUrl}")`,
  backgroundPosition: `${(frameIndex / 3) * 100}% 0%`,
  backgroundRepeat: "no-repeat",
  backgroundSize: "400% 100%"
});

export const workstationFrameIndex = (isHovered: boolean, isSelected: boolean): number => {
  if (isSelected) {
    return 2;
  }

  if (isHovered) {
    return 1;
  }

  return 0;
};

export const agentFrameIndex = (status: string): number => {
  switch (status) {
    case "thinking":
    case "reading_files":
      return 2;
    case "running_command":
    case "editing_files":
    case "completed":
      return 1;
    case "waiting_user_input":
    case "error":
    case "stopped":
      return 3;
    case "idle":
    default:
      return 0;
  }
};

export const statusColor = (status: string): number => {
  switch (status) {
    case "thinking":
    case "reading_files":
      return 0x56ccf2;
    case "running_command":
    case "editing_files":
    case "completed":
      return 0x60d394;
    case "waiting_user_input":
      return 0xf2c14e;
    case "error":
    case "stopped":
      return 0xeb5757;
    case "idle":
    default:
      return 0x5a8a3d;
  }
};
