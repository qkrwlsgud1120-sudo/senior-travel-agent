import type { BookingSummary, TravelerProfileSummary } from '@travel-ai/shared';

export type DisplayMessage =
  | { type: 'text'; role: 'user' | 'assistant'; content: string; id: string }
  | { type: 'booking_summary'; payload: BookingSummary; id: string }
  | { type: 'traveler_profile'; payload: TravelerProfileSummary; id: string };
