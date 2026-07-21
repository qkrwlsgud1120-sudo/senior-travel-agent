import type { DailyBurdenSummary, ItineraryDay, RouteSegment, TravelerPreferences } from '@travel-ai/shared';
import type { MobilityLevel } from '../maps/seniorAdjustment';
import { DAILY_WALKING_BUDGET_METERS } from '../maps/seniorAdjustment';

const AGE_GROUP_LABELS: Record<NonNullable<TravelerPreferences['ageGroup']>, string> = {
  '50s': '50대',
  '60s': '60대',
  '70sPlus': '70대 이상',
};

function buildInterpretation(mobilityScore: number, ageGroup?: TravelerPreferences['ageGroup']): string {
  const base = INTERPRETATIONS[mobilityScore];
  const ageLabel = ageGroup ? AGE_GROUP_LABELS[ageGroup] : undefined;
  if (!ageLabel) return base;
  if (mobilityScore <= 2) return `이 일정은 ${ageLabel} 기준으로 다소 부담스러울 수 있어요. ${base}`;
  if (mobilityScore === 3) return `${base} (${ageLabel} 기준으로 보통 수준의 일정이에요.)`;
  return `${base} (${ageLabel} 기준으로도 무리 없는 수준이에요.)`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const REST_SCORE_BY_ACTIVITY_COUNT: Record<number, number> = {
  0: 5,
  1: 5,
  2: 5,
  3: 4,
  4: 3,
  5: 2,
};

function restScoreFor(activityCount: number): number {
  return REST_SCORE_BY_ACTIVITY_COUNT[activityCount] ?? 1;
}

// No stairs info known for any activity that day -> assume a mild, not-zero
// penalty rather than a perfect score, since we genuinely don't know.
const DEFAULT_STAIRS_SCORE = 4;

function stairsScoreFor(day: ItineraryDay): number {
  const known = day.activities
    .map((activity) => activity.accessibility?.stairsCount)
    .filter((n): n is number => typeof n === 'number');
  if (known.length === 0) return DEFAULT_STAIRS_SCORE;

  const avgStairs = known.reduce((sum, n) => sum + n, 0) / known.length;
  return clamp(Math.round(5 - avgStairs / 2.5), 1, 5);
}

const INTERPRETATIONS: Record<number, string> = {
  5: '이 날은 이동 부담이 거의 없어요. 편안하게 다니실 수 있어요.',
  4: '적당히 걷는 일정이에요. 무리 없이 다니실 수 있어요.',
  3: '보통 수준으로 걷는 일정이에요. 중간중간 쉬어가면서 다니시면 좋아요.',
  2: '이동이 좀 많은 편이에요. 체력에 따라 다소 힘드실 수 있어요.',
  1: '이동이 많은 일정이에요. 이 날은 다소 힘드실 수 있어요.',
};

const ALTERNATIVE_SUGGESTIONS: Record<number, string> = {
  2: '활동을 1개만 줄이면 훨씬 편해질 거예요.',
  1: '활동을 1~2개 줄이거나, 이 지역 일정을 이틀로 나누는 걸 추천해요.',
};

// Every sub-score and the final weighted average are always returned alongside
// the score, so the number is never a black box — the PRD explicitly warns
// against "plausible-looking" scores with no visible basis.
export function calculateDailyBurden(
  day: ItineraryDay,
  segments: RouteSegment[],
  mobilityLevel: MobilityLevel,
  ageGroup?: TravelerPreferences['ageGroup']
): DailyBurdenSummary {
  const totalDistanceMeters = segments.reduce((sum, s) => sum + s.distanceMeters, 0);
  const totalSeniorAdjustedMinutes = segments.reduce((sum, s) => sum + s.seniorAdjustedDurationMinutes, 0);
  const km = totalDistanceMeters / 1000;

  let burdenLevel: DailyBurdenSummary['burdenLevel'];
  if (km < 2 && totalSeniorAdjustedMinutes < 60) {
    burdenLevel = 'low';
  } else if (km > 4 || totalSeniorAdjustedMinutes > 120) {
    burdenLevel = 'high';
  } else {
    burdenLevel = 'medium';
  }

  const budgetMeters = DAILY_WALKING_BUDGET_METERS[mobilityLevel];
  const walkingDistanceScore = clamp(Math.round(5 - 4 * (totalDistanceMeters / budgetMeters)), 1, 5);
  const stairsScore = stairsScoreFor(day);
  const restScore = restScoreFor(day.activities.length);
  const mobilityScore = clamp(Math.round((walkingDistanceScore + stairsScore + restScore) / 3), 1, 5);
  const notRecommended = mobilityScore <= 2;

  return {
    totalDistanceMeters,
    totalSeniorAdjustedMinutes,
    activityCount: day.activities.length,
    burdenLevel,
    mobilityScore,
    walkingDistanceScore,
    stairsScore,
    restScore,
    interpretation: buildInterpretation(mobilityScore, ageGroup),
    notRecommended,
    alternativeSuggestion: notRecommended ? ALTERNATIVE_SUGGESTIONS[mobilityScore] : undefined,
  };
}
