import type { DailyBurdenSummary } from '@travel-ai/shared';

const SCORE_META: Record<number, { color: string; label: string }> = {
  5: { color: 'var(--color-accent)', label: '아주 편안함' },
  4: { color: 'var(--color-accent)', label: '편안함' },
  3: { color: 'var(--color-primary)', label: '보통' },
  2: { color: '#e07a1f', label: '다소 부담' },
  1: { color: '#d1453b', label: '부담 큼' },
};

function Stars({ score }: { score: number }) {
  return (
    <span aria-hidden="true" style={{ letterSpacing: 2, color: 'inherit' }}>
      {'★'.repeat(score)}
      {'☆'.repeat(5 - score)}
    </span>
  );
}

function SubScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 'var(--font-size-sm)',
        padding: '0.2rem 0',
      }}
    >
      <span style={{ color: 'var(--color-muted)' }}>{label}</span>
      <span>{score}/5</span>
    </div>
  );
}

export function MobilityScoreCard({ summary }: { summary?: DailyBurdenSummary }) {
  if (!summary) return null;
  const meta = SCORE_META[summary.mobilityScore] ?? SCORE_META[3];

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        marginBottom: '1rem',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', color: meta.color }}>
        <Stars score={summary.mobilityScore} />
        <span style={{ fontWeight: 700 }}>{meta.label}</span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
          (Mobility Score {summary.mobilityScore}/5)
        </span>
      </div>

      <p style={{ margin: '0.5rem 0 0.75rem' }}>{summary.interpretation}</p>

      {summary.notRecommended && summary.alternativeSuggestion && (
        <div
          style={{
            background: 'var(--color-fill)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            marginBottom: '0.75rem',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <strong>이 날은 추천하지 않아요.</strong> {summary.alternativeSuggestion}
        </div>
      )}

      <div>
        <SubScoreRow label="도보거리" score={summary.walkingDistanceScore} />
        <SubScoreRow label="계단" score={summary.stairsScore} />
        <SubScoreRow label="휴식" score={summary.restScore} />
      </div>

      {summary.totalDistanceMeters > 0 && (
        <p style={{ margin: '0.5rem 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
          총 이동거리 {(summary.totalDistanceMeters / 1000).toFixed(1)}km · 이동시간 약{' '}
          {summary.totalSeniorAdjustedMinutes}분
        </p>
      )}
    </div>
  );
}
