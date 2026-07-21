# 시니어 여행 도우미 (Senior Travel AI)

시니어(고령층) 여행자를 위한 대화형 여행 계획 AI 에이전트 데모입니다. 이동/건강 제약을 반영해
일정을 제안하고, 왜 이 일정이 맞는지 이유를 설명하며, 예약에 필요한 정보를 대화로 모아
정리된 안내 요약을 제공합니다.

이 프로젝트는 포트폴리오/데모 목적의 MVP이며, 실제 결제나 예약 플랫폼 연동은 포함하지 않습니다.

## 라이브 데모

**https://senior-travel-agent-frontend-dwp9.vercel.app/**

- 프론트엔드: Vercel
- 백엔드: Render (무료 플랜 — 15분간 요청이 없으면 슬립되는데, `.github/workflows/keep-alive.yml`이
  10분 간격으로 헬스체크를 호출해 계속 깨어있게 유지합니다)
- 배포 설정: 저장소 루트의 `render.yaml`(백엔드), `frontend/vercel.json`(프론트엔드)
- 프론트엔드는 Render 백엔드를 **직접(CORS)** 호출합니다(`VITE_API_BASE_URL`,
  `frontend/src/api/chatClient.ts`) — Vercel의 rewrite 프록시는 쓰지 않습니다. 일정
  생성/수정 요청이 Claude를 여러 번 반복 호출해 1~2분씩 걸릴 때가 있는데, Vercel의
  외부 rewrite 프록시는 약 120초에서 요청을 강제 종료해서(`ROUTER_EXTERNAL_TARGET_ERROR`)
  긴 요청이 502로 실패했습니다.

## 스크린샷

| STEP1 인터뷰 | STEP2 성향 분석 |
|---|---|
| ![STEP1 인터뷰](docs/screenshots/01-step1-interview.png) | ![STEP2 성향 분석](docs/screenshots/02-step2-profile.png) |

| 대화 흐름 | Day별 상세 (Mobility Score · 지도 · AI Hotel Manager) |
|---|---|
| ![대화 흐름](docs/screenshots/03-conversation.png) | ![Day 탭](docs/screenshots/04-day-tab.png) |

## 주요 기능

- **STEP1 구조화 인터뷰 → STEP2 성향 분석 요약**: 대화 초반에 나이대·보행 가능 시간·선호
  스타일·여행 강도·자유시간 필요도·숙소 이동 허용범위를 6개 고정 질문(빠른 선택 버튼)으로
  받고, 결과를 곧바로 요약해 "AI가 내 성향을 제대로 이해했는지" 먼저 확인받습니다. 문구가
  매번 흔들리지 않도록 이 단계는 Claude를 호출하지 않고 백엔드가 결정론적으로 처리합니다.
- **실데이터 기반 Day별 동선 설계**: Google Places로 조사한 실제 관광지·식당 후보 중에서만
  활동을 고르게 하고, 하루 도보거리가 예산을 넘으면 백엔드가 검증해 Claude에게 재구성을
  요청하는 루프(제안 → 검증 → 재시도)를 거칩니다. 확정된 일정은 실측 이동시간을 반영해
  "09:30 출발 → 10:00 관광지1 → 12:00 점심..."처럼 시각까지 포함한 시간표로 계산됩니다
  (LLM이 시각을 추측하지 않습니다).
- **Mobility Score (하루 부담도)**: 도보거리·계단·휴식 세 가지 하위 점수를 실제 경로
  데이터로 계산하고, 연령대를 반영한 해석 문장과 함께 제공합니다. 부담이 큰 Day는
  "추천하지 않음" 표시와 대안을 함께 보여줍니다. 근거 없는 인상 점수가 되지 않도록 전부
  결정론적 계산이며 세부 점수를 항상 함께 노출합니다.
- **AI Hotel Manager**: 후보 숙소를 나열만 하지 않고, 관광지 클러스터까지의 거리를 기준으로
  "추천 / 비추천"을 근거와 함께 비교로 보여주고, Agoda·Hotels.com 검색 딥링크를 함께
  제공합니다 (정식 제휴 API 연동이 아닌 최선 노력 검색 URL입니다).
- **Day별 탭 UI**: 채팅은 대화 전용으로 쓰고, 일정 상세(지도·Mobility Score·활동
  목록·숙소 추천)는 "Day 1 ~ Day N" 탭에서 확인합니다.
- **지도 시각화 & 시니어 보정 소요시간**: 일정의 활동 장소를 지오코딩해 지도에 표시하고,
  구간별 실거리·도보시간을 일반 성인 기준과 시니어 보정 기준으로 함께 보여줍니다
  (Google Maps 연동, 해외 여행 시나리오 가정 — 국내 전용으로 바뀌면 `MapProvider` 인터페이스
  뒤에서 다른 지도 API로 교체 가능).
- **접근성 정보**: 활동별 엘리베이터/계단/휴식공간 등 접근성 아이콘을 확실히 아는 정보만
  표시합니다 (모르면 생략 — 추측해서 채우지 않음).
- **예약 안내**: 항공/숙소/교통에 필요한 정보를 대화로 모아 정리된 초안을 만들고, **화면의
  확인 버튼을 눌러야만** 최종 확정됩니다 (Claude가 대화 텍스트만으로 확정을 트리거할 수 없습니다).

## 기술 스택

- 프론트엔드: React + Vite + TypeScript
- 백엔드: Node.js + Express + TypeScript
- LLM: Anthropic Claude API (`@anthropic-ai/sdk`, tool use 기반 구조화 출력)
- 모노레포: npm workspaces (`shared`, `backend`, `frontend`)

## 시작하기

### 준비물

- Node.js 20 이상
- Anthropic API 키 ([console.anthropic.com](https://console.anthropic.com)에서 발급)
- (선택) Google Maps API 키 — 지도/거리 기능을 쓰려면 Google Cloud Console에서
  Geocoding API, Directions API, Maps JavaScript API 3개를 활성화하고 결제 계정을
  등록해야 합니다. 키가 없어도 나머지 기능은 정상 동작합니다(지도 데이터만 비어있음).

### 설치

```bash
npm install
```

### 환경 변수 설정

`backend/.env.example`을 `backend/.env`로, `frontend/.env.example`을 `frontend/.env`로
복사한 뒤 필요한 키를 입력하세요.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**백엔드** (`backend/.env`)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API 키 (필수) | - |
| `PORT` | 백엔드 서버 포트 | `3001` |
| `FRONTEND_ORIGIN` | CORS 허용 origin | `http://localhost:5173` |
| `CLAUDE_MODEL` | 사용할 Claude 모델 | `claude-sonnet-5` |
| `GOOGLE_MAPS_API_KEY` | Google Geocoding/Directions API 키 (선택, 서버 측) | - |

**프론트엔드** (`frontend/.env`)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API 키 (선택, 브라우저에 노출됨 — Cloud Console에서 HTTP 리퍼러 제한 필요) | - |

### 실행

```bash
npm run dev
```

| 서비스 | 주소 |
|---|---|
| 프론트엔드 | http://localhost:5173 |
| 백엔드 API | http://localhost:3001 |

프론트엔드 개발 서버가 `/api` 요청을 백엔드로 프록시하므로, 브라우저에서는
`http://localhost:5173`만 열면 됩니다.

### 타입 체크

```bash
npm run typecheck
```

## 동작 방식 — 대화 단계(phase)

```
step1_interview → step2_profile_review → gathering → itinerary_proposed
  → itinerary_agreed → booking_summary_drafted → booking_confirmed
```

- `step1_interview`: 6개 고정 질문에 빠른 선택 버튼으로 답변 (Claude 호출 없음)
- `step2_profile_review`: 결정론적으로 계산된 성향 요약 카드를 보여주고 확인/재답변 선택
- `gathering`: STEP1에서 이미 파악된 항목은 다시 묻지 않고, 목적지·예산·이동수단 선호 등
  남은 정보를 대화로 수집하며 관광지/식당 후보를 조사
- `itinerary_proposed`: Claude가 `propose_itinerary` 도구로 일정을 제안 (도보 예산을 넘으면
  백엔드가 검증해 자동으로 재구성을 요청, 활동마다 근거 포함)
- `itinerary_agreed`: 사용자가 "이 일정으로 진행할게요" 버튼을 누르면 전환, 예약 정보 수집 시작
- `booking_summary_drafted`: Claude가 `collect_booking_info` 도구로 예약 안내 초안을 작성
- `booking_confirmed`: 사용자가 화면의 "확인 완료" 버튼을 눌러야만 도달 (Claude가 대화만으로는 도달 불가)

## 비용 관리 (프롬프트 캐싱)

Claude API는 무상태(stateless)라 매 호출마다 시스템 프롬프트와 누적된 대화 이력을 전부
다시 보냅니다. 특히 일정 제안(`propose_itinerary`)이 도보 예산을 초과하면 백엔드가 같은
턴 안에서 최대 5번(`MAX_TOOL_ITERATIONS`)까지 재시도하는데, 캐싱 없이는 반복 호출마다
점점 커지는 대화 전체를 매번 정가로 재계산하게 되어 비용이 빠르게 늘어납니다.

`backend/src/claude/agent.ts`에 적용한 절감책:

- **프롬프트 캐싱**: 시스템 프롬프트/도구 정의와, 대화 이력(`session.claudeHistory`)의
  마지막 블록에 캐시 체크포인트(`cache_control`)를 걸어 반복 호출·다음 턴에서 이전
  대화를 원가의 약 10%로 재사용합니다. 이를 위해 `@anthropic-ai/sdk`를 `^0.112.3`으로
  올려 정식(비-베타) 캐싱 API를 사용합니다.
- **사용량 로그**: 매 호출마다 백엔드 콘솔에
  `[info] claude usage — input:.. output:.. cacheWrite:.. cacheRead:..`를 남겨, 실제
  캐시 히트 여부와 토큰 사용량을 개발 중 바로 확인할 수 있습니다.
- **프롬프트 튜닝**: 일정 제안 시 "하루 활동 3~4개 이내로 처음부터 도보 예산 안에 들어오게
  구성", "활동 설명/근거는 1~2문장으로 간결하게" 지침을 추가해 재시도 빈도와 응답
  크기(토큰 수)를 함께 줄였습니다.
- **재시도 횟수는 5로 유지**: 4로 줄여 테스트한 결과, 마지막 시도가 `max_tokens`(8192)
  한계에 걸려 응답이 잘리면서 재시도할 여유 없이 일정 제안 자체가 실패하는 경우가
  발생했습니다. 비용보다 안정성이 우선이라 5로 되돌렸습니다 — 어차피 마지막 시도는
  도보 예산 초과 여부와 무관하게 강제로 수락되므로, 실패로 끝나는 것보다 낫습니다.
- **Google Maps 호출 타임아웃**: `backend/src/maps/googleMapsProvider.ts`의 모든 fetch
  호출에 8초 타임아웃을 추가했습니다. 원래 타임아웃이 없어서 응답이 늦으면 요청이 무한
  대기할 수 있었는데(세션이 영영 멈춤 → 사용자가 새 세션으로 재시도하며 비용이 중복
  발생할 위험), 이제는 타임아웃 시 기존 fail-soft 폴백(Haversine 거리 계산)으로
  자연스럽게 넘어갑니다.

실측 기준, STEP1 인터뷰부터 일정 하나를 완전히 생성하기까지 전체 대화 비용은 약
$0.25~0.35 수준입니다 (Claude Sonnet 5, 2026-08-31까지 적용되는 할인 단가 기준).

### 개발 중 테스트 비용을 더 줄이려면

- **`SKIP_BUDGET_VALIDATION=true`** (`backend/.env`, 기본값 `false`): 도보 예산 재시도
  루프를 건너뛰고 Claude의 첫 제안을 그대로 수락합니다. Mobility Score 자체는 그대로
  정직하게 계산되고, 재시도(가장 비싼 부분)만 생략됩니다. 실측상 전체 대화 비용이
  약 절반으로 줄어듭니다 (~$0.25 → ~$0.13). **면접 당일 실제 시연/제출용 실행에서는
  반드시 `false`(또는 미설정)로 두세요** — 도보 예산 검증이라는 핵심 기능이 빠집니다.
- **Claude 응답에 넣는 검색 결과 슬림화**: `search_tourist_spots`/`search_restaurants`
  결과 중 Claude의 의사결정에 실제로 쓰이는 필드(placeId, name, category, rating,
  coordinates)만 골라 전달합니다. `address`/`userRatingsTotal` 같은, 나중에 화면
  표시용으로만 쓰이는 필드는 백엔드가 별도로 보관했다가 일정 확정 후에 붙입니다
  (Claude가 볼 필요 없는 데이터를 컨텍스트에 안 태우는 방식).
- **Google Maps/Places 응답 디스크 캐시**: 지오코딩·경로·장소 검색 결과를
  `backend/.cache/maps-cache.json`에 저장해, 개발 중 `tsx watch`가 자주 재시작돼도
  같은 지역을 반복 조회하지 않습니다 (`.gitignore`에 포함되어 있어 커밋되지 않습니다 —
  지우면 그냥 다시 채워지는 캐시라 안전합니다).
- 테스트 자체를 더 저렴하게 하려면 `CLAUDE_MODEL=claude-haiku-4-5`로 잠깐 바꿔서
  대화 흐름/UI만 확인하는 것도 방법입니다 (실제 제출본은 `claude-sonnet-5`로 되돌릴 것).

## MVP 한계 (알려진 제약사항)

- **세션은 인메모리로만 저장됩니다.** 서버를 재시작하면 모든 대화가 사라집니다. 다중 프로세스
  배포에는 적합하지 않으며, 실제 서비스라면 Redis 등 외부 저장소로 교체가 필요합니다.
- 인증/로그인 기능이 없습니다 (단일 사용자 로컬 데모 전제).
- 실제 예약/결제 연동이 없습니다. "예약 안내 요약"까지만 제공하며, 실제 예약은 사용자가
  직접 진행해야 합니다.
- PRD의 Goal 3(현지 실시간 지원: 번역, 길찾기, 일정 재조정)과 Goal 4(보호자 공유 알림)는
  이번 MVP 범위에 포함되지 않았습니다.
- AI Guide(동선 중 혼잡시간·편의시설·현지 문화 등 참고 정보 안내)는 "AI 여행 매니저" PRD의
  2차 확장 항목으로, 이번 라운드 범위 밖으로 뺐습니다.
- Agoda/Hotels.com 예약 링크는 정식 Affiliate API 연동이 아니라, 호텔명·도시로 채운
  검색결과 페이지 딥링크입니다 — 클릭 시 검색 결과가 정확히 그 숙소로 안 잡힐 수 있습니다.
- 체류시간 추정(식당 60분/그 외 90분)과 Mobility Score 하위 가중치는 초안 값으로,
  실사용 데이터에 맞춘 튜닝이 필요합니다.
- Google Maps 키가 없으면 지도/실거리/보정시간 데이터 없이 텍스트 일정만 표시됩니다
  (fail-soft — 앱이 깨지지 않음).
- 지오코딩/경로 조회 결과는 서버 메모리에 캐시되지만 세션과 마찬가지로 재시작 시 사라집니다.
