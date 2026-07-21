import { useState } from 'react';
import type { QuickChoicePrompt as QuickChoicePromptType } from '@travel-ai/shared';

interface QuickChoicePromptProps {
  prompt: QuickChoicePromptType;
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function QuickChoicePrompt({ prompt, onSend, disabled }: QuickChoicePromptProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(option: string) {
    if (disabled) return;
    if (!prompt.multiSelect) {
      onSend(option);
      return;
    }
    setSelected((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  function submitMulti() {
    if (selected.length === 0 || disabled) return;
    onSend(selected.join(', '));
    setSelected([]);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.5rem 1rem 1rem' }}>
      {prompt.options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            disabled={disabled}
            aria-pressed={prompt.multiSelect ? isSelected : undefined}
            style={{
              borderRadius: 999,
              padding: '0.6rem 1.1rem',
              border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: isSelected ? 'var(--color-primary-tint)' : 'var(--color-surface)',
              color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: isSelected ? 700 : 500,
              minWidth: 'auto',
            }}
          >
            {option}
          </button>
        );
      })}
      {prompt.multiSelect && (
        <button type="button" className="primary" onClick={submitMulti} disabled={disabled || selected.length === 0}>
          선택 완료
        </button>
      )}
    </div>
  );
}
