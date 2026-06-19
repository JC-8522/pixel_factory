export const MVP1_FLOOR_ID = "floor-mvp1-main";
export const MVP1_LAYOUT_PRESET = "mvp1_4x3";
export const MVP1_MAX_WORKSTATIONS = 12;
export const FLOOR_TEXTURE_WIDTH = 1402;
export const FLOOR_TEXTURE_HEIGHT = 1122;

export type OfficeSlotDefinition = {
  slotKey: string;
  label: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
};

export const MVP1_WORKSTATION_SLOTS: OfficeSlotDefinition[] = [
  { slotKey: "ws-01", label: "Design", leftPct: 20.6, topPct: 28.8, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-02", label: "Frontend", leftPct: 35.6, topPct: 28.8, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-03", label: "Backend", leftPct: 50.6, topPct: 28.8, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-04", label: "QA", leftPct: 65.6, topPct: 28.8, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-05", label: "Ops", leftPct: 20.6, topPct: 46.6, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-06", label: "Research", leftPct: 35.6, topPct: 46.6, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-07", label: "Growth", leftPct: 50.6, topPct: 46.6, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-08", label: "PM", leftPct: 65.6, topPct: 46.6, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-09", label: "Support", leftPct: 20.6, topPct: 64.4, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-10", label: "Data", leftPct: 35.6, topPct: 64.4, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-11", label: "AI Lab", leftPct: 50.6, topPct: 64.4, widthPct: 14.2, heightPct: 16.6 },
  { slotKey: "ws-12", label: "Review", leftPct: 65.6, topPct: 64.4, widthPct: 14.2, heightPct: 16.6 }
];

export const getOfficeSlotDefinition = (slotKey: string): OfficeSlotDefinition | null =>
  MVP1_WORKSTATION_SLOTS.find((slot) => slot.slotKey === slotKey) ?? null;

export const getOfficeSlotCenter = (slotKey: string): { x: number; y: number } | null => {
  const slot = getOfficeSlotDefinition(slotKey);
  if (!slot) {
    return null;
  }

  return {
    x: Math.round(((slot.leftPct + slot.widthPct / 2) / 100) * FLOOR_TEXTURE_WIDTH),
    y: Math.round(((slot.topPct + slot.heightPct / 2) / 100) * FLOOR_TEXTURE_HEIGHT)
  };
};

export const getDefaultWorkstationName = (slotKey: string): string =>
  getOfficeSlotDefinition(slotKey)?.label ?? slotKey;
