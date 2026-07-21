import type { CSSProperties } from 'react';

const dotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 4,
  background: 'var(--color-muted)',
  animation: 'senior-travel-typing-dot 1s infinite ease-in-out',
};

export function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 6, margin: '0.4rem 1rem 0.4rem 3.4rem' }} aria-label="답변을 준비하고 있어요">
      <style>{`@keyframes senior-travel-typing-dot { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }`}</style>
      <div style={dotStyle} />
      <div style={{ ...dotStyle, animationDelay: '0.15s' }} />
      <div style={{ ...dotStyle, animationDelay: '0.3s' }} />
    </div>
  );
}
