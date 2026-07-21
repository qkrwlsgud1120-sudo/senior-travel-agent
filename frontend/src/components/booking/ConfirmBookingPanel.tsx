interface ConfirmBookingPanelProps {
  onConfirm: () => void;
  onEdit: () => void;
}

export function ConfirmBookingPanel({ onConfirm, onEdit }: ConfirmBookingPanelProps) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start',
          background: 'var(--color-fill)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.85rem',
          marginBottom: '0.85rem',
        }}
      >
        <span aria-hidden="true" style={{ color: 'var(--color-muted)' }}>
          ⓘ
        </span>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
          확인 버튼을 누르셔야만 진행됩니다. 아직 예약이나 결제는 되지 않았어요.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="button" className="secondary" onClick={onEdit}>
          수정할게요
        </button>
        <button type="button" className="confirm" onClick={onConfirm} style={{ flex: 1 }}>
          확인 완료
        </button>
      </div>
    </div>
  );
}
