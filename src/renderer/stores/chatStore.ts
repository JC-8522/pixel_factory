import { create } from "zustand";
import type { CreateMessageRequest } from "../../shared/ipc";
import type { MessageRecord } from "../../shared/types/records";

const sameMessages = (left: MessageRecord[], right: MessageRecord[]): boolean =>
  left.length === right.length &&
  left.every(
    (message, index) =>
      message.id === right[index]?.id &&
      message.updated_at === right[index]?.updated_at &&
      message.content === right[index]?.content
  );

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
    const messages = await window.codexOffice.messages.listBySession(sessionId);
    set((state) => ({
      messagesBySession: sameMessages(state.messagesBySession[sessionId] ?? [], messages)
        ? state.messagesBySession
        : { ...state.messagesBySession, [sessionId]: messages }
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
