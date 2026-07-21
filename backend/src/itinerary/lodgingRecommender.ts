import type { Coordinates, Itinerary, LodgingOption, LodgingRecommendation } from '@travel-ai/shared';
import type { MapProvider, PlaceSearchResult } from '../maps/provider';
import { logger } from '../utils/logger';

const EARTH_RADIUS_METERS = 6371000;
// Straight-line approximation only, to avoid an extra Directions call per
// candidate hotel just to rank them — good enough for a recommend/avoid signal.
const APPROX_WALKING_SPEED_KMH = 4.5;

function centroid(points: Coordinates[]): Coordinates | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
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

function toLodgingOption(result: PlaceSearchResult): LodgingOption {
  return {
    placeId: result.placeId,
    name: result.name,
    coordinates: result.coordinates,
    rating: result.rating,
    address: result.address,
  };
}

// Best-effort search deep links, not a real affiliate integration (per PRD scope) —
// params aren't verified against the live sites, just a reasonable search query.
function buildBookingSearchUrls(hotelName: string, destination: string): { agoda: string; hotelsCom: string } {
  return {
    agoda: `https://www.agoda.com/search?q=${encodeURIComponent(`${hotelName} ${destination}`)}`,
    hotelsCom: `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(`${hotelName}, ${destination}`)}`,
  };
}

// Per the "숙소 이동 없음/2번까지/상관없음" preference, lodging is recommended once
// for the whole trip (centered on every activity across every day) rather than
// re-picked per day — a single home base the traveler doesn't need to pack up from.
export async function attachLodgingOptions(itinerary: Itinerary, provider: MapProvider): Promise<void> {
  try {
    const coords = itinerary.days
      .flatMap((day) => day.activities)
      .map((activity) => activity.coordinates)
      .filter((c): c is Coordinates => Boolean(c));
    const center = centroid(coords);
    if (!center) return;

    const results = await provider.searchLodging(center, itinerary.destination);
    if (results.length === 0) return;

    const ranked = results
      .map((result) => ({ result, distanceMeters: haversineMeters(center, result.coordinates) }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    const toMinutes = (distanceMeters: number) => Math.round((distanceMeters / 1000 / APPROX_WALKING_SPEED_KMH) * 60);

    const recommendations: LodgingRecommendation[] = [];
    const recommendedCount = Math.min(2, ranked.length);

    ranked.slice(0, recommendedCount).forEach(({ result, distanceMeters }) => {
      const travelMinutesToCluster = toMinutes(distanceMeters);
      recommendations.push({
        option: toLodgingOption(result),
        verdict: 'recommended',
        reason: `관광지까지 평균 ${travelMinutesToCluster}분 거리로 가까워, 캐리어를 옮기는 부담이 적어요.`,
        travelMinutesToCluster,
        bookingSearchUrls: buildBookingSearchUrls(result.name, itinerary.destination),
      });
    });

    const farthest = ranked[ranked.length - 1];
    if (ranked.length > recommendedCount && farthest) {
      const travelMinutesToCluster = toMinutes(farthest.distanceMeters);
      recommendations.push({
        option: toLodgingOption(farthest.result),
        verdict: 'notRecommended',
        reason: `관광지와 약 ${travelMinutesToCluster}분 거리로 멀어서, 매일 이동 부담이 클 수 있어요.`,
        travelMinutesToCluster,
        bookingSearchUrls: buildBookingSearchUrls(farthest.result.name, itinerary.destination),
      });
    }

    itinerary.lodgingRecommendations = recommendations;
  } catch (err) {
    logger.warn('lodging recommendation failed', err);
  }
}
