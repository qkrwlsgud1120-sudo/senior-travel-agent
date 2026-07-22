export interface MobilityConstraint {
  description: string;
  severity?: 'mild' | 'moderate' | 'significant';
}

export interface TravelerConstraints {
  mobility: MobilityConstraint[];
  healthConsiderations: string[];
  otherNotes?: string;
}

export interface TravelerPreferences {
  style?: string;
  budgetLevel?: 'low' | 'medium' | 'high';
  budgetNotes?: string;
  tripLengthDays?: number;
  destinationHint?: string;
  travelDates?: string;
  transportPreference?: string;
  lodgingChangeTolerance?: 'none' | 'upToTwo' | 'noPreference';
  ageGroup?: '50s' | '60s' | '70sPlus';
  pacePreference?: 'relaxed' | 'moderate' | 'packed';
  freeTimeImportance?: 'high' | 'medium' | 'low';
  dayEndTime?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AccessibilityInfo {
  hasElevator?: boolean;
  stairsCount?: number;
  hasRestArea?: boolean;
  hasShade?: boolean;
  restroomNearby?: boolean;
  notes?: string;
}

export interface RestaurantCandidate {
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  placeId?: string;
}

export interface ItineraryActivity {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  name: string;
  description: string;
  rationale: string;
  walkingLevel: 'minimal' | 'moderate' | 'significant';
  accessibility?: AccessibilityInfo;
  coordinates?: Coordinates;
  placeId?: string;
  rating?: number;
  userRatingsTotal?: number;
  category?: string;
  scheduledTime?: string;
  estimatedDwellMinutes?: number;
  // Present when this slot is a meal — a ranked list of nearby restaurant
  // options (still within the day's walking budget) instead of one specific
  // pick, since a single named restaurant overstates certainty the search
  // data doesn't support.
  restaurantCandidates?: RestaurantCandidate[];
}

export type TransportMode = 'walking' | 'transit' | 'driving';

export interface RouteSegment {
  fromActivityIndex: number;
  toActivityIndex: number;
  mode: TransportMode;
  distanceMeters: number;
  baseDurationMinutes: number;
  seniorAdjustedDurationMinutes: number;
  encodedPolyline?: string;
  transitSummary?: string;
}

export interface DailyBurdenSummary {
  totalDistanceMeters: number;
  totalSeniorAdjustedMinutes: number;
  activityCount: number;
  burdenLevel: 'low' | 'medium' | 'high';
  mobilityScore: number;
  walkingDistanceScore: number;
  stairsScore: number;
  restScore: number;
  interpretation: string;
  notRecommended: boolean;
  alternativeSuggestion?: string;
}

export interface LodgingOption {
  placeId: string;
  name: string;
  coordinates: Coordinates;
  rating?: number;
  address?: string;
}

export interface LodgingRecommendation {
  option: LodgingOption;
  verdict: 'recommended' | 'notRecommended';
  reason: string;
  travelMinutesToCluster: number;
  bookingSearchUrls: { agoda: string; hotelsCom: string };
}

export interface ItineraryDay {
  dayNumber: number;
  theme?: string;
  activities: ItineraryActivity[];
  routeSegments?: RouteSegment[];
  dailyBurdenSummary?: DailyBurdenSummary;
}

export interface Itinerary {
  title: string;
  destination: string;
  durationDays: number;
  days: ItineraryDay[];
  overallRationale: string;
  constraints: TravelerConstraints;
  preferences: TravelerPreferences;
  lodgingRecommendations?: LodgingRecommendation[];
}
