import { describe, it, expect } from "vitest";
import {
  extractKeywords,
  keywordOverlap,
  ageInDays,
  viralityScore,
  relevanceScore,
  combinedScore,
  rankCandidates,
  buildRecommendations,
} from "./scoring";
import type { ScoredCandidate, VideoSummary } from "@/types";

// 모든 시간 기반 테스트는 고정된 now를 주입해 결정적(deterministic)으로 만든다.
const NOW = new Date("2026-06-16T00:00:00.000Z");

function video(partial: Partial<VideoSummary> & { id: string }): VideoSummary {
  return {
    title: "untitled",
    channelTitle: "channel",
    publishedAt: "2026-06-06T00:00:00.000Z",
    viewCount: 0,
    ...partial,
  };
}

describe("extractKeywords", () => {
  it("ranks tokens by frequency and returns the top N", () => {
    const titles = ["브이로그 카페 브이로그", "카페 코딩"];
    // 브이로그(2), 카페(2), 코딩(1) — 동점은 첫 등장 순서 유지
    expect(extractKeywords(titles, 2)).toEqual(["브이로그", "카페"]);
    expect(extractKeywords(titles, 5)).toEqual(["브이로그", "카페", "코딩"]);
  });

  it("drops tokens shorter than 2 characters", () => {
    expect(extractKeywords(["a 코딩 b"], 5)).toEqual(["코딩"]);
  });

  it("lowercases english tokens so casing does not split counts", () => {
    expect(extractKeywords(["Vlog vlog VLOG"], 5)).toEqual(["vlog"]);
  });

  it("excludes pure-number tokens (한글+영문 토큰만)", () => {
    expect(extractKeywords(["2024 코딩"], 5)).toEqual(["코딩"]);
  });

  it("returns an empty array for no usable tokens", () => {
    expect(extractKeywords([], 5)).toEqual([]);
    expect(extractKeywords(["a 1 -"], 5)).toEqual([]);
  });
});

describe("keywordOverlap", () => {
  const cases: Array<{ a: string[]; b: string[]; expected: number }> = [
    { a: ["a", "b"], b: ["a", "b"], expected: 1 }, // 완전 일치
    { a: ["a"], b: ["b"], expected: 0 }, // 겹침 없음 (경계 0)
    { a: [], b: [], expected: 0 }, // 둘 다 비어있음 → 0 나눗셈 가드
    { a: ["a"], b: [], expected: 0 },
    { a: ["a", "b"], b: ["b", "c"], expected: 1 / 3 }, // 자카드
    { a: ["a", "a", "b"], b: ["a"], expected: 0.5 }, // 집합으로 중복 제거
  ];

  it.each(cases)(
    "overlap($a, $b) = $expected (자카드, 0~1)",
    ({ a, b, expected }) => {
      const result = keywordOverlap(a, b);
      expect(result).toBeCloseTo(expected);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    },
  );
});

describe("ageInDays", () => {
  it("returns the elapsed days for a past publish date", () => {
    expect(ageInDays("2026-06-06T00:00:00.000Z", NOW)).toBeCloseTo(10);
    expect(ageInDays("2026-06-14T00:00:00.000Z", NOW)).toBeCloseTo(2);
  });

  it("guards against zero/negative age (갓 게시된 영상)", () => {
    // now와 동일 시각 → 0이 아니라 최소값(1/24일)
    expect(ageInDays(NOW.toISOString(), NOW)).toBeCloseTo(1 / 24);
    // 미래 게시 → 음수가 아니라 최소값
    expect(ageInDays("2026-06-17T00:00:00.000Z", NOW)).toBeCloseTo(1 / 24);
  });
});

describe("viralityScore", () => {
  it("computes views per day", () => {
    expect(viralityScore(1000, "2026-06-06T00:00:00.000Z", NOW)).toBeCloseTo(100);
  });

  it("never divides by zero for a just-published video", () => {
    const v = viralityScore(100, NOW.toISOString(), NOW);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeCloseTo(100 / (1 / 24)); // 2400
  });

  it("is 0 when there are no views", () => {
    expect(viralityScore(0, "2026-06-06T00:00:00.000Z", NOW)).toBe(0);
  });
});

describe("relevanceScore", () => {
  it("is 1 when keyword sets fully overlap and 0 when disjoint (경계)", () => {
    expect(relevanceScore(["코딩", "개발"], ["코딩", "개발"])).toBe(1);
    expect(relevanceScore(["여행"], ["코딩"])).toBe(0);
  });
});

describe("combinedScore", () => {
  const cases: Array<{
    name: string;
    v: number;
    r: number;
    opts: Parameters<typeof combinedScore>[2];
    expected: number;
  }> = [
    { name: "max virality + full relevance", v: 100, r: 1, opts: { maxVirality: 100 }, expected: 100 },
    { name: "zero everything", v: 0, r: 0, opts: { maxVirality: 100 }, expected: 0 },
    { name: "virality only weight, half of max", v: 50, r: 0, opts: { maxVirality: 100, viralityWeight: 1, relevanceWeight: 0 }, expected: 50 },
    { name: "relevance only weight", v: 0, r: 1, opts: { maxVirality: 100, viralityWeight: 0, relevanceWeight: 1 }, expected: 100 },
    { name: "default weights, relevance only", v: 0, r: 1, opts: { maxVirality: 100 }, expected: 40 },
    { name: "virality above max is clamped to 1", v: 200, r: 1, opts: { maxVirality: 100 }, expected: 100 },
  ];

  it.each(cases)("$name → $expected", ({ v, r, opts, expected }) => {
    expect(combinedScore(v, r, opts)).toBeCloseTo(expected);
  });

  it("always produces a value within 0~100 after normalization", () => {
    const viralities = [0, 10, 100, 500, 9999];
    const relevances = [0, 0.25, 0.5, 0.75, 1];
    for (const v of viralities) {
      for (const r of relevances) {
        const s = combinedScore(v, r, { maxVirality: 1000 });
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("rankCandidates", () => {
  const channelKeywords = ["코딩", "개발", "javascript"];
  const candidates: VideoSummary[] = [
    video({ id: "A", title: "코딩 입문 강좌", viewCount: 1000, publishedAt: "2026-06-06T00:00:00.000Z" }), // virality 100, relevance 0.2
    video({ id: "B", title: "여행 브이로그 맛집", viewCount: 10000, publishedAt: "2026-06-06T00:00:00.000Z" }), // virality 1000, relevance 0
    video({ id: "C", title: "javascript 개발 코딩", viewCount: 500, publishedAt: "2026-06-11T00:00:00.000Z" }), // virality 100, relevance 1
  ];

  it("scores each candidate and sorts by score descending", () => {
    const ranked = rankCandidates(candidates, channelKeywords, NOW);
    expect(ranked.map((c) => c.video.id)).toEqual(["B", "C", "A"]);
  });

  it("attaches virality, relevance, matchedKeywords and a 0~100 score", () => {
    const ranked = rankCandidates(candidates, channelKeywords, NOW);
    const byId = (id: string) => ranked.find((c) => c.video.id === id)!;

    const a = byId("A");
    expect(a.virality).toBeCloseTo(100);
    expect(a.relevance).toBeCloseTo(0.2);
    expect(a.matchedKeywords).toEqual(["코딩"]);
    expect(a.score).toBeCloseTo(14);

    const b = byId("B");
    expect(b.virality).toBeCloseTo(1000);
    expect(b.relevance).toBe(0);
    expect(b.matchedKeywords).toEqual([]);
    expect(b.score).toBeCloseTo(60);

    const c = byId("C");
    expect(c.virality).toBeCloseTo(100);
    expect(c.relevance).toBe(1);
    expect(c.matchedKeywords).toEqual(["코딩", "개발", "javascript"]);
    expect(c.score).toBeCloseTo(46);

    for (const cand of ranked) {
      expect(cand.score).toBeGreaterThanOrEqual(0);
      expect(cand.score).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic for a fixed now", () => {
    const first = rankCandidates(candidates, channelKeywords, NOW);
    const second = rankCandidates(candidates, channelKeywords, NOW);
    expect(first).toEqual(second);
  });
});

describe("buildRecommendations", () => {
  const matched: ScoredCandidate = {
    video: video({
      id: "vid123",
      title: "AI 코딩 자동화",
      channelTitle: "Tech Chan",
      viewCount: 1000,
    }),
    virality: 100,
    relevance: 0.5,
    matchedKeywords: ["코딩", "ai"],
    score: 42,
  };

  it("builds a card that carries the score, source video and a watch url", () => {
    const [rec] = buildRecommendations([matched], ["코딩", "ai", "개발"]);
    expect(rec.score).toBe(42);
    expect(rec.source).toEqual(matched.video);
    expect(rec.sourceUrl).toBe("https://www.youtube.com/watch?v=vid123");
    expect(rec.matchedKeywords).toEqual(["코딩", "ai"]);
    expect(rec.title).toContain("AI 코딩 자동화"); // 소스 제목 패턴
    expect(rec.title).toContain("코딩"); // 내 키워드 결합
  });

  it("explains the trend and includes the overlapping keywords in the reason", () => {
    const [rec] = buildRecommendations([matched], ["코딩", "ai", "개발"]);
    for (const k of matched.matchedKeywords) {
      expect(rec.rationale).toContain(k);
    }
    expect(rec.rationale).toContain("조회속도"); // 어떤 조회속도로 떴는지
    expect(rec.rationale).toContain("Tech Chan"); // 어떤 트렌드인지
  });

  it("handles a candidate with no overlapping keywords", () => {
    const noMatch: ScoredCandidate = {
      video: video({ id: "vid999", title: "낚시 브이로그", channelTitle: "Fish" }),
      virality: 50,
      relevance: 0,
      matchedKeywords: [],
      score: 10,
    };
    const [rec] = buildRecommendations([noMatch], ["코딩"]);
    expect(rec.matchedKeywords).toEqual([]);
    expect(rec.rationale).toContain("조회속도");
    expect(rec.title).toContain("코딩"); // 겹침이 없으면 내 채널 대표 키워드로 폴백
  });

  it("produces one recommendation per ranked candidate, preserving order", () => {
    const second: ScoredCandidate = { ...matched, video: video({ id: "vid456", title: "코딩 라이브" }), score: 20 };
    const recs = buildRecommendations([matched, second], ["코딩"]);
    expect(recs.map((r) => r.source.id)).toEqual(["vid123", "vid456"]);
  });
});
