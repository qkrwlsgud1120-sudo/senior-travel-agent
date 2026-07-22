import type Anthropic from '@anthropic-ai/sdk';
import type { ConversationPhase, Itinerary, BookingSummary } from '@travel-ai/shared';
import { anthropic } from './client';
import { env } from '../config/env';
import { buildSystemPrompt } from './systemPrompt';
import {
  SEARCH_TOURIST_SPOTS_TOOL,
  SEARCH_RESTAURANTS_TOOL,
  PROPOSE_ITINERARY_TOOL,
  COLLECT_BOOKING_INFO_TOOL,
} from './tools';
import type { SessionState } from '../session/store';
import { mapProvider } from '../maps/googleMapsProvider';
import type { PlaceSearchResult } from '../maps/provider';
import { enrichItineraryWithRoutes } from '../maps/routeEnrichment';
import { deriveMobilityLevel, DAILY_WALKING_BUDGET_METERS } from '../maps/seniorAdjustment';
import { attachLodgingOptions } from '../itinerary/lodgingRecommender';
import { attachScheduledTimes } from '../itinerary/scheduleBuilder';
import { attachRestaurantCandidates } from '../itinerary/restaurantCandidates';
import { logger } from '../utils/logger';

// Tried lowering this to 4 to cut retry cost, but a max_tokens-truncated
// propose_itinerary call on the (now-last) iteration left no room left to
// retry, so the turn ended with no itinerary proposed at all — worse than an
// over-budget-but-usable one. Keeping 5: the cost saving from the tighter
// system-prompt guidance (fewer activities/day, shorter rationale) below is
// safer than trimming this margin.
const MAX_TOOL_ITERATIONS = 5;

export interface AgentTurnResult {
  assistantText: string;
  itinerary?: Itinerary;
  bookingSummaryDraft?: BookingSummary;
}

function toolsForPhase(phase: ConversationPhase): Anthropic.Tool[] {
  switch (phase) {
    case 'gathering':
    case 'itinerary_proposed':
      return [SEARCH_TOURIST_SPOTS_TOOL, SEARCH_RESTAURANTS_TOOL, PROPOSE_ITINERARY_TOOL];
    case 'itinerary_agreed':
      return [COLLECT_BOOKING_INFO_TOOL];
    default:
      return [];
  }
}

function extractText(content: Anthropic.ContentBlock[]): string {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}

interface ProposeItineraryInput {
  constraints: Itinerary['constraints'];
  preferences: Itinerary['preferences'];
  itinerary: Omit<Itinerary, 'constraints' | 'preferences'>;
}

type CollectBookingInfoInput = Omit<BookingSummary, 'confirmedAt'>;

interface SearchToolInput {
  destination: string;
  styleKeywords?: string[];
}

interface ToolResultParam {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

// Despite the prompt asking Claude not to repeat the same place twice in one day,
// it sometimes still fills a light-budget day by listing the same spot for both a
// morning and afternoon slot. Collapsing those here (keep first occurrence) is a
// harder guarantee than prompting alone, and keeps the map/lodging pass from doing
// pointless work on a duplicate point.
function dedupeSameDayActivities(itinerary: Itinerary): void {
  for (const day of itinerary.days) {
    const seen = new Set<string>();
    day.activities = day.activities.filter((activity) => {
      const key = activity.placeId ?? activity.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// Activities grounded via placeId inherit their real coordinates/rating from the
// search_tourist_spots results, instead of relying on Claude-invented data or a
// name-based re-geocode that could resolve to the wrong place.
function attachCandidateData(itinerary: Itinerary, candidates: PlaceSearchResult[]): void {
  const byId = new Map(candidates.map((c) => [c.placeId, c]));
  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (!activity.placeId) continue;
      const candidate = byId.get(activity.placeId);
      if (!candidate) continue;
      activity.coordinates = candidate.coordinates;
      activity.rating = candidate.rating;
      activity.userRatingsTotal = candidate.userRatingsTotal;
      activity.category = candidate.category;
    }
  }
}

// The system prompt is identical for every call within a phase (and across many
// sessions), so caching it lets repeated calls in the same 5-iteration loop — and
// later turns in the same session — skip re-billing it at full price.
function cacheableSystem(phase: ConversationPhase): Anthropic.TextBlockParam[] {
  return [{ type: 'text', text: buildSystemPrompt(phase), cache_control: { type: 'ephemeral' } }];
}

// Claude's API is stateless, so the full conversation is resent on every call —
// including every iteration of the same tool-use loop. Marking the last block of
// the last message as a cache breakpoint lets each subsequent call in the loop
// (and each later turn) read the already-billed prefix from cache instead of
// paying full price for it again. Does not mutate session.claudeHistory itself —
// the breakpoint is only added to the copy sent for this one request.
function withCacheBreakpoint(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (messages.length === 0) return messages;
  const lastIndex = messages.length - 1;
  const last = messages[lastIndex];
  const blocks = typeof last.content === 'string' ? [{ type: 'text' as const, text: last.content }] : [...last.content];
  if (blocks.length === 0) return messages;

  // cache_control isn't a permitted field on thinking/redacted_thinking blocks.
  // Claude Sonnet 5 runs adaptive thinking by default even though we never set
  // `thinking` ourselves, so a thinking block can legitimately be the last
  // block of a history entry — tagging it crashed every call afterward with
  // "Extra inputs are not permitted". Walk backward to the last block that can
  // actually carry a cache breakpoint; if the whole message is thinking blocks
  // (rare), skip caching for just this one call instead of sending a bad request.
  let cacheableIndex = -1;
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].type !== 'thinking' && blocks[i].type !== 'redacted_thinking') {
      cacheableIndex = i;
      break;
    }
  }
  if (cacheableIndex === -1) return messages;

  blocks[cacheableIndex] = {
    ...blocks[cacheableIndex],
    cache_control: { type: 'ephemeral' },
  } as Anthropic.ContentBlockParam;

  return [...messages.slice(0, lastIndex), { ...last, content: blocks }];
}

// A response can be cut off by max_tokens right after a thinking block,
// before any text/tool_use follows. The API rejects any future request whose
// history includes an assistant message ending in a thinking block ("The
// final block in an assistant message cannot be `thinking`"), so strip
// trailing thinking blocks before persisting a turn into history. If that
// empties the message entirely (the whole truncated response was thinking),
// substitute a minimal placeholder rather than store an empty content array.
function sanitizeForHistory(content: Anthropic.ContentBlock[]): Anthropic.ContentBlock[] {
  const trimmed = [...content];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1].type === 'thinking') {
    trimmed.pop();
  }
  if (trimmed.length === 0) {
    return [{ type: 'text', text: '...' } as Anthropic.ContentBlock];
  }
  return trimmed;
}

function logUsage(usage: Anthropic.Usage): void {
  logger.info(
    `claude usage — input:${usage.input_tokens} output:${usage.output_tokens} ` +
      `cacheWrite:${usage.cache_creation_input_tokens ?? 0} cacheRead:${usage.cache_read_input_tokens ?? 0}`
  );
}

// STEP1 interview answers are structured and always-known-correct, so they act
// as defaults that fill any gap Claude's own (conversationally-extracted)
// constraints/preferences left empty — Claude's own values still win when set,
// since they may be more specific or gathered later in the conversation.
function applyStep1Defaults(itinerary: Itinerary, session: SessionState): void {
  if (session.step1Preferences) {
    itinerary.preferences = { ...session.step1Preferences, ...itinerary.preferences };
  }
  if (session.step1Constraints?.mobility?.length) {
    const existingDescriptions = new Set(itinerary.constraints.mobility.map((m) => m.description));
    const merged = session.step1Constraints.mobility.filter((m) => !existingDescriptions.has(m.description));
    itinerary.constraints.mobility = [...merged, ...itinerary.constraints.mobility];
  }
}

export async function runAgentTurn(session: SessionState): Promise<AgentTurnResult> {
  let itinerary: Itinerary | undefined;
  let bookingSummaryDraft: BookingSummary | undefined;
  // Accumulates across every search_tourist_spots/search_restaurants call in this
  // turn (keyed by placeId) so a later propose_itinerary can still reference spots
  // found in an earlier iteration, even after a different search tool ran since.
  const knownCandidates = new Map<string, PlaceSearchResult>();
  // category (Google's types[0]) is too unreliable to detect "is this a
  // restaurant" — Google often returns a generic type like "establishment"
  // first even for restaurants. Tracking by which search tool actually
  // produced the placeId is exact.
  const restaurantPlaceIds = new Set<string>();
  let finalText: string | undefined;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const tools = toolsForPhase(session.phase);

    const response = await anthropic.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 8192,
      system: cacheableSystem(session.phase),
      tools: tools.length > 0 ? tools : undefined,
      messages: withCacheBreakpoint(session.claudeHistory),
    });
    logUsage(response.usage);

    session.claudeHistory.push({ role: 'assistant', content: sanitizeForHistory(response.content) });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0) {
      finalText = extractText(response.content);
      break;
    }

    const resultsById = new Map<string, string>();
    let proposeHandled = false;
    let bookingHandled = false;

    // Pass 1: resolve research calls first so a proposal in the same turn can use fresh candidates.
    for (const block of toolUseBlocks) {
      if (block.name !== 'search_tourist_spots' && block.name !== 'search_restaurants') continue;
      const input = block.input as SearchToolInput;
      const results =
        block.name === 'search_tourist_spots'
          ? await mapProvider.searchTouristSpots(input.destination, input.styleKeywords?.join(' '))
          : await mapProvider.searchRestaurants(input.destination, input.styleKeywords?.join(' '));

      for (const result of results) {
        knownCandidates.set(result.placeId, result);
        if (block.name === 'search_restaurants') restaurantPlaceIds.add(result.placeId);
      }

      // Claude only needs enough to pick and reason about a place — placeId to
      // reference it, and name/category/rating/coordinates to judge fit and
      // clustering. `address` and `userRatingsTotal` are never used in Claude's
      // decision; the backend re-attaches the full PlaceSearchResult (from
      // knownCandidates, kept in full above) after propose_itinerary picks a
      // placeId, so trimming what's sent here doesn't lose that data.
      const claudeFacingResults = results.map(
        ({ placeId, name, category, rating, coordinates }) => ({ placeId, name, category, rating, coordinates })
      );

      resultsById.set(
        block.id,
        results.length > 0
          ? JSON.stringify(claudeFacingResults)
          : '검색 결과가 없습니다. 목적지 표기를 다르게 해서 다시 시도하거나, 사용자에게 더 구체적인 지역을 물어보세요.'
      );
    }

    // Pass 2: everything else (propose_itinerary, collect_booking_info, duplicates).
    for (const block of toolUseBlocks) {
      if (block.name === 'search_tourist_spots' || block.name === 'search_restaurants') continue;

      if (block.name === 'propose_itinerary' && !proposeHandled) {
        proposeHandled = true;
        try {
          const input = block.input as ProposeItineraryInput;
          if (!input?.itinerary || !Array.isArray(input.itinerary.days) || input.itinerary.days.length === 0) {
            throw new Error('malformed propose_itinerary input: itinerary.days missing or not an array');
          }

          const candidateItinerary: Itinerary = {
            ...input.itinerary,
            constraints: input.constraints,
            preferences: input.preferences,
          };

          applyStep1Defaults(candidateItinerary, session);
          attachCandidateData(candidateItinerary, [...knownCandidates.values()]);
          dedupeSameDayActivities(candidateItinerary);
          await enrichItineraryWithRoutes(candidateItinerary, mapProvider);

          const mobilityLevel = deriveMobilityLevel(candidateItinerary.constraints);
          const overBudgetDays = candidateItinerary.days.filter(
            (day) => (day.dailyBurdenSummary?.totalDistanceMeters ?? 0) > DAILY_WALKING_BUDGET_METERS[mobilityLevel]
          );

          // SKIP_BUDGET_VALIDATION (dev-only) accepts the first attempt as-is,
          // skipping the retry loop that's the single biggest cost driver per
          // turn. dailyBurdenSummary is still computed honestly either way —
          // this only skips asking Claude to regenerate, not the scoring itself.
          if (!env.SKIP_BUDGET_VALIDATION && overBudgetDays.length > 0 && iteration < MAX_TOOL_ITERATIONS - 1) {
            const detail = overBudgetDays
              .map((day) => {
                const km = ((day.dailyBurdenSummary?.totalDistanceMeters ?? 0) / 1000).toFixed(1);
                const budgetKm = (DAILY_WALKING_BUDGET_METERS[mobilityLevel] / 1000).toFixed(1);
                return `${day.dayNumber}일차: 약 ${km}km (예산 ${budgetKm}km)`;
              })
              .join(', ');
            resultsById.set(
              block.id,
              `일부 날짜가 도보 예산을 초과했습니다: ${detail}. 활동 수를 줄이거나 지리적으로 가까운 곳끼리 묶어서 ` +
                '지금 바로 propose_itinerary를 다시 호출하세요. 사용자에게 설명하는 텍스트로 먼저 답하지 말고, 곧바로 도구를 다시 호출하세요.'
            );
            continue;
          }

          attachRestaurantCandidates(candidateItinerary, restaurantPlaceIds, knownCandidates);
          candidateItinerary.days.forEach((day) => attachScheduledTimes(day));
          await attachLodgingOptions(candidateItinerary, mapProvider);
          itinerary = candidateItinerary;
          session.latestItinerary = itinerary;
          session.phase = 'itinerary_proposed';
          resultsById.set(block.id, '일정 제안이 사용자에게 카드로 표시되었습니다. 짧은 안내 문장으로 이어가세요.');
        } catch (err) {
          logger.warn('propose_itinerary handling failed', err);
          resultsById.set(
            block.id,
            '일정 형식에 문제가 있어서 처리하지 못했습니다. 활동 수를 조금 줄여서 propose_itinerary를 다시 호출해주세요.'
          );
        }
        continue;
      }

      if (block.name === 'collect_booking_info' && !bookingHandled) {
        bookingHandled = true;
        try {
          const input = block.input as CollectBookingInfoInput;
          bookingSummaryDraft = { ...input };
          session.pendingBookingSummary = bookingSummaryDraft;
          session.phase = 'booking_summary_drafted';
          resultsById.set(
            block.id,
            '예약 안내 초안이 사용자에게 카드로 표시되었습니다. 최종 확정은 화면의 확인 버튼으로만 이루어진다는 점을 짧게 안내하세요.'
          );
        } catch (err) {
          logger.warn('collect_booking_info handling failed', err);
          resultsById.set(block.id, '예약 정보 형식에 문제가 있어서 처리하지 못했습니다. 다시 호출해주세요.');
        }
        continue;
      }

      resultsById.set(block.id, '이미 처리되었습니다.');
    }

    const toolResults: ToolResultParam[] = toolUseBlocks.map((block) => ({
      type: 'tool_result',
      tool_use_id: block.id,
      content: resultsById.get(block.id) ?? '처리되었습니다.',
    }));

    session.claudeHistory.push({ role: 'user', content: toolResults });
  }

  // Checking falsy (not just `=== undefined`) matters: the loop above can
  // legitimately break with finalText set to '' when Claude's last no-tool-use
  // response has no text block. That case still needs the wrap-up call, since
  // an empty assistantText reaches the frontend as a silent no-op (200 OK,
  // nothing rendered, no error) — confusing for the user, not fail-soft at all.
  if (!finalText) {
    const wrapUp = await anthropic.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 1024,
      system: cacheableSystem(session.phase),
      messages: withCacheBreakpoint(session.claudeHistory),
    });
    logUsage(wrapUp.usage);
    session.claudeHistory.push({ role: 'assistant', content: sanitizeForHistory(wrapUp.content) });
    finalText = extractText(wrapUp.content);
  }

  // Last-resort fallback in case even the wrap-up call comes back textless —
  // never send the frontend an empty assistantText.
  const assistantText =
    finalText || (itinerary ? '일정을 준비했어요! 화면에서 확인해보세요.' : '네, 확인했어요. 더 궁금한 점 있으신가요?');

  return { assistantText, itinerary, bookingSummaryDraft };
}
