import type { Itinerary, RouteSegment, TransportMode } from '@travel-ai/shared';
import type { MapProvider } from './provider';
import {
  deriveMobilityLevel,
  calculateSeniorAdjustedDuration,
  SINGLE_HOP_TRANSIT_THRESHOLD_METERS,
} from './seniorAdjustment';
import { calculateDailyBurden } from '../itinerary/burdenCalculator';
import { logger } from '../utils/logger';

const DRIVING_PREFERENCE_KEYWORDS = ['차', '렌트카', '렌터카', '택시', '차량', '드라이브', 'car', 'taxi', 'drive'];

function preferredLongHopMode(transportPreference: string | undefined): TransportMode {
  if (!transportPreference) return 'transit';
  const lower = transportPreference.toLowerCase();
  return DRIVING_PREFERENCE_KEYWORDS.some((kw) => lower.includes(kw)) ? 'driving' : 'transit';
}

export async function enrichItineraryWithRoutes(itinerary: Itinerary, provider: MapProvider): Promise<void> {
  const mobilityLevel = deriveMobilityLevel(itinerary.constraints);
  const longHopMode = preferredLongHopMode(itinerary.preferences.transportPreference);

  for (const day of itinerary.days) {
    try {
      // Activities grounded in a real Places candidate already carry coordinates
      // (attached upstream from the search_tourist_spots/search_restaurants results)
      // — only fall back to name-based geocoding for the rest, so we don't risk
      // re-resolving a known place to a different location.
      await Promise.all(
        day.activities.map(async (activity) => {
          if (activity.coordinates) return;
          activity.coordinates = (await provider.geocode(activity.name, itinerary.destination)) ?? undefined;
        })
      );

      const segments: RouteSegment[] = [];
      for (let i = 0; i < day.activities.length - 1; i++) {
        const from = day.activities[i].coordinates;
        const to = day.activities[i + 1].coordinates;
        if (!from || !to) continue;

        const walkingRoute = await provider.getRoute(from, to, 'walking');
        if (!walkingRoute) continue;

        let segment: RouteSegment = {
          fromActivityIndex: i,
          toActivityIndex: i + 1,
          mode: 'walking',
          distanceMeters: walkingRoute.distanceMeters,
          baseDurationMinutes: walkingRoute.durationMinutes,
          seniorAdjustedDurationMinutes: calculateSeniorAdjustedDuration(walkingRoute.durationMinutes, mobilityLevel),
          encodedPolyline: walkingRoute.encodedPolyline,
        };

        if (walkingRoute.distanceMeters > SINGLE_HOP_TRANSIT_THRESHOLD_METERS) {
          const altRoute = await provider.getRoute(from, to, longHopMode);
          if (altRoute) {
            segment = {
              fromActivityIndex: i,
              toActivityIndex: i + 1,
              mode: longHopMode,
              distanceMeters: altRoute.distanceMeters,
              baseDurationMinutes: altRoute.durationMinutes,
              seniorAdjustedDurationMinutes: altRoute.durationMinutes,
              encodedPolyline: altRoute.encodedPolyline,
              transitSummary: altRoute.transitSummary,
            };
          }
        }

        segments.push(segment);
      }

      day.routeSegments = segments;
      day.dailyBurdenSummary = calculateDailyBurden(day, segments, mobilityLevel, itinerary.preferences.ageGroup);
    } catch (err) {
      logger.warn(`route enrichment failed for day ${day.dayNumber}`, err);
    }
  }
}
