import type { Itinerary } from '@travel-ai/shared';
import { MobilityScoreCard } from './MobilityScoreCard';
import { ItineraryMap } from './ItineraryMap';
import { AccessibilityIcons } from './AccessibilityIcons';
import { WhyThisFitsYou } from './WhyThisFitsYou';
import { Tag } from './Tag';
import { HotelManagerCard } from './HotelManagerCard';

const TIME_LABEL: Record<string, string> = {
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
};

const WALKING_LABEL: Record<string, { label: string; tone: 'positive' | 'neutral' }> = {
  minimal: { label: '이동 적음', tone: 'positive' },
  moderate: { label: '이동 보통', tone: 'neutral' },
  significant: { label: '이동 많음', tone: 'neutral' },
};

interface DayTabViewProps {
  itinerary: Itinerary;
  dayNumber: number;
  actionable: boolean;
  onProceed: () => void;
  onAskQuestion: () => void;
}

export function DayTabView({ itinerary, dayNumber, actionable, onProceed, onAskQuestion }: DayTabViewProps) {
  const day = itinerary.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return null;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, margin: '0 0 0.25rem' }}>
        {day.dayNumber}일차{day.theme ? ` · ${day.theme}` : ''}
      </h2>
      <p style={{ color: 'var(--color-muted)', margin: '0 0 1rem' }}>
        {itinerary.title} · {itinerary.destination}
      </p>

      <MobilityScoreCard summary={day.dailyBurdenSummary} />
      <ItineraryMap day={day} />

      {day.activities.map((activity, idx) => {
        const walking = WALKING_LABEL[activity.walkingLevel];
        return (
          <div
            key={idx}
            style={{
              padding: '0.85rem',
              borderLeft: '3px solid var(--color-primary)',
              marginBottom: '0.6rem',
              background: 'var(--color-fill)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-primary)' }}>
                {activity.scheduledTime ?? (TIME_LABEL[activity.timeOfDay] ?? activity.timeOfDay)}
              </span>
              {walking && <Tag tone={walking.tone}>{walking.label}</Tag>}
              {!activity.coordinates && <Tag tone="neutral">위치 정보 없음</Tag>}
            </div>
            <div style={{ fontWeight: 700, marginTop: '0.35rem' }}>{activity.name}</div>
            {!activity.restaurantCandidates && activity.rating !== undefined && (
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
                ⭐ {activity.rating.toFixed(1)}
                {activity.userRatingsTotal !== undefined && ` (리뷰 ${activity.userRatingsTotal.toLocaleString()}개)`}
              </div>
            )}
            <div style={{ margin: '0.25rem 0' }}>{activity.description}</div>
            {activity.restaurantCandidates && (
              <ol style={{ margin: '0.4rem 0', paddingLeft: '1.3rem' }}>
                {activity.restaurantCandidates.map((candidate, cIdx) => (
                  <li key={candidate.placeId ?? cIdx} style={{ margin: '0.2rem 0' }}>
                    {candidate.name}
                    {candidate.rating !== undefined && ` (⭐ ${candidate.rating.toFixed(1)})`}
                  </li>
                ))}
              </ol>
            )}
            <WhyThisFitsYou rationale={activity.rationale} />
            <AccessibilityIcons info={activity.accessibility} />
          </div>
        );
      })}

      <HotelManagerCard recommendations={itinerary.lodgingRecommendations} />

      {actionable && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="button" className="secondary" onClick={onAskQuestion}>
            질문이 있어요
          </button>
          <button type="button" className="primary" onClick={onProceed} style={{ flex: 1 }}>
            이 일정으로 진행할게요
          </button>
        </div>
      )}
    </div>
  );
}
