import { create } from "zustand";
import type { CreateMessageRequest } from "../../shared/ipc";
import type { MessageRecord } from "../../shared/types/records";

type ChatState = {
  messagesBySession: Record<string, MessageRecord[]>;
  loading: boolean;
  hydrateSession(sessionId: string): Promise<void>;
  createMessage(input: CreateMessageRequest): Promise<MessageRecord>;
  reset(): void;
};

export const useChatStore = create<ChatState>((set) => ({
  messagesBySession: {},
  loading: false,
  hydrateSession: async (sessionId) => {
    set({ loading: true });
    const messages = await window.codexOffice.messages.listBySession(sessionId);
    set((state) => ({
      messagesBySession: { ...state.messagesBySession, [sessionId]: messages },
      loading: false
    }));
  },
  createMessage: async (input) => {
    const message = await window.codexOffice.messages.create(input);
    if (message.session_id) {
      set((state) => ({
        messagesBySession: {
          ...state.messagesBySession,
          [message.session_id as string]: [
            ...(state.messagesBySession[message.session_id as string] ?? []).filter((item) => item.id !== message.id),
            message
          ]
        }
      }));
    }
    return message;
  },
  reset: () => set({ messagesBySession: {}, loading: false })
}));

