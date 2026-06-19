import { create } from "zustand";
import type { CreateWorkstationRequest } from "../../shared/ipc";
import type { FloorRecord, WorkstationRecord } from "../../shared/types/records";

type OfficeState = {
  floors: FloorRecord[];
  workstations: WorkstationRecord[];
  selectedFloorId: string | null;
  selectedSlotKey: string | null;
  loading: boolean;
  hydrate(): Promise<void>;
  createWorkstation(input: CreateWorkstationRequest): Promise<WorkstationRecord>;
  selectSlot(slotKey: string | null): void;
  reset(): void;
};

export const useOfficeStore = create<OfficeState>((set, get) => ({
  floors: [],
  workstations: [],
  selectedFloorId: null,
  selectedSlotKey: null,
  loading: false,
  hydrate: async () => {
    set({ loading: true });
    const snapshot = await window.codexOffice.office.getSnapshot();
    const nextFloorId = get().selectedFloorId ?? snapshot.floors[0]?.id ?? null;
    set({
      floors: snapshot.floors,
      workstations: snapshot.workstations,
      selectedFloorId: nextFloorId,
      loading: false
    });
  },
  createWorkstation: async (input) => {
    const workstation = await window.codexOffice.office.createWorkstation(input);
    set((state) => ({
      workstations: [...state.workstations.filter((item) => item.id !== workstation.id), workstation],
      selectedFloorId: state.selectedFloorId ?? workstation.floor_id
    }));
    return workstation;
  },
  selectSlot: (slotKey) => set({ selectedSlotKey: slotKey }),
  reset: () => set({ floors: [], workstations: [], selectedFloorId: null, selectedSlotKey: null, loading: false })
}));
