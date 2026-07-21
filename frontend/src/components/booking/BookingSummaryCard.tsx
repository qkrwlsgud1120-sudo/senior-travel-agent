import type { BookingSummary } from '@travel-ai/shared';
import { ConfirmBookingPanel } from './ConfirmBookingPanel';

interface BookingSummaryCardProps {
  summary: BookingSummary;
  actionable: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}

function Row({ label, value }: { label: string; value?: string | number | boolean }) {
  if (value === undefined || value === '' || value === false) return null;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.4rem 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span style={{ color: 'var(--color-muted)' }}>{label}</span>
      <span style={{ fontWeight: 700, textAlign: 'right' }}>{typeof value === 'boolean' ? '필요' : value}</span>
    </div>
  );
}

function buildCopyText(summary: BookingSummary): string {
  return [
    '[여행 예약 안내 요약]',
    `- 출발지: ${summary.flight.departureCity ?? '-'}`,
    `- 도착지: ${summary.flight.arrivalCity ?? '-'}`,
    `- 항공 희망일: ${summary.flight.preferredDates ?? '-'}`,
    `- 숙소 지역: ${summary.hotel.areaPreference ?? '-'}`,
    `- 숙박 일수: ${summary.hotel.numNights ?? '-'}`,
    `- 현지 교통: ${summary.transport.localTransportPreference ?? '-'}`,
    summary.notes ? `- 메모: ${summary.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function BookingSummaryCard({ summary, actionable, onConfirm, onEdit }: BookingSummaryCardProps) {
  const isConfirmed = Boolean(summary.confirmedAt);

  function handleCopy() {
    navigator.clipboard.writeText(buildCopyText(summary)).catch(() => {});
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        margin: '0.75rem 1rem',
        background: 'var(--color-surface)',
        boxShadow: '0 2px 10px rgba(20,20,24,0.05)',
      }}
    >
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, margin: '0 0 0.75rem' }}>예약 안내 요약</h2>

      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: '0.75rem 0 0.25rem' }}>항공</h3>
      <Row label="출발지" value={summary.flight.departureCity} />
      <Row label="도착지" value={summary.flight.arrivalCity} />
      <Row label="희망 날짜" value={summary.flight.preferredDates} />
      <Row label="좌석 등급" value={summary.flight.classPreference} />
      <Row label="인원" value={summary.flight.numTravelers} />
      <Row label="도움 필요사항" value={summary.flight.specialAssistanceNeeds} />

      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: '0.75rem 0 0.25rem' }}>숙소</h3>
      <Row label="지역" value={summary.hotel.areaPreference} />
      <Row label="객실 타입" value={summary.hotel.roomType} />
      <Row label="숙박 일수" value={summary.hotel.numNights} />
      <Row label="편의 요청사항" value={summary.hotel.accessibilityNeeds} />

      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: '0.75rem 0 0.25rem' }}>교통</h3>
      <Row label="현지 이동 방식" value={summary.transport.localTransportPreference} />
      <Row label="공항 이동 지원" value={summary.transport.airportTransferNeeded} />

      {summary.notes && <p style={{ marginTop: '0.75rem', color: 'var(--color-muted)' }}>{summary.notes}</p>}

      {isConfirmed ? (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: 'var(--color-accent)', fontWeight: 700 }}>확인 완료 — 예약 준비가 끝났어요.</p>
          <button type="button" className="secondary" onClick={handleCopy}>
            요약 복사하기
          </button>
        </div>
      ) : (
        actionable && <ConfirmBookingPanel onConfirm={onConfirm} onEdit={onEdit} />
      )}
    </div>
  );
}
