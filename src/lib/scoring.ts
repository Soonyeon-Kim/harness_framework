// 추천 엔진의 순수 계산. 네트워크/환경변수/Date.now() 없이 결정적으로 동작한다.
// 시간이 필요한 함수는 `now: Date`를 주입받는다 (테스트 결정성 보장).
// 휴리스틱 공식은 ADR-002를 따른다: virality = 조회수 ÷ 게시 후 경과일,
// relevance = 후보 키워드 ∩ 내 채널 키워드, 추천점수 = 정규화(virality)·가중 + relevance·가중.

import type { Recommendation, ScoredCandidate, VideoSummary } from "@/types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** 0 나눗셈 방지: 갓 게시된 영상도 최소 1시간(1/24일)으로 본다. */
const MIN_AGE_DAYS = 1 / 24;

const DEFAULT_VIRALITY_WEIGHT = 0.6;
const DEFAULT_RELEVANCE_WEIGHT = 0.4;

/** 제목을 소문자 토큰 배열로 자른다. 한글+영문 토큰, 2자 이상, 글자를 포함해야 함. */
function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  // 길이 2자 이상이면서 글자를 최소 1개 포함 → "2024" 같은 순수 숫자는 제외.
  return matches.filter((token) => token.length >= 2 && /\p{L}/u.test(token));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 제목들에서 키워드 빈도를 세어 상위 N개를 반환한다. 동점은 첫 등장 순서를 유지. */
export function extractKeywords(titles: string[], topN = 5): string[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const token of tokenize(title)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  // Array.prototype.sort는 stable → 동점이면 Map 삽입 순서(첫 등장 순서) 유지.
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([token]) => token);
}

/** 두 키워드 집합의 자카드 유사도 (교집합 ÷ 합집합). 0~1, 둘 다 비면 0. */
export function keywordOverlap(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const key of setA) {
    if (setB.has(key)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** 게시 후 경과일. 0/음수가 되지 않도록 최소값(MIN_AGE_DAYS)을 보장한다. */
export function ageInDays(publishedAt: string, now: Date): number {
  const days = (now.getTime() - new Date(publishedAt).getTime()) / MS_PER_DAY;
  return Math.max(days, MIN_AGE_DAYS);
}

/** 조회속도 = 조회수 ÷ 게시 후 경과일. */
export function viralityScore(
  viewCount: number,
  publishedAt: string,
  now: Date,
): number {
  return viewCount / ageInDays(publishedAt, now);
}

/** 후보 키워드와 내 채널 키워드의 겹침 정도. 0~1. */
export function relevanceScore(
  candidateKeywords: string[],
  channelKeywords: string[],
): number {
  return keywordOverlap(candidateKeywords, channelKeywords);
}

export interface CombinedScoreOptions {
  /** 후보 집합 내 최대 virality. 정규화 기준. 미지정 시 virality 자기 자신을 기준으로 본다. */
  maxVirality?: number;
  viralityWeight?: number;
  relevanceWeight?: number;
}

/** virality를 0~1로 정규화한 뒤 relevance와 가중 결합해 0~100 점수를 만든다. */
export function combinedScore(
  virality: number,
  relevance: number,
  opts: CombinedScoreOptions = {},
): number {
  const maxVirality = opts.maxVirality ?? virality;
  const normVirality = maxVirality > 0 ? clamp01(virality / maxVirality) : 0;

  const viralityWeight = opts.viralityWeight ?? DEFAULT_VIRALITY_WEIGHT;
  const relevanceWeight = opts.relevanceWeight ?? DEFAULT_RELEVANCE_WEIGHT;
  const weightSum = viralityWeight + relevanceWeight;
  if (weightSum <= 0) return 0;

  // 가중치 합으로 나눠 항상 0~1 → ×100 으로 0~100 보장.
  const combined =
    (viralityWeight * normVirality + relevanceWeight * clamp01(relevance)) /
    weightSum;
  return combined * 100;
}

/** 각 후보에 virality/relevance/matchedKeywords/score를 부여하고 점수 내림차순 정렬. */
export function rankCandidates(
  candidates: VideoSummary[],
  channelKeywords: string[],
  now: Date,
): ScoredCandidate[] {
  const enriched = candidates.map((video) => {
    const tokens = tokenize(video.title);
    const tokenSet = new Set(tokens);
    return {
      video,
      virality: viralityScore(video.viewCount, video.publishedAt, now),
      relevance: relevanceScore(tokens, channelKeywords),
      // 내 채널 키워드 순서를 유지해 결정적으로 추출.
      matchedKeywords: channelKeywords.filter((keyword) =>
        tokenSet.has(keyword),
      ),
    };
  });

  const maxVirality = enriched.reduce(
    (max, candidate) => Math.max(max, candidate.virality),
    0,
  );

  const scored: ScoredCandidate[] = enriched.map((candidate) => ({
    ...candidate,
    score: combinedScore(candidate.virality, candidate.relevance, {
      maxVirality,
    }),
  }));

  // 점수 → virality → id 순으로 tie-break해 완전 결정적으로 정렬.
  return scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.virality - a.virality ||
      a.video.id.localeCompare(b.video.id),
  );
}

/** 상위 후보의 제목 패턴 + 내 키워드를 결합해 근거 있는 추천 카드를 만든다. */
export function buildRecommendations(
  ranked: ScoredCandidate[],
  channelKeywords: string[],
): Recommendation[] {
  return ranked.map(({ video, matchedKeywords, score, virality }) => {
    const focusKeyword = matchedKeywords[0] ?? channelKeywords[0] ?? "내 채널";
    const dailyViews = Math.round(virality);
    const title = `'${focusKeyword}' 관점으로 푸는 ${video.title}`;
    const rationale =
      matchedKeywords.length > 0
        ? `'${video.channelTitle}'의 '${video.title}'이(가) 하루 약 ${dailyViews}회 조회속도로 떴고, 내 채널 키워드 ${matchedKeywords.join(", ")}와(과) 겹칩니다.`
        : `'${video.channelTitle}'의 '${video.title}'이(가) 하루 약 ${dailyViews}회 조회속도로 떴습니다. 겹치는 키워드는 없지만 니치 확장 후보로 참고하세요.`;

    return {
      title,
      rationale,
      matchedKeywords,
      score,
      source: video,
      sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
    };
  });
}
