import { create } from "zustand";
import type { EventFilterRequest } from "../../shared/ipc";
import type { EventRecord } from "../../shared/types/records";

const sameEvents = (left: EventRecord[], right: EventRecord[]): boolean =>
  left.length === right.length &&
  left.every(
    (event, index) =>
      event.id === right[index]?.id &&
      event.created_at === right[index]?.created_at &&
      event.payload_json === right[index]?.payload_json
  );

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
    const events = await window.codexOffice.events.list(filter);
    set((state) => (sameEvents(state.events, events) ? state : { events }));
  },
  reset: () => set({ events: [], loading: false })
}));
