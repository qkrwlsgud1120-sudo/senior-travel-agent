export interface FlightPreferences {
  departureCity?: string;
  arrivalCity?: string;
  preferredDates?: string;
  classPreference?: string;
  numTravelers?: number;
  specialAssistanceNeeds?: string;
}

export interface HotelPreferences {
  areaPreference?: string;
  roomType?: string;
  accessibilityNeeds?: string;
  numNights?: number;
}

export interface TransportPreferences {
  localTransportPreference?: string;
  airportTransferNeeded?: boolean;
}

export interface BookingSummary {
  flight: FlightPreferences;
  hotel: HotelPreferences;
  transport: TransportPreferences;
  notes?: string;
  confirmedAt?: string;
}
