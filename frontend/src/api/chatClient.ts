import type {
  ChatRequest,
  ChatResponse,
  ProceedWithItineraryRequest,
  ProceedWithItineraryResponse,
  ConfirmBookingRequest,
  ConfirmBookingResponse,
} from '@travel-ai/shared';

// Local dev: empty string, so requests stay relative and go through Vite's
// dev-server proxy (vite.config.ts) to localhost:3001.
// Deployed: set to the Render backend's URL so the browser calls it directly.
// Deliberately NOT proxied through Vercel's rewrites — itinerary generation
// can take 1-2 minutes (multiple Claude tool-use iterations + route lookups),
// and Vercel's external-rewrite proxy hard-cuts requests at ~120s
// (ROUTER_EXTERNAL_TARGET_ERROR), which a direct cross-origin call avoids.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const url = `${API_BASE_URL}${path}`;
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
