import type { AgentStatus } from "../../shared/types/app";

export type OfficeZone = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
};

export const officeZones: OfficeZone[] = [
  { id: "meeting", label: "Meeting room", x: 24, y: 24, width: 260, height: 150, color: 0x27384a },
  { id: "whiteboard", label: "Whiteboard", x: 306, y: 24, width: 230, height: 150, color: 0x31463b },
  { id: "desks", label: "Desks", x: 24, y: 198, width: 512, height: 260, color: 0x28313f },
  { id: "skills", label: "Skill shelf", x: 560, y: 24, width: 190, height: 434, color: 0x3c3344 }
];

export const statusColor = (status: AgentStatus | string): number => {
  switch (status) {
    case "thinking":
      return 0xf2c94c;
    case "running_command":
      return 0xf2994a;
    case "reading_files":
      return 0x56ccf2;
    case "editing_files":
      return 0x6fcf97;
    case "waiting_user_input":
      return 0xbb6bd9;
    case "error":
      return 0xeb5757;
    case "completed":
      return 0x27ae60;
    case "stopped":
      return 0x828282;
    case "idle":
    default:
      return 0xbfd7ea;
  }
};
