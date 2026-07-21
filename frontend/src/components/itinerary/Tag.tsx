import type { ReactNode } from 'react';

type Tone = 'neutral' | 'primary' | 'positive';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: 'var(--color-fill)', fg: 'var(--color-text)' },
  primary: { bg: 'var(--color-primary-tint)', fg: 'var(--color-primary)' },
  positive: { bg: 'var(--color-accent-tint)', fg: 'var(--color-accent)' },
};

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.3rem 0.7rem',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
