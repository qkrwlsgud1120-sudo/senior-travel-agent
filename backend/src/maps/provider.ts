import type { Coordinates, TransportMode } from '@travel-ai/shared';

export interface WalkingRouteResult {
  distanceMeters: number;
  durationMinutes: number;
  encodedPolyline?: string;
}

export interface RouteResult {
  distanceMeters: number;
  durationMinutes: number;
  encodedPolyline?: string;
  transitSummary?: string;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  coordinates: Coordinates;
  category?: string;
  rating?: number;
  userRatingsTotal?: number;
  address?: string;
}

export interface MapProvider {
  geocode(placeName: string, contextHint?: string): Promise<Coordinates | null>;
  getWalkingRoute(from: Coordinates, to: Coordinates): Promise<WalkingRouteResult | null>;
  getRoute(from: Coordinates, to: Coordinates, mode: TransportMode): Promise<RouteResult | null>;
  searchTouristSpots(destination: string, styleKeywords?: string): Promise<PlaceSearchResult[]>;
  searchRestaurants(destination: string, styleKeywords?: string): Promise<PlaceSearchResult[]>;
  searchLodging(near: Coordinates, destination: string): Promise<PlaceSearchResult[]>;
}
