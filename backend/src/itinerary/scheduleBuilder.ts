import type { ItineraryDay } from '@travel-ai/shared';

// Draft dwell-time heuristics (not measured) — same "needs tuning" caveat as the
// walking-budget constants in maps/seniorAdjustment.ts.
const RESTAURANT_CATEGORY_KEYWORDS = ['restaurant', 'food', 'cafe', 'bakery', 'bar', 'meal_takeaway', 'meal_delivery'];
const RESTAURANT_DWELL_MINUTES = 60;
const DEFAULT_DWELL_MINUTES = 90;

function isRestaurantCategory(category?: string): boolean {
  if (!category) return false;
  const lower = category.toLowerCase();
  return RESTAURANT_CATEGORY_KEYWORDS.some((kw) => lower.includes(kw));
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = ((h * 60 + m + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// Computed from real route-segment travel times (already measured via
// enrichItineraryWithRoutes), not guessed by the model — the clock times are
// only as good as those real numbers, but they aren't invented.
export function attachScheduledTimes(day: ItineraryDay, dayStartTime = '09:30'): void {
  let currentTime = dayStartTime;

  day.activities.forEach((activity, index) => {
    if (index > 0) {
      const segment = day.routeSegments?.find(
        (s) => s.fromActivityIndex === index - 1 && s.toActivityIndex === index
      );
      const travelMinutes = segment
        ? segment.mode === 'walking'
          ? segment.seniorAdjustedDurationMinutes
          : segment.baseDurationMinutes
        : 0;
      currentTime = addMinutes(currentTime, travelMinutes);
    }

    const dwellMinutes = isRestaurantCategory(activity.category) ? RESTAURANT_DWELL_MINUTES : DEFAULT_DWELL_MINUTES;
    activity.scheduledTime = currentTime;
    activity.estimatedDwellMinutes = dwellMinutes;
    currentTime = addMinutes(currentTime, dwellMinutes);
  });
}
