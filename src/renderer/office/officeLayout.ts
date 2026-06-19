import { MVP1_WORKSTATION_SLOTS, type OfficeSlotDefinition } from "../../shared/office";

export const floorRoomShellUrl = new URL("../../../assets/pixel_office/mvp1/floor/floor_room_shell_day.png", import.meta.url)
  .href;
export const workstationSheetUrl = new URL(
  "../../../assets/pixel_office/mvp1/workstation/workstation_state_sheet.png",
  import.meta.url
).href;
export const agentSheetUrl = new URL("../../../assets/pixel_office/mvp1/agent/agent_state_sheet.png", import.meta.url).href;

export const officeSlots: OfficeSlotDefinition[] = MVP1_WORKSTATION_SLOTS;

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
