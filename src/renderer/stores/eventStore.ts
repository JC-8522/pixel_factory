import { create } from "zustand";
import type { EventFilterRequest } from "../../shared/ipc";
import type { EventRecord } from "../../shared/types/records";

type EventState = {
  events: EventRecord[];
  loading: boolean;
  hydrate(filter?: EventFilterRequest): Promise<void>;
  reset(): void;
};

export const useEventStore = create<EventState>((set) => ({
  events: [],
  loading: false,
  hydrate: async (filter) => {
    set({ loading: true });
    const events = await window.codexOffice.events.list(filter);
    set({ events, loading: false });
  },
  reset: () => set({ events: [], loading: false })
}));

