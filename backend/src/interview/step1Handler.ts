import type { ConversationPhase, QuickChoicePrompt, TravelerProfileSummary } from '@travel-ai/shared';
import type { SessionState } from '../session/store';
import { STEP1_QUESTIONS, type Step1Question } from './step1Questions';
import { computeStep2Profile, mapAnswersToConstraints, type Step1Answers } from './profileAnalysis';

export interface Step1TurnResult {
  assistantText: string;
  phase: ConversationPhase;
  quickChoice?: QuickChoicePrompt;
  travelerProfile?: TravelerProfileSummary;
}

const PROFILE_CONFIRM_OPTIONS = ['네, 맞아요', '다시 답할게요'];
const HANDOFF_TEXT = '좋아요! 이제 어디로 여행 가고 싶으신지 말씀해주세요.';

function matchAnswer(question: Step1Question, message: string): string | string[] | undefined {
  const normalized = message.trim();
  if (!normalized) return undefined;

  if (question.multiSelect) {
    const parts = normalized
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const matched = parts
      .map((part) => {
        const lower = part.toLowerCase();
        return question.options.find(
          (opt) => opt === part || opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase())
        );
      })
      .filter((opt): opt is string => Boolean(opt));
    const unique = [...new Set(matched)];
    return unique.length > 0 ? unique : undefined;
  }

  const exact = question.options.find((opt) => opt === normalized);
  if (exact) return exact;

  const lower = normalized.toLowerCase();
  return question.options.find((opt) => opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase()));
}

function askQuestion(question: Step1Question): Step1TurnResult {
  return {
    assistantText: question.question,
    phase: 'step1_interview',
    quickChoice: { question: question.question, options: question.options, multiSelect: question.multiSelect },
  };
}

function buildProfileText(): string {
  // Full breakdown is rendered by the TravelerProfileSummaryCard on the frontend —
  // keep this lead-in short so the two don't repeat the same numbers twice.
  return '여행 성향을 분석했어요. 아래 내용이 맞는지 확인해주세요.';
}

function seedClaudeHistoryWithProfile(session: SessionState, answers: Step1Answers): void {
  const summaryLines = [
    `연령대: ${answers.ageGroup ?? '미상'}`,
    `하루 보행 가능 시간: ${answers.walkingHours ?? '미상'}`,
    `선호 스타일: ${(answers.style ?? []).join(', ') || '미상'}`,
    `여행 강도: ${answers.pace ?? '미상'}`,
    `자유시간 필요도: ${answers.freeTime ?? '미상'}`,
    `숙소 이동 허용: ${answers.lodgingChange ?? '미상'}`,
    `하루 일정 마무리 희망 시각: ${answers.dayEndTime ?? '미상'}`,
  ];

  session.claudeHistory.push({
    role: 'user',
    content: `[인터뷰 답변]\n${summaryLines.join('\n')}`,
  });
  session.claudeHistory.push({ role: 'assistant', content: HANDOFF_TEXT });
}

function handleQuestionAnswer(session: SessionState, message: string): Step1TurnResult {
  if (session.step1QuestionIndex === -1) {
    session.step1QuestionIndex = 0;
    return askQuestion(STEP1_QUESTIONS[0]);
  }

  const question = STEP1_QUESTIONS[session.step1QuestionIndex];
  const matched = matchAnswer(question, message);

  if (matched === undefined) {
    return {
      assistantText: `${question.question}\n\n다시 한번 골라주세요.`,
      phase: 'step1_interview',
      quickChoice: { question: question.question, options: question.options, multiSelect: question.multiSelect },
    };
  }

  (session.step1Answers as Record<string, string | string[]>)[question.key] = matched;
  const nextIndex = session.step1QuestionIndex + 1;

  if (nextIndex < STEP1_QUESTIONS.length) {
    session.step1QuestionIndex = nextIndex;
    return askQuestion(STEP1_QUESTIONS[nextIndex]);
  }

  const profile = computeStep2Profile(session.step1Answers as Step1Answers);
  session.phase = 'step2_profile_review';
  return {
    assistantText: buildProfileText(),
    phase: session.phase,
    travelerProfile: profile,
    quickChoice: { question: '이 내용이 맞으세요?', options: PROFILE_CONFIRM_OPTIONS, multiSelect: false },
  };
}

function handleProfileConfirmation(session: SessionState, message: string): Step1TurnResult {
  const normalized = message.trim();
  const isRedo = normalized.includes('다시');

  if (isRedo) {
    session.step1Answers = {};
    session.step1QuestionIndex = -1;
    session.phase = 'step1_interview';
    return handleQuestionAnswer(session, message);
  }

  const { constraints, preferences } = mapAnswersToConstraints(session.step1Answers as Step1Answers);
  session.step1Constraints = constraints;
  session.step1Preferences = preferences;
  seedClaudeHistoryWithProfile(session, session.step1Answers as Step1Answers);
  session.phase = 'gathering';

  return { assistantText: HANDOFF_TEXT, phase: session.phase };
}

export function handleInterviewTurn(session: SessionState, message: string): Step1TurnResult {
  if (session.phase === 'step2_profile_review') {
    return handleProfileConfirmation(session, message);
  }
  return handleQuestionAnswer(session, message);
}
