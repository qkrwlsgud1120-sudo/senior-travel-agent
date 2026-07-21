import { randomUUID } from 'crypto';
import type Anthropic from '@anthropic-ai/sdk';
import type { ConversationPhase, Itinerary, BookingSummary, TravelerConstraints, TravelerPreferences } from '@travel-ai/shared';
import type { Step1Answers } from '../interview/profileAnalysis';

export interface SessionState {
  sessionId: string;
  claudeHistory: Anthropic.MessageParam[];
  phase: ConversationPhase;
  latestItinerary?: Itinerary;
  pendingBookingSummary?: BookingSummary;
  finalBookingSummary?: BookingSummary;
  createdAt: number;
  lastActivityAt: number;
  isProcessing?: boolean;
  step1Answers: Step1Answers;
  step1QuestionIndex: number;
  step1Constraints?: Partial<TravelerConstraints>;
  step1Preferences?: Partial<TravelerPreferences>;
}

const sessions = new Map<string, SessionState>();

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export function getOrCreateSession(sessionId?: string): SessionState {
  if (sessionId) {
    const existing = sessions.get(sessionId);
    if (existing) {
      existing.lastActivityAt = Date.now();
      return existing;
    }
  }

  const id = sessionId ?? randomUUID();
  const session: SessionState = {
    sessionId: id,
    claudeHistory: [],
    phase: 'step1_interview',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    step1Answers: {},
    step1QuestionIndex: -1,
  };
  sessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivityAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 15 * 60 * 1000).unref();
