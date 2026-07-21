import type {
  ChatRequest,
  ChatResponse,
  ProceedWithItineraryRequest,
  ProceedWithItineraryResponse,
  ConfirmBookingRequest,
  ConfirmBookingResponse,
} from '@travel-ai/shared';

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? `요청이 실패했어요 (${res.status})`);
  }

  return res.json() as Promise<TResponse>;
}

export function sendMessage(sessionId: string | undefined, message: string): Promise<ChatResponse> {
  const body: ChatRequest = { sessionId, message };
  return postJson<ChatResponse>('/api/chat', body);
}

export function proceedWithItinerary(sessionId: string): Promise<ProceedWithItineraryResponse> {
  const body: ProceedWithItineraryRequest = { sessionId };
  return postJson<ProceedWithItineraryResponse>('/api/chat/proceed', body);
}

export function confirmBooking(sessionId: string): Promise<ConfirmBookingResponse> {
  const body: ConfirmBookingRequest = { sessionId };
  return postJson<ConfirmBookingResponse>('/api/chat/confirm-booking', body);
}
