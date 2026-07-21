import type { CSSProperties } from 'react';
import type { LodgingRecommendation } from '@travel-ai/shared';

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.5rem 0.85rem',
  borderRadius: 999,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-primary)',
  fontWeight: 700,
  fontSize: 'var(--font-size-sm)',
  textDecoration: 'none',
};

function Section({ title, items }: { title: string; items: LodgingRecommendation[] }) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <h5
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 700,
          margin: '0 0 0.4rem',
          color: 'var(--color-muted)',
        }}
      >
        {title}
      </h5>
      {items.map((item) => (
        <div
          key={item.option.placeId}
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: item.verdict === 'recommended' ? 'var(--color-accent-tint)' : 'var(--color-fill)',
            marginBottom: '0.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 700 }}>
              <span aria-hidden="true">{item.verdict === 'recommended' ? '✓ ' : '✕ '}</span>
              {item.option.name}
            </span>
            {item.option.rating !== undefined && (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
                ⭐ {item.option.rating.toFixed(1)}
              </span>
            )}
          </div>
          {item.option.address && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>{item.option.address}</div>
          )}
          <div style={{ margin: '0.35rem 0', fontSize: 'var(--font-size-sm)' }}>{item.reason}</div>
          {item.verdict === 'recommended' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <a href={item.bookingSearchUrls.agoda} target="_blank" rel="noreferrer" style={linkButtonStyle}>
                Agoda에서 확인하기
              </a>
              <a href={item.bookingSearchUrls.hotelsCom} target="_blank" rel="noreferrer" style={linkButtonStyle}>
                Hotels.com에서 확인하기
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function HotelManagerCard({ recommendations }: { recommendations?: LodgingRecommendation[] }) {
  if (!recommendations || recommendations.length === 0) return null;

  const recommended = recommendations.filter((r) => r.verdict === 'recommended');
  const notRecommended = recommendations.filter((r) => r.verdict === 'notRecommended');

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        margin: '0.75rem 0',
        background: 'var(--color-surface)',
      }}
    >
      <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, margin: '0 0 0.75rem' }}>AI 숙소 추천</h4>
      <Section title="추천 숙소" items={recommended} />
      <Section title="추천하지 않는 숙소" items={notRecommended} />
    </div>
  );
}
