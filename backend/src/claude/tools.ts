import type Anthropic from '@anthropic-ai/sdk';

export const SEARCH_TOURIST_SPOTS_TOOL: Anthropic.Tool = {
  name: 'search_tourist_spots',
  description:
    '목적지 기준으로 실제 관광지 후보를 검색합니다. 일정을 제안하기 전에 먼저 이 도구로 ' +
    '후보를 조사하세요. 결과가 나오면 그 안에서만 활동을 고르세요. 목적지 표기를 바꿔가며 ' +
    '재시도했는데도 계속 결과가 없다면, 검색 도구를 쓸 수 없는 상황으로 보고 알고 있는 지식으로 ' +
    '제안해도 됩니다 (단, 사용자에게 실시간 확인은 못 했다고 알릴 것).',
  input_schema: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: '목적지 지역명 (예: "밴쿠버, 캐나다")' },
      styleKeywords: {
        type: 'array',
        items: { type: 'string' },
        description: '사용자가 말한 여행 취향 키워드 (예: ["자연", "조용한 곳"])',
      },
    },
    required: ['destination'],
  },
};

export const SEARCH_RESTAURANTS_TOOL: Anthropic.Tool = {
  name: 'search_restaurants',
  description:
    '목적지 기준으로 실제 식당 후보를 검색합니다. 일정에 점심/저녁 식사 활동을 넣기 전에 ' +
    '이 도구로 먼저 후보를 조사하세요. 결과가 나오면 그 안에서만 골라 활동으로 포함하세요.',
  input_schema: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: '목적지 지역명 (예: "밴쿠버, 캐나다")' },
      styleKeywords: {
        type: 'array',
        items: { type: 'string' },
        description: '사용자가 말한 음식/분위기 취향 키워드 (예: ["조용한", "현지 음식"])',
      },
    },
    required: ['destination'],
  },
};

export const PROPOSE_ITINERARY_TOOL: Anthropic.Tool = {
  name: 'propose_itinerary',
  description:
    '사용자와의 대화에서 파악한 이동/건강 제약과 여행 선호를 바탕으로 여행 일정을 제안합니다. ' +
    '일정의 모든 활동에는 그 활동이 왜 사용자에게 맞는지 근거(rationale)를 반드시 포함해야 합니다.',
  input_schema: {
    type: 'object',
    properties: {
      constraints: {
        type: 'object',
        description: '사용자가 말한 이동/건강 관련 제약',
        properties: {
          mobility: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: '예: 무릎이 안 좋아서 많이 걷기 힘듦' },
                severity: { type: 'string', enum: ['mild', 'moderate', 'significant'] },
              },
              required: ['description'],
            },
          },
          healthConsiderations: {
            type: 'array',
            items: { type: 'string' },
          },
          otherNotes: { type: 'string' },
        },
        required: ['mobility', 'healthConsiderations'],
      },
      preferences: {
        type: 'object',
        description: '사용자의 여행 선호',
        properties: {
          style: { type: 'string', description: '예: 온천, 자연, 조용한 여행' },
          budgetLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
          budgetNotes: { type: 'string' },
          tripLengthDays: { type: 'number' },
          destinationHint: { type: 'string' },
          travelDates: { type: 'string' },
          transportPreference: {
            type: 'string',
            description: '선호 이동수단 (예: 렌트카, 기차, 대중교통, 택시, 도보)',
          },
          lodgingChangeTolerance: {
            type: 'string',
            enum: ['none', 'upToTwo', 'noPreference'],
            description: '숙소 이동 허용 범위: none=이동 없이 한 곳, upToTwo=2번까지 가능, noPreference=상관없음',
          },
        },
      },
      itinerary: {
        type: 'object',
        description: '제안하는 일정 상세',
        properties: {
          title: { type: 'string' },
          destination: { type: 'string' },
          durationDays: { type: 'number' },
          overallRationale: {
            type: 'string',
            description: '이 일정 전체가 사용자의 제약/선호에 왜 맞는지에 대한 요약 설명',
          },
          days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dayNumber: { type: 'number' },
                theme: { type: 'string' },
                activities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      timeOfDay: { type: 'string', enum: ['morning', 'afternoon', 'evening'] },
                      name: {
                        type: 'string',
                        description: '관광지뿐 아니라 점심/저녁 식당도 활동으로 넣을 수 있습니다.',
                      },
                      description: { type: 'string', description: '1~2문장으로 간결하게' },
                      rationale: {
                        type: 'string',
                        description: '이 활동이 사용자의 어떤 제약/선호와 연결되는지, 1~2문장으로 간결하게 설명',
                      },
                      walkingLevel: { type: 'string', enum: ['minimal', 'moderate', 'significant'] },
                      placeId: {
                        type: 'string',
                        description:
                          'search_tourist_spots 또는 search_restaurants 결과에 있는 후보의 placeId를 ' +
                          '그대로 사용하세요. 후보 목록에 없는 장소를 지어내지 마세요.',
                      },
                      accessibility: {
                        type: 'object',
                        description:
                          '확실히 알 수 있는 접근성 정보만 채우세요. 모르면 필드를 생략하고 추측하지 마세요.',
                        properties: {
                          hasElevator: { type: 'boolean' },
                          stairsCount: { type: 'number', description: '0이면 계단 없음' },
                          hasRestArea: { type: 'boolean', description: '벤치 등 휴식 공간 여부' },
                          hasShade: { type: 'boolean', description: '그늘/실내 대기 공간 여부' },
                          restroomNearby: { type: 'boolean' },
                          notes: { type: 'string' },
                        },
                      },
                    },
                    required: ['timeOfDay', 'name', 'description', 'rationale', 'walkingLevel'],
                  },
                },
              },
              required: ['dayNumber', 'activities'],
            },
          },
        },
        required: ['title', 'destination', 'durationDays', 'overallRationale', 'days'],
      },
    },
    required: ['constraints', 'preferences', 'itinerary'],
  },
};

export const COLLECT_BOOKING_INFO_TOOL: Anthropic.Tool = {
  name: 'collect_booking_info',
  description:
    '대화를 통해 파악한 항공/숙소/교통 예약 관련 정보를 정리된 초안 형태로 제시합니다. ' +
    '실제 예약이나 결제는 하지 않으며, 이 도구는 사용자에게 보여줄 초안만 만듭니다. ' +
    '최종 확정은 화면의 확인 버튼을 통해서만 이루어집니다.',
  input_schema: {
    type: 'object',
    properties: {
      flight: {
        type: 'object',
        properties: {
          departureCity: { type: 'string' },
          arrivalCity: { type: 'string' },
          preferredDates: { type: 'string' },
          classPreference: { type: 'string' },
          numTravelers: { type: 'number' },
          specialAssistanceNeeds: { type: 'string' },
        },
      },
      hotel: {
        type: 'object',
        properties: {
          areaPreference: { type: 'string' },
          roomType: { type: 'string' },
          accessibilityNeeds: { type: 'string' },
          numNights: { type: 'number' },
        },
      },
      transport: {
        type: 'object',
        properties: {
          localTransportPreference: { type: 'string' },
          airportTransferNeeded: { type: 'boolean' },
        },
      },
      notes: { type: 'string' },
    },
    required: ['flight', 'hotel', 'transport'],
  },
};
