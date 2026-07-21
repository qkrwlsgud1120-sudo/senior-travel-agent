import type { Itinerary } from './itinerary';
import type { BookingSummary } from './booking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export type ConversationPhase =
  | 'step1_interview'
  | 'step2_profile_review'
  | 'gathering'
  | 'itinerary_proposed'
  | 'itinerary_agreed'
  | 'booking_info_gathering'
  | 'booking_summary_drafted'
  | 'booking_confirmed';

export interface QuickChoicePrompt {
  question: string;
  options: string[];
  multiSelect: boolean;
}

export interface TravelerProfileSummary {
  styleBreakdown: Array<{ style: string; percentage: number }>;
  fitnessGuideline: string;
  travelPreferenceSummary: string;
  aiRecommendation: string;
}

export interface ChatRequest {
  sessionId?: string;
  message: string;
}

export interface ChatResponse {
  sessionId: string;
  assistantMessage: ChatMessage;
  phase: ConversationPhase;
  itinerary?: Itinerary;
  bookingSummaryDraft?: BookingSummary;
  quickChoice?: QuickChoicePrompt;
  travelerProfile?: TravelerProfileSummary;
}

export interface ConfirmBookingRequest {
  sessionId: string;
}

export interface ConfirmBookingResponse {
  sessionId: string;
  phase: ConversationPhase;
  bookingSummary: BookingSummary;
}

export interface ProceedWithItineraryRequest {
  sessionId: string;
}

export interface ProceedWithItineraryResponse {
  sessionId: string;
  phase: ConversationPhase;
}
