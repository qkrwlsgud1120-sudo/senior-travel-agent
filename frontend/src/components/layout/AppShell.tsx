import type { ReactNode } from 'react';
import { useConversation } from '../../state/ConversationContext';

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useConversation();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, margin: 0 }}>시니어 여행 도우미</h1>
        {state.messages.length > 0 && (
          <button
            type="button"
            className="secondary"
            onClick={() => dispatch({ type: 'RESET' })}
            aria-label="새 대화 시작하기"
          >
            새 대화 시작
          </button>
        )}
      </header>
      {children}
    </div>
  );
}
