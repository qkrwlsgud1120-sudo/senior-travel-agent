import type { Coordinates, TransportMode } from '@travel-ai/shared';
import type { MapProvider, PlaceSearchResult, RouteResult, WalkingRouteResult } from './provider';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { loadMapsCache, saveMapsCache, PersistedCache } from './diskCache';

const EARTH_RADIUS_METERS = 6371000;
const FALLBACK_WALKING_SPEED_KMH = 4.5;
const FETCH_TIMEOUT_MS = 8000;

// Native fetch has no default timeout — a stalled Google Maps response (network
// hiccup, quota throttling that hangs instead of erroring, etc.) would otherwise
// block the request forever. Every call site here already falls back gracefully
// on error, so aborting just routes a hang into that same existing fallback path.
async function fetchWithTimeout(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function haversineDistanceMeters(from: Coordinates, to: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function fallbackWalkingRoute(from: Coordinates, to: Coordinates): WalkingRouteResult {
  const distanceMeters = haversineDistanceMeters(from, to);
  const durationMinutes = Math.ceil((distanceMeters / 1000 / FALLBACK_WALKING_SPEED_KMH) * 60);
  return { distanceMeters, durationMinutes };
}

interface DirectionsLeg {
  distance: { value: number };
  duration: { value: number };
  steps?: Array<{
    travel_mode: string;
    transit_details?: {
      line?: { short_name?: string; name?: string };
      num_stops?: number;
    };
  }>;
}

interface DirectionsResponse {
  status: string;
  routes: Array<{
    legs: DirectionsLeg[];
    overview_polyline?: { points: string };
  }>;
}

interface PlacesResponse {
  status: string;
  results: Array<{
    place_id: string;
    name: string;
    geometry: { location: { lat: number; lng: number } };
    types?: string[];
    rating?: number;
    user_ratings_total?: number;
    formatted_address?: string;
    vicinity?: string;
  }>;
}

function summarizeTransit(leg: DirectionsLeg): string | undefined {
  const transitStep = leg.steps?.find((step) => step.travel_mode === 'TRANSIT' && step.transit_details);
  if (!transitStep?.transit_details) return undefined;
  const line = transitStep.transit_details.line?.short_name ?? transitStep.transit_details.line?.name ?? '대중교통';
  const stops = transitStep.transit_details.num_stops;
  return stops ? `${line} · ${stops}개 정류장` : line;
}

function mapPlaceResult(result: PlacesResponse['results'][number]): PlaceSearchResult {
  return {
    placeId: result.place_id,
    name: result.name,
    coordinates: { lat: result.geometry.location.lat, lng: result.geometry.location.lng },
    category: result.types?.[0],
    rating: result.rating,
    userRatingsTotal: result.user_ratings_total,
    address: result.formatted_address ?? result.vicinity,
  };
}

class GoogleMapsProvider implements MapProvider {
  private diskCache = loadMapsCache();
  private geocodeCache = new PersistedCache<Coordinates | null>(
    this.diskCache.geocode as Record<string, Coordinates | null>,
    () => this.persist()
  );
  private routeCache = new PersistedCache<RouteResult | null>(
    this.diskCache.route as Record<string, RouteResult | null>,
    () => this.persist()
  );
  private placesCache = new PersistedCache<PlaceSearchResult[]>(
    this.diskCache.places as Record<string, PlaceSearchResult[]>,
    () => this.persist()
  );

  private persist(): void {
    saveMapsCache({
      geocode: this.geocodeCache.toRecord(),
      route: this.routeCache.toRecord(),
      places: this.placesCache.toRecord(),
    });
  }

  async geocode(placeName: string, contextHint?: string): Promise<Coordinates | null> {
    if (!env.GOOGLE_MAPS_API_KEY) return null;

    const query = contextHint ? `${placeName}, ${contextHint}` : placeName;
    if (this.geocodeCache.has(query)) {
      return this.geocodeCache.get(query) ?? null;
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address', query);
      url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);

      const res = await fetchWithTimeout(url);
      const data = (await res.json()) as {
        status: string;
        results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
      };

      if (data.status !== 'OK' || data.results.length === 0) {
        this.geocodeCache.set(query, null);
        return null;
      }

      const coordinates: Coordinates = {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      };
      this.geocodeCache.set(query, coordinates);
      return coordinates;
    } catch (err) {
      logger.warn('geocode failed', query, err);
      this.geocodeCache.set(query, null);
      return null;
    }
  }

  async getRoute(from: Coordinates, to: Coordinates, mode: TransportMode): Promise<RouteResult | null> {
    const cacheKey = `${mode}:${from.lat},${from.lng}->${to.lat},${to.lng}`;
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey) ?? null;
    }

    if (!env.GOOGLE_MAPS_API_KEY) {
      const fallback = mode === 'walking' ? fallbackWalkingRoute(from, to) : null;
      this.routeCache.set(cacheKey, fallback);
      return fallback;
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
      url.searchParams.set('origin', `${from.lat},${from.lng}`);
      url.searchParams.set('destination', `${to.lat},${to.lng}`);
      url.searchParams.set('mode', mode);
      url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);

      const res = await fetchWithTimeout(url);
      const data = (await res.json()) as DirectionsResponse;

      if (data.status !== 'OK' || data.routes.length === 0) {
        const fallback = mode === 'walking' ? fallbackWalkingRoute(from, to) : null;
        this.routeCache.set(cacheKey, fallback);
        return fallback;
      }

      const leg = data.routes[0].legs[0];
      const result: RouteResult = {
        distanceMeters: leg.distance.value,
        durationMinutes: Math.ceil(leg.duration.value / 60),
        encodedPolyline: data.routes[0].overview_polyline?.points,
        transitSummary: mode === 'transit' ? summarizeTransit(leg) : undefined,
      };
      this.routeCache.set(cacheKey, result);
      return result;
    } catch (err) {
      logger.warn(`getRoute(${mode}) failed, falling back`, err);
      const fallback = mode === 'walking' ? fallbackWalkingRoute(from, to) : null;
      this.routeCache.set(cacheKey, fallback);
      return fallback;
    }
  }

  async getWalkingRoute(from: Coordinates, to: Coordinates): Promise<WalkingRouteResult | null> {
    return this.getRoute(from, to, 'walking');
  }

  private async textSearch(cacheKeyPrefix: string, query: string, logLabel: string): Promise<PlaceSearchResult[]> {
    if (!env.GOOGLE_MAPS_API_KEY) return [];

    const cacheKey = `${cacheKeyPrefix}:${query}`;
    if (this.placesCache.has(cacheKey)) {
      return this.placesCache.get(cacheKey) ?? [];
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      url.searchParams.set('query', query);
      url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);

      const res = await fetchWithTimeout(url);
      const data = (await res.json()) as PlacesResponse;

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        logger.warn(`${logLabel} non-OK status`, data.status);
      }

      const results = (data.results ?? []).slice(0, 15).map(mapPlaceResult);
      this.placesCache.set(cacheKey, results);
      return results;
    } catch (err) {
      logger.warn(`${logLabel} failed`, query, err);
      this.placesCache.set(cacheKey, []);
      return [];
    }
  }

  async searchTouristSpots(destination: string, styleKeywords?: string): Promise<PlaceSearchResult[]> {
    const query = `${styleKeywords ?? ''} tourist attractions in ${destination}`.trim();
    return this.textSearch('spots', query, 'searchTouristSpots');
  }

  async searchRestaurants(destination: string, styleKeywords?: string): Promise<PlaceSearchResult[]> {
    const query = `${styleKeywords ?? ''} restaurants in ${destination}`.trim();
    return this.textSearch('restaurants', query, 'searchRestaurants');
  }

  async searchLodging(near: Coordinates, destination: string): Promise<PlaceSearchResult[]> {
    if (!env.GOOGLE_MAPS_API_KEY) return [];

    const cacheKey = `lodging:${near.lat},${near.lng}|${destination}`;
    if (this.placesCache.has(cacheKey)) {
      return this.placesCache.get(cacheKey) ?? [];
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      url.searchParams.set('location', `${near.lat},${near.lng}`);
      url.searchParams.set('radius', '1500');
      url.searchParams.set('type', 'lodging');
      url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);

      const res = await fetchWithTimeout(url);
      const data = (await res.json()) as PlacesResponse;

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        logger.warn('searchLodging non-OK status', data.status);
      }

      const results = (data.results ?? []).slice(0, 8).map(mapPlaceResult);
      this.placesCache.set(cacheKey, results);
      return results;
    } catch (err) {
      logger.warn('searchLodging failed', near, err);
      this.placesCache.set(cacheKey, []);
      return [];
    }
  }
}

export const mapProvider: MapProvider = new GoogleMapsProvider();
