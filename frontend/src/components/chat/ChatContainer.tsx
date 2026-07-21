import { useConversation } from '../../state/ConversationContext';
import { useConversationActions } from '../../state/useConversationActions';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';

export function ChatContainer() {
  const { state } = useConversation();
  const { handleSend, handleConfirmBooking, handleAskQuestion } = useConversationActions();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <ChatWindow onSend={handleSend} onConfirmBooking={handleConfirmBooking} onAskQuestion={handleAskQuestion} />
      <ChatInput onSend={handleSend} disabled={state.isLoading} />
    </div>
  );
}
