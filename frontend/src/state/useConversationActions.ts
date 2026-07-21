import { useConversation } from './ConversationContext';
import { sendMessage, proceedWithItinerary, confirmBooking } from '../api/chatClient';

export function useConversationActions() {
  const { state, dispatch } = useConversation();

  async function handleSend(text: string) {
    dispatch({
      type: 'SEND_MESSAGE_START',
      userMessage: { type: 'text', role: 'user', content: text, id: crypto.randomUUID() },
    });

    try {
      const response = await sendMessage(state.sessionId, text);
      dispatch({
        type: 'SEND_MESSAGE_SUCCESS',
        sessionId: response.sessionId,
        phase: response.phase,
        assistantMessage: response.assistantMessage,
        itinerary: response.itinerary,
        bookingSummaryDraft: response.bookingSummaryDraft,
        quickChoice: response.quickChoice,
        travelerProfile: response.travelerProfile,
      });
    } catch (err) {
      dispatch({
        type: 'SEND_MESSAGE_ERROR',
        error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.',
      });
    }
  }

  async function handleProceed() {
    if (!state.sessionId) return;
    try {
      const response = await proceedWithItinerary(state.sessionId);
      dispatch({ type: 'PROCEED_SUCCESS', phase: response.phase });
      // The next step is conversational (booking info gathering), so bring the
      // user back to the chat tab where that follow-up will actually appear.
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'chat' });
    } catch (err) {
      dispatch({
        type: 'SEND_MESSAGE_ERROR',
        error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.',
      });
    }
  }

  async function handleConfirmBooking() {
    if (!state.sessionId) return;
    try {
      const response = await confirmBooking(state.sessionId);
      dispatch({
        type: 'CONFIRM_BOOKING_SUCCESS',
        phase: response.phase,
        bookingSummary: response.bookingSummary,
      });
    } catch (err) {
      dispatch({
        type: 'SEND_MESSAGE_ERROR',
        error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.',
      });
    }
  }

  function handleAskQuestion() {
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'chat' });
  }

  return { handleSend, handleProceed, handleConfirmBooking, handleAskQuestion };
}
