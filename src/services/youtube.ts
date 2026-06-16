import "server-only";

import type { ChannelProfile, VideoSummary } from "@/types";

// YouTube Data API v3 래퍼. 외부 I/O는 이 레이어에서만 한다.
// API 키는 createYoutubeClient에 주입되며 절대 클라이언트로 새지 않는다
// (파일 최상단 `import 'server-only'`가 클라이언트 import를 빌드 단계에서 차단).

const API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_BATCH = 50; // videos.list / playlistItems 한 번에 최대 50개

export interface YoutubeClient {
  resolveChannelId(handle: string): Promise<{
    channelId: string;
    uploadsPlaylistId: string;
    profile: ChannelProfile;
  }>;
  getRecentVideoIds(uploadsPlaylistId: string, max?: number): Promise<string[]>;
  getTrending(regionCode: string): Promise<VideoSummary[]>;
  searchVideoIds(keyword: string, publishedAfterISO: string): Promise<string[]>;
  hydrateVideos(ids: string[]): Promise<VideoSummary[]>;
}

interface CreateOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

// --- YouTube API 응답 중 사용하는 필드만 좁게 정의 ---
interface ListResponse<T> {
  items?: T[];
}
interface ChannelItem {
  id: string;
  snippet: { title: string };
  statistics: { subscriberCount?: string; videoCount?: string };
  contentDetails: { relatedPlaylists: { uploads: string } };
}
interface PlaylistEntry {
  contentDetails: { videoId: string };
}
interface SearchEntry {
  id: { videoId: string };
}
interface VideoItem {
  id: string;
  snippet: { title: string; channelTitle: string; publishedAt: string };
  statistics: { viewCount?: string };
}
interface ApiErrorBody {
  error?: { errors?: Array<{ reason?: string }> };
}

/** 에러 클래스 계층 대신 `code` 필드만 붙인 일반 Error. */
function codedError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

/** videos.list 항목을 통계 문자열까지 숫자로 파싱해 VideoSummary로 정규화. */
function toVideoSummary(item: VideoItem): VideoSummary {
  return {
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    viewCount: Number(item.statistics.viewCount ?? 0),
  };
}

export function createYoutubeClient({
  apiKey,
  fetchImpl = fetch,
}: CreateOptions): YoutubeClient {
  async function request<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${API_BASE}/${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("key", apiKey);

    const res = await fetchImpl(url.toString());
    if (!res.ok) {
      const body = (await res
        .json()
        .catch(() => null)) as ApiErrorBody | null;
      const reason = body?.error?.errors?.[0]?.reason;
      if (
        res.status === 403 &&
        (reason === "quotaExceeded" || reason === "dailyLimitExceeded")
      ) {
        throw codedError("YouTube API 쿼터를 초과했습니다.", "QUOTA");
      }
      throw codedError(`YouTube API 요청 실패 (HTTP ${res.status})`, "HTTP");
    }
    return (await res.json()) as T;
  }

  return {
    async resolveChannelId(handle) {
      const normalized = handle.startsWith("@") ? handle : `@${handle}`;
      const data = await request<ListResponse<ChannelItem>>("channels", {
        part: "snippet,statistics,contentDetails",
        forHandle: normalized,
      });
      const item = data.items?.[0];
      if (!item) {
        throw codedError(`채널을 찾을 수 없습니다: ${normalized}`, "NOT_FOUND");
      }
      const profile: ChannelProfile = {
        channelId: item.id,
        title: item.snippet.title,
        handle: normalized,
        subscriberCount: Number(item.statistics.subscriberCount ?? 0),
        videoCount: Number(item.statistics.videoCount ?? 0),
      };
      return {
        channelId: item.id,
        uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
        profile,
      };
    },

    async getRecentVideoIds(uploadsPlaylistId, max = 25) {
      const data = await request<ListResponse<PlaylistEntry>>("playlistItems", {
        part: "contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: String(Math.min(max, MAX_BATCH)),
      });
      return (data.items ?? []).map((entry) => entry.contentDetails.videoId);
    },

    async getTrending(regionCode) {
      const data = await request<ListResponse<VideoItem>>("videos", {
        part: "snippet,statistics",
        chart: "mostPopular",
        regionCode,
        maxResults: "25",
      });
      return (data.items ?? []).map(toVideoSummary);
    },

    async searchVideoIds(keyword, publishedAfterISO) {
      const data = await request<ListResponse<SearchEntry>>("search", {
        part: "snippet",
        type: "video",
        order: "viewCount",
        q: keyword,
        publishedAfter: publishedAfterISO,
        maxResults: "25",
      });
      return (data.items ?? []).map((entry) => entry.id.videoId);
    },

    async hydrateVideos(ids) {
      const summaries: VideoSummary[] = [];
      for (let i = 0; i < ids.length; i += MAX_BATCH) {
        const batch = ids.slice(i, i + MAX_BATCH);
        const data = await request<ListResponse<VideoItem>>("videos", {
          part: "snippet,statistics",
          id: batch.join(","),
          maxResults: String(MAX_BATCH),
        });
        summaries.push(...(data.items ?? []).map(toVideoSummary));
      }
      return summaries;
    },
  };
}
