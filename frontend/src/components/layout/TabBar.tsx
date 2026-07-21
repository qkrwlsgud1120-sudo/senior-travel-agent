import { useConversation } from '../../state/ConversationContext';

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        border: 'none',
        borderBottom: active ? '3px solid var(--color-primary)' : '3px solid transparent',
        borderRadius: 0,
        background: 'none',
        padding: '0.75rem 0.5rem',
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--color-primary)' : 'var(--color-muted)',
        minWidth: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

export function TabBar() {
  const { state, dispatch } = useConversation();
  const dayCount = state.itinerary?.days.length ?? 0;

  if (dayCount === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0 1rem',
        borderBottom: '1px solid var(--color-border)',
        overflowX: 'auto',
      }}
    >
      <TabButton
        label="AI 대화"
        active={state.activeTab === 'chat'}
        onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'chat' })}
      />
      {Array.from({ length: dayCount }, (_, i) => i + 1).map((dayNumber) => (
        <TabButton
          key={dayNumber}
          label={`Day ${dayNumber}`}
          active={state.activeTab === dayNumber}
          onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: dayNumber })}
        />
      ))}
    </div>
  );
}
