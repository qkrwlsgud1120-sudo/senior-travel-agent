import { AppShell } from './components/layout/AppShell';
import { TabBar } from './components/layout/TabBar';
import { ConversationProvider, useConversation } from './state/ConversationContext';
import { useConversationActions } from './state/useConversationActions';
import { ChatContainer } from './components/chat/ChatContainer';
import { DayTabView } from './components/itinerary/DayTabView';

function AppContent() {
  const { state } = useConversation();
  const { handleProceed, handleAskQuestion } = useConversationActions();

  return (
    <AppShell>
      <TabBar />
      {state.activeTab === 'chat' || !state.itinerary ? (
        <ChatContainer />
      ) : (
        <DayTabView
          itinerary={state.itinerary}
          dayNumber={state.activeTab}
          actionable={state.phase === 'itinerary_proposed'}
          onProceed={handleProceed}
          onAskQuestion={handleAskQuestion}
        />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <ConversationProvider>
      <AppContent />
    </ConversationProvider>
  );
}
