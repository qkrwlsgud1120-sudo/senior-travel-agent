import { useEffect, useRef } from 'react';
import { useConversation } from '../../state/ConversationContext';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { QuickChoicePrompt } from './QuickChoicePrompt';
import { TravelerProfileSummaryCard } from './TravelerProfileSummaryCard';
import { BookingSummaryCard } from '../booking/BookingSummaryCard';

interface ChatWindowProps {
  onSend: (message: string) => void;
  onConfirmBooking: () => void;
  onAskQuestion: () => void;
}

export function ChatWindow({ onSend, onConfirmBooking, onAskQuestion }: ChatWindowProps) {
  const { state } = useConversation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    bottomRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [state.messages, state.isLoading, state.pendingQuickChoice]);

  const latestBookingId = [...state.messages].reverse().find((m) => m.type === 'booking_summary')?.id;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', minHeight: 0 }}>
      {state.messages.length === 0 && (
        <div
          style={{
            background: 'var(--color-primary-tint)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            margin: '0.5rem 1rem 1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span aria-hidden="true" style={{ fontSize: '1.3rem', color: 'var(--color-primary)' }}>
              ✦
            </span>
            <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-primary)' }}>
              여행 AI 에이전트
            </span>
          </div>
          <p style={{ margin: '0.6rem 0 0', color: 'var(--color-text)' }}>
            편하게 인사부터 건네보세요. 몇 가지만 여쭤보고 바로 여행 계획을 시작할게요.
          </p>
        </div>
      )}
      {state.messages.map((msg) => {
        if (msg.type === 'text') {
          return <MessageBubble key={msg.id} role={msg.role} content={msg.content} />;
        }
        if (msg.type === 'traveler_profile') {
          return <TravelerProfileSummaryCard key={msg.id} profile={msg.payload} />;
        }
        if (msg.type === 'booking_summary') {
          const actionable = msg.id === latestBookingId && state.phase === 'booking_summary_drafted';
          return (
            <BookingSummaryCard
              key={msg.id}
              summary={msg.payload}
              actionable={actionable}
              onConfirm={onConfirmBooking}
              onEdit={onAskQuestion}
            />
          );
        }
        return null;
      })}
      {state.pendingQuickChoice && !state.isLoading && (
        <QuickChoicePrompt prompt={state.pendingQuickChoice} onSend={onSend} />
      )}
      <div aria-live="polite">
        {state.isLoading && <TypingIndicator />}
        {state.error && <div style={{ color: 'crimson', padding: '0.5rem' }}>{state.error}</div>}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
