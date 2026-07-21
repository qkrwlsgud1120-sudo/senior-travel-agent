import type {
  ConversationPhase,
  ChatMessage,
  Itinerary,
  BookingSummary,
  QuickChoicePrompt,
  TravelerProfileSummary,
} from '@travel-ai/shared';
import type { DisplayMessage } from '../types';

export interface ConversationState {
  sessionId?: string;
  messages: DisplayMessage[];
  phase: ConversationPhase;
  isLoading: boolean;
  error?: string;
  itinerary?: Itinerary;
  activeTab: 'chat' | number;
  pendingQuickChoice?: QuickChoicePrompt;
}

export const initialConversationState: ConversationState = {
  messages: [],
  phase: 'step1_interview',
  isLoading: false,
  activeTab: 'chat',
};

export type ConversationAction =
  | { type: 'SEND_MESSAGE_START'; userMessage: DisplayMessage }
  | {
      type: 'SEND_MESSAGE_SUCCESS';
      sessionId: string;
      phase: ConversationPhase;
      assistantMessage: ChatMessage;
      itinerary?: Itinerary;
      bookingSummaryDraft?: BookingSummary;
      quickChoice?: QuickChoicePrompt;
      travelerProfile?: TravelerProfileSummary;
    }
  | { type: 'SEND_MESSAGE_ERROR'; error: string }
  | { type: 'PROCEED_SUCCESS'; phase: ConversationPhase }
  | { type: 'CONFIRM_BOOKING_SUCCESS'; phase: ConversationPhase; bookingSummary: BookingSummary }
  | { type: 'SET_ACTIVE_TAB'; tab: 'chat' | number }
  | { type: 'RESET' };

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'SEND_MESSAGE_START':
      return {
        ...state,
        messages: [...state.messages, action.userMessage],
        isLoading: true,
        error: undefined,
        pendingQuickChoice: undefined,
      };

    case 'SEND_MESSAGE_SUCCESS': {
      const newMessages: DisplayMessage[] = [...state.messages];
      if (action.assistantMessage.content) {
        newMessages.push({
          type: 'text',
          role: 'assistant',
          content: action.assistantMessage.content,
          id: action.assistantMessage.id,
        });
      }
      if (action.travelerProfile) {
        newMessages.push({
          type: 'traveler_profile',
          payload: action.travelerProfile,
          id: `${action.assistantMessage.id}-profile`,
        });
      }
      if (action.bookingSummaryDraft) {
        newMessages.push({
          type: 'booking_summary',
          payload: action.bookingSummaryDraft,
          id: `${action.assistantMessage.id}-booking`,
        });
      }
      return {
        ...state,
        sessionId: action.sessionId,
        phase: action.phase,
        messages: newMessages,
        isLoading: false,
        itinerary: action.itinerary ?? state.itinerary,
        activeTab: action.itinerary ? 1 : state.activeTab,
        pendingQuickChoice: action.quickChoice,
      };
    }

    case 'SEND_MESSAGE_ERROR':
      return { ...state, isLoading: false, error: action.error };

    case 'PROCEED_SUCCESS':
      return { ...state, phase: action.phase };

    case 'CONFIRM_BOOKING_SUCCESS': {
      const lastBookingIndex = [...state.messages]
        .map((m, idx) => ({ m, idx }))
        .reverse()
        .find(({ m }) => m.type === 'booking_summary')?.idx;

      if (lastBookingIndex === undefined) {
        return { ...state, phase: action.phase };
      }

      const newMessages = state.messages.map((msg, idx) =>
        idx === lastBookingIndex ? { ...msg, payload: action.bookingSummary } : msg
      ) as DisplayMessage[];

      return { ...state, phase: action.phase, messages: newMessages };
    }

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };

    case 'RESET':
      return initialConversationState;

    default:
      return state;
  }
}
