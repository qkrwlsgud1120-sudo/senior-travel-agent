import type { Coordinates, Itinerary, RestaurantCandidate } from '@travel-ai/shared';
import type { PlaceSearchResult } from '../maps/provider';
import { SINGLE_HOP_TRANSIT_THRESHOLD_METERS } from '../maps/seniorAdjustment';

const EARTH_RADIUS_METERS = 6371000;
const MAX_CANDIDATES = 3;
const DINNER_CUTOFF_HOUR = 17;

// Claude's own timeOfDay ('morning'/'afternoon'/'evening') is just its loose
// sense of the day's shape, not the actual clock time this slot lands on
// once real walking/transit durations are added up — a slot Claude called
// "evening" can end up scheduled at 14:02 once the route math runs. Label by
// the real scheduledTime (must run after attachScheduledTimes) instead.
function isLunch(scheduledTime: string | undefined): boolean {
  if (!scheduledTime) return true;
  const hour = Number(scheduledTime.split(':')[0]);
  return Number.isNaN(hour) || hour < DINNER_CUTOFF_HOUR;
}

function haversineMeters(from: Coordinates, to: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

interface CandidateSource {
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  placeId?: string;
}

function toCandidate(result: CandidateSource): RestaurantCandidate {
  return { name: result.name, rating: result.rating, userRatingsTotal: result.userRatingsTotal, placeId: result.placeId };
}

// Claude still picks one specific restaurant per meal slot when proposing the
// itinerary (so route/mobility-score math has a concrete point to anchor on),
// but showing that single pick as "the" lunch/dinner spot overstates
// certainty the search data doesn't support. This turns each meal slot into
// a "here are up to 3 nearby options, still within the day's walking budget"
// recommendation instead — the same recommend-with-alternatives shape as the
// Hotel Manager, reusing the same single-hop distance threshold as "doesn't
// blow the walking budget."
export function attachRestaurantCandidates(
  itinerary: Itinerary,
  restaurantPlaceIds: ReadonlySet<string>,
  allCandidates: ReadonlyMap<string, PlaceSearchResult>
): void {
  const restaurantResults = [...allCandidates.values()].filter((c) => restaurantPlaceIds.has(c.placeId));

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (!activity.placeId || !restaurantPlaceIds.has(activity.placeId) || !activity.coordinates) continue;

      const anchor = activity.coordinates;
      const nearby = restaurantResults
        .map((result) => ({ result, distanceMeters: haversineMeters(anchor, result.coordinates) }))
        .filter(({ distanceMeters }) => distanceMeters <= SINGLE_HOP_TRANSIT_THRESHOLD_METERS)
        .sort((a, b) => (b.result.rating ?? 0) - (a.result.rating ?? 0));

      const top = nearby.slice(0, MAX_CANDIDATES).map(({ result }) => toCandidate(result));
      activity.restaurantCandidates = top.length > 0 ? top : [toCandidate(activity)];

      activity.name = isLunch(activity.scheduledTime) ? '점심 식사' : '저녁 식사';
      activity.description = '동선에서 크게 벗어나지 않는 근처 맛집 후보예요.';
      activity.rationale = '오전/오후 일정과 가까운 곳들로만 골라서, 추가 이동 부담 없이 식사하실 수 있어요.';
    }
  }
}
