export interface Step1Question {
  key: 'ageGroup' | 'walkingHours' | 'style' | 'pace' | 'freeTime' | 'lodgingChange';
  question: string;
  options: string[];
  multiSelect: boolean;
}

export const STEP1_QUESTIONS: Step1Question[] = [
  {
    key: 'ageGroup',
    question: '연세가 어떻게 되세요?',
    options: ['50대', '60대', '70대 이상'],
    multiSelect: false,
  },
  {
    key: 'walkingHours',
    question: '하루 몇 시간 정도 걸으실 수 있나요?',
    options: ['1~2시간', '3~4시간', '상관없음'],
    multiSelect: false,
  },
  {
    key: 'style',
    question: '어떤 여행을 좋아하세요? (여러 개 골라도 돼요)',
    options: ['자연', '역사', '쇼핑', '맛집', '공연', '야경'],
    multiSelect: true,
  },
  {
    key: 'pace',
    question: '패키지 여행처럼 편한 여행을 원하세요?',
    options: ['매우 편한 여행', '적당한 여행', '많이 관광하는 여행'],
    multiSelect: false,
  },
  {
    key: 'freeTime',
    question: '자유시간은 얼마나 필요하세요?',
    options: ['많음', '보통', '상관없음'],
    multiSelect: false,
  },
  {
    key: 'lodgingChange',
    question: '숙소를 옮기는 것도 괜찮으세요?',
    options: ['옮기고 싶지 않아요', '한 번은 괜찮아요', '상관없어요'],
    multiSelect: false,
  },
];
