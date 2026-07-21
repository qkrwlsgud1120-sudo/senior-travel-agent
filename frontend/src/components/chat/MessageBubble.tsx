interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0.4rem 1rem' }}>
        <div
          style={{
            maxWidth: '78%',
            padding: '1rem 1.15rem',
            borderRadius: '20px 4px 20px 20px',
            background: 'var(--color-primary)',
            color: 'var(--color-primary-contrast)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end', margin: '0.4rem 1rem' }}>
      <div
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          background: 'var(--color-primary)',
          color: '#fff',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
        }}
      >
        ✦
      </div>
      <div
        style={{
          maxWidth: '78%',
          padding: '1rem 1.15rem',
          borderRadius: '4px 20px 20px 20px',
          background: 'var(--color-fill)',
          color: 'var(--color-text)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {content}
      </div>
    </div>
  );
}
