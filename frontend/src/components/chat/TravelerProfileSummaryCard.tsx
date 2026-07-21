import type { TravelerProfileSummary } from '@travel-ai/shared';

export function TravelerProfileSummaryCard({ profile }: { profile: TravelerProfileSummary }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        margin: '0.75rem 1rem',
        background: 'var(--color-surface)',
      }}
    >
      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, margin: '0 0 0.75rem' }}>
        고객님의 여행 성향
      </h3>

      {profile.styleBreakdown.length > 0 && (
        <p style={{ margin: '0 0 0.5rem' }}>
          <strong>여행 스타일:</strong> {profile.styleBreakdown.map((s) => `${s.style} ${s.percentage}%`).join(' / ')}
        </p>
      )}
      <p style={{ margin: '0 0 0.5rem' }}>
        <strong>체력 수준:</strong> {profile.fitnessGuideline}
      </p>
      <p style={{ margin: '0 0 0.75rem' }}>
        <strong>선호 여행:</strong> {profile.travelPreferenceSummary}
      </p>

      <div
        style={{
          background: 'var(--color-primary-tint)',
          color: 'var(--color-primary)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.85rem',
          fontWeight: 700,
        }}
      >
        AI 추천: &quot;{profile.aiRecommendation}&quot;
      </div>
    </div>
  );
}
