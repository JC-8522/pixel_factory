import { create } from "zustand";
import type { CreateMeetingRequest, FinishMeetingRequest, SendMeetingMessageRequest } from "../../shared/ipc";
import type { MeetingMessageRecord, MeetingRecord } from "../../shared/types/records";

type MeetingState = {
  meetings: MeetingRecord[];
  messagesByMeeting: Record<string, MeetingMessageRecord[]>;
  loading: boolean;
  hydrate(): Promise<void>;
  hydrateMessages(meetingId: string): Promise<void>;
  createMeeting(input: CreateMeetingRequest): Promise<MeetingRecord>;
  sendMessage(input: SendMeetingMessageRequest): Promise<MeetingMessageRecord>;
  finishMeeting(input: FinishMeetingRequest): Promise<MeetingRecord>;
  reset(): void;
};

const upsertMeeting = (meetings: MeetingRecord[], meeting: MeetingRecord): MeetingRecord[] => [
  ...meetings.filter((item) => item.id !== meeting.id),
  meeting
];

export const useMeetingStore = create<MeetingState>((set) => ({
  meetings: [],
  messagesByMeeting: {},
  loading: false,
  hydrate: async () => {
    set({ loading: true });
    const meetings = await window.codexOffice.meetings.list();
    set({ meetings, loading: false });
  },
  hydrateMessages: async (meetingId) => {
    const messages = await window.codexOffice.meetings.listMessages(meetingId);
    set((state) => ({ messagesByMeeting: { ...state.messagesByMeeting, [meetingId]: messages } }));
  },
  createMeeting: async (input) => {
    const meeting = await window.codexOffice.meetings.create(input);
    set((state) => ({ meetings: upsertMeeting(state.meetings, meeting) }));
    return meeting;
  },
  sendMessage: async (input) => {
    const message = await window.codexOffice.meetings.sendMessage(input);
    set((state) => ({
      messagesByMeeting: {
        ...state.messagesByMeeting,
        [message.meeting_id]: [
          ...(state.messagesByMeeting[message.meeting_id] ?? []).filter((item) => item.id !== message.id),
          message
        ]
      }
    }));
    return message;
  },
  finishMeeting: async (input) => {
    const meeting = await window.codexOffice.meetings.finish(input);
    set((state) => ({ meetings: upsertMeeting(state.meetings, meeting) }));
    return meeting;
  },
  reset: () => set({ meetings: [], messagesByMeeting: {}, loading: false })
}));

