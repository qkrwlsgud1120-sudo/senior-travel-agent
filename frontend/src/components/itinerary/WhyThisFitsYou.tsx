export function WhyThisFitsYou({ rationale }: { rationale: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.4rem',
        marginTop: '0.5rem',
        padding: '0.5rem 0.75rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-accent-tint)',
        color: 'var(--color-accent)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
      }}
    >
      <span aria-hidden="true">✓</span>
      <span>{rationale}</span>
    </div>
  );
}
