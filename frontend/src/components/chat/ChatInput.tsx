import { useState, type FormEvent, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: '0.6rem',
        alignItems: 'center',
        padding: '0.75rem 1rem 1.25rem',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="예: 무릎이 안 좋아서 많이 걷긴 힘들어"
        aria-label="메시지 입력"
        rows={1}
        style={{
          flex: 1,
          padding: '0.85rem 1.2rem',
          borderRadius: 999,
          border: 'none',
          background: 'var(--color-fill)',
          resize: 'none',
          minHeight: 'var(--touch-target-min)',
        }}
      />
      <button
        type="submit"
        className="primary"
        disabled={disabled || !value.trim()}
        aria-label="메시지 보내기"
        style={{
          borderRadius: '50%',
          width: 'var(--touch-target-min)',
          height: 'var(--touch-target-min)',
          padding: 0,
          fontSize: '1.3rem',
          flexShrink: 0,
        }}
      >
        <span aria-hidden="true">↑</span>
      </button>
    </form>
  );
}
