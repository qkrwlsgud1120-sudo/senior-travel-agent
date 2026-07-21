import type { TravelerConstraints } from '@travel-ai/shared';

export type MobilityLevel = 'minimal' | 'moderate' | 'significant';

const ADULT_WALKING_SPEED_KMH = 4.5;

const SENIOR_WALKING_SPEED_KMH: Record<MobilityLevel, number> = {
  minimal: 3.2,
  moderate: 2.5,
  significant: 1.8,
};

const REST_BUFFER_MINUTES: Record<MobilityLevel, number> = {
  minimal: 0,
  moderate: 3,
  significant: 7,
};

const SEVERITY_RANK: Record<'mild' | 'moderate' | 'significant', number> = {
  mild: 0,
  moderate: 1,
  significant: 2,
};

const SEVERITY_TO_LEVEL: Record<'mild' | 'moderate' | 'significant', MobilityLevel> = {
  mild: 'minimal',
  moderate: 'moderate',
  significant: 'significant',
};

export function deriveMobilityLevel(constraints: TravelerConstraints): MobilityLevel {
  let mostSevere: 'mild' | 'moderate' | 'significant' | undefined;
  for (const constraint of constraints.mobility) {
    if (!constraint.severity) continue;
    if (!mostSevere || SEVERITY_RANK[constraint.severity] > SEVERITY_RANK[mostSevere]) {
      mostSevere = constraint.severity;
    }
  }
  return mostSevere ? SEVERITY_TO_LEVEL[mostSevere] : 'minimal';
}

export function calculateSeniorAdjustedDuration(
  baseDurationMinutes: number,
  mobilityLevel: MobilityLevel
): number {
  const speedRatio = ADULT_WALKING_SPEED_KMH / SENIOR_WALKING_SPEED_KMH[mobilityLevel];
  const adjusted = baseDurationMinutes * speedRatio;
  return Math.ceil(adjusted + REST_BUFFER_MINUTES[mobilityLevel]);
}

// Draft thresholds — not clinically derived, needs tuning against real usage.
// Bumped up from an initial, too-tight draft (2.5km/moderate) that left Claude no
// room to pick more than one real nearby attraction per day and made it duplicate
// the same place across time slots instead.
export const DAILY_WALKING_BUDGET_METERS: Record<MobilityLevel, number> = {
  minimal: 6000,
  moderate: 4000,
  significant: 2000,
};

// Single-hop walking distance above which we try to offer a transit alternative (Goal 4).
export const SINGLE_HOP_TRANSIT_THRESHOLD_METERS = 1200;
