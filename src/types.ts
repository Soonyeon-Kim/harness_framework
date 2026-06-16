// NextPick 공유 도메인 타입 (단일 파일 — MVP 단순화).

/** YouTube 영상 1개의 요약 통계. 외부 API 응답을 이 형태로 정규화한다. */
export interface VideoSummary {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string; // ISO 8601
  viewCount: number;
}

/** 분석 대상(내) 채널의 프로필. */
export interface ChannelProfile {
  channelId: string;
  title: string;
  handle: string;
  subscriberCount: number;
  videoCount: number;
}

// --- 후속 step(scoring / api-route / ui)에서 사용. 점진 확장 허용. ---

/** 휴리스틱 점수가 매겨진 트렌드 후보 영상. (step 2: scoring) */
export interface ScoredCandidate {
  video: VideoSummary;
  /** 조회수 ÷ 게시 후 경과일. */
  virality: number;
  /** 내 채널 키워드와 겹친 정도. */
  relevance: number;
  /** 겹친 키워드 목록. */
  matchedKeywords: string[];
  /** 정규화(virality)·가중 + relevance·가중. */
  score: number;
}

/** 근거를 포함한 "다음 콘텐츠" 추천 카드. (step 2~4) */
export interface Recommendation {
  title: string;
  /** 추천 근거(어떤 트렌드·어떤 겹친 키워드). */
  rationale: string;
  matchedKeywords: string[];
  score: number;
  /** 추천의 출처가 된 트렌드 영상. */
  source: VideoSummary;
  /** 출처 영상 링크. */
  sourceUrl: string;
}

/** `/api/analyze` 응답 전체 형태: 내 채널 분석 + 트렌드 + 추천. (step 3) */
export interface TrendReport {
  channel: ChannelProfile;
  /** 내 채널 분석 4지표. */
  averageViewCount: number;
  topKeywords: string[];
  uploadCadenceDays: number;
  bestVideos: VideoSummary[];
  /** 지금 뜨는 트렌드 (점수순). */
  trends: ScoredCandidate[];
  /** 다음 콘텐츠 추천 (점수순). */
  recommendations: Recommendation[];
}
