import type { MobilityConstraint, TravelerConstraints, TravelerPreferences, TravelerProfileSummary } from '@travel-ai/shared';

export interface Step1Answers {
  ageGroup?: string;
  walkingHours?: string;
  style?: string[];
  pace?: string;
  freeTime?: string;
  lodgingChange?: string;
}

const AGE_GROUP_MAP: Record<string, TravelerPreferences['ageGroup']> = {
  '50대': '50s',
  '60대': '60s',
  '70대 이상': '70sPlus',
};

const PACE_MAP: Record<string, TravelerPreferences['pacePreference']> = {
  '매우 편한 여행': 'relaxed',
  '적당한 여행': 'moderate',
  '많이 관광하는 여행': 'packed',
};

const FREE_TIME_MAP: Record<string, TravelerPreferences['freeTimeImportance']> = {
  많음: 'high',
  보통: 'medium',
  상관없음: 'low',
};

const LODGING_CHANGE_MAP: Record<string, TravelerPreferences['lodgingChangeTolerance']> = {
  '옮기고 싶지 않아요': 'none',
  '한 번은 괜찮아요': 'upToTwo',
  '상관없어요': 'noPreference',
};

// Draft heuristics, not a medical guideline — needs tuning against real usage,
// same caveat as DAILY_WALKING_BUDGET_METERS in maps/seniorAdjustment.ts.
const FITNESS_GUIDELINE_MAP: Record<string, string> = {
  '1~2시간': '하루 4,000보 이하 추천',
  '3~4시간': '하루 7,000보 이하 추천',
  상관없음: '보행 제한 없음',
};

const MOBILITY_SEVERITY_MAP: Record<string, MobilityConstraint['severity']> = {
  '1~2시간': 'significant',
  '3~4시간': 'moderate',
  상관없음: 'mild',
};

const PACE_LABEL_MAP: Record<string, string> = {
  relaxed: '느긋한 일정',
  moderate: '무난한 일정',
  packed: '알찬 일정',
};

const FREE_TIME_LABEL_MAP: Record<string, string> = {
  high: '자유시간 중요',
  medium: '적당한 자유시간',
  low: '자유시간 상관없음',
};

const AI_RECOMMENDATION_MAP: Record<string, string> = {
  relaxed: '패키지 여행보다 자유시간이 많은 맞춤형 여행을 추천드립니다.',
  moderate: '휴식과 관광의 균형을 맞춘 여행을 추천드립니다.',
  packed: '알차게 둘러보는 활동적인 여행을 추천드립니다.',
};

export function computeStep2Profile(answers: Step1Answers): TravelerProfileSummary {
  const styles = answers.style ?? [];
  const percentage = styles.length > 0 ? Math.round(100 / styles.length) : 0;
  const styleBreakdown = styles.map((style) => ({ style, percentage }));

  const paceKey = (answers.pace && PACE_MAP[answers.pace]) || 'moderate';

  return {
    styleBreakdown,
    fitnessGuideline: (answers.walkingHours && FITNESS_GUIDELINE_MAP[answers.walkingHours]) || '보행 제한 없음',
    travelPreferenceSummary: `${PACE_LABEL_MAP[paceKey]} / ${
      (answers.freeTime && FREE_TIME_LABEL_MAP[FREE_TIME_MAP[answers.freeTime] ?? 'medium']) || '적당한 자유시간'
    }`,
    aiRecommendation: AI_RECOMMENDATION_MAP[paceKey],
  };
}

export function mapAnswersToConstraints(answers: Step1Answers): {
  constraints: Partial<TravelerConstraints>;
  preferences: Partial<TravelerPreferences>;
} {
  const mobility: MobilityConstraint[] = [];
  if (answers.walkingHours) {
    mobility.push({
      description: `하루 보행 가능 시간: ${answers.walkingHours}`,
      severity: MOBILITY_SEVERITY_MAP[answers.walkingHours],
    });
  }

  return {
    constraints: {
      mobility,
      healthConsiderations: [],
    },
    preferences: {
      style: answers.style?.join(', '),
      ageGroup: answers.ageGroup ? AGE_GROUP_MAP[answers.ageGroup] : undefined,
      pacePreference: answers.pace ? PACE_MAP[answers.pace] : undefined,
      freeTimeImportance: answers.freeTime ? FREE_TIME_MAP[answers.freeTime] : undefined,
      lodgingChangeTolerance: answers.lodgingChange ? LODGING_CHANGE_MAP[answers.lodgingChange] : undefined,
    },
  };
}
