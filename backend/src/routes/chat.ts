import { Router } from 'express';
import { randomUUID } from 'crypto';
import type {
  ChatRequest,
  ChatResponse,
  ChatMessage,
  ProceedWithItineraryRequest,
  ProceedWithItineraryResponse,
} from '@travel-ai/shared';
import { runAgentTurn } from '../claude/agent';
import { handleInterviewTurn } from '../interview/step1Handler';
import { getOrCreateSession, getSession } from '../session/store';
import { logger } from '../utils/logger';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  const body = req.body as ChatRequest;
  if (!body.message || typeof body.message !== 'string') {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const session = getOrCreateSession(body.sessionId);

  if (session.isProcessing) {
    res.status(409).json({ error: '아직 이전 메시지를 처리하고 있어요. 잠시만 기다려 주세요.' });
    return;
  }

  session.isProcessing = true;

  try {
    // STEP1/STEP2 are a deterministic backend-driven interview — no Claude call,
    // no latency, and no risk of the fixed question wording drifting turn to turn.
    if (session.phase === 'step1_interview' || session.phase === 'step2_profile_review') {
      const result = handleInterviewTurn(session, body.message);

      const assistantMessage: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: result.assistantText,
        createdAt: new Date().toISOString(),
      };

      const chatResponse: ChatResponse = {
        sessionId: session.sessionId,
        assistantMessage,
        phase: result.phase,
        quickChoice: result.quickChoice,
        travelerProfile: result.travelerProfile,
      };

      res.json(chatResponse);
      return;
    }

    session.claudeHistory.push({ role: 'user', content: body.message });
    const result = await runAgentTurn(session);

    const assistantMessage: ChatMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: result.assistantText,
      createdAt: new Date().toISOString(),
    };

    const chatResponse: ChatResponse = {
      sessionId: session.sessionId,
      assistantMessage,
      phase: session.phase,
      itinerary: result.itinerary,
      bookingSummaryDraft: result.bookingSummaryDraft,
    };

    res.json(chatResponse);
  } catch (err) {
    logger.error('chat route failed', err);
    res.status(502).json({ error: '죄송해요, 지금 응답을 만들 수 없어요. 잠시 후 다시 시도해 주세요.' });
  } finally {
    session.isProcessing = false;
  }
});

chatRouter.post('/proceed', (req, res) => {
  const body = req.body as ProceedWithItineraryRequest;
  if (!body.sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const session = getSession(body.sessionId);
  if (!session || session.phase !== 'itinerary_proposed') {
    res.status(409).json({ error: '지금은 일정을 진행할 수 없는 상태예요.' });
    return;
  }

  session.phase = 'itinerary_agreed';

  const response: ProceedWithItineraryResponse = {
    sessionId: session.sessionId,
    phase: session.phase,
  };
  res.json(response);
});
