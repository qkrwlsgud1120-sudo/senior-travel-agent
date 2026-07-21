import { Router } from 'express';
import type { ConfirmBookingRequest, ConfirmBookingResponse } from '@travel-ai/shared';
import { getSession } from '../session/store';

export const bookingConfirmRouter = Router();

bookingConfirmRouter.post('/', (req, res) => {
  const body = req.body as ConfirmBookingRequest;
  if (!body.sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const session = getSession(body.sessionId);
  if (!session || session.phase !== 'booking_summary_drafted' || !session.pendingBookingSummary) {
    res.status(409).json({ error: '지금은 예약을 확정할 수 없는 상태예요.' });
    return;
  }

  const finalSummary = {
    ...session.pendingBookingSummary,
    confirmedAt: new Date().toISOString(),
  };

  session.finalBookingSummary = finalSummary;
  session.pendingBookingSummary = undefined;
  session.phase = 'booking_confirmed';

  const response: ConfirmBookingResponse = {
    sessionId: session.sessionId,
    phase: session.phase,
    bookingSummary: finalSummary,
  };
  res.json(response);
});
