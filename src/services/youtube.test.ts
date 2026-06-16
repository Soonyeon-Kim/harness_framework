import { describe, it, expect } from "vitest";
import { createYoutubeClient } from "./youtube";

const API_KEY = "test-key";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/**
 * 캔드(canned) JSON을 반환하는 가짜 fetch. 실제 네트워크/실제 키를 쓰지 않는다.
 * `handler`는 호출된 URL(string)을 받아 응답 body/status를 결정한다.
 */
function recordingFetch(
  handler: (url: string) => { body: unknown; status?: number },
): { impl: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const impl = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    calls.push(url);
    const { body, status = 200 } = handler(url);
    return jsonResponse(body, status);
  };
  return { impl: impl as unknown as typeof fetch, calls };
}

function errorCode(e: unknown): string | undefined {
  return (e as { code?: string }).code;
}

describe("createYoutubeClient", () => {
  describe("resolveChannelId", () => {
    it("calls channels.list with a normalized handle and parses the profile", async () => {
      const { impl, calls } = recordingFetch(() => ({
        body: {
          items: [
            {
              id: "UC123",
              snippet: { title: "My Channel" },
              statistics: { subscriberCount: "1000", videoCount: "42" },
              contentDetails: { relatedPlaylists: { uploads: "UU123" } },
            },
          ],
        },
      }));
      const client = createYoutubeClient({ apiKey: API_KEY, fetchImpl: impl });

      const result = await client.resolveChannelId("myhandle"); // '@' 누락

      const url = new URL(calls[0]);
      expect(url.pathname).toContain("/channels");
      expect(url.searchParams.get("part")).toBe("snippet,statistics,contentDetails");
      expect(url.searchParams.get("forHandle")).toBe("@myhandle"); // 보정됨
      expect(url.searchParams.get("key")).toBe(API_KEY);

      expect(result.channelId).toBe("UC123");
      expect(result.uploadsPlaylistId).toBe("UU123");
      expect(result.profile).toEqual({
        channelId: "UC123",
        title: "My Channel",
        handle: "@myhandle",
        subscriberCount: 1000,
        videoCount: 42,
      });
    });

    it("throws code NOT_FOUND when no channel matches the handle", async () => {
      const { impl } = recordingFetch(() => ({ body: { items: [] } }));
      const client = createYoutubeClient({ apiKey: API_KEY, fetchImpl: impl });

      const err = await client.resolveChannelId("@ghost").catch((e) => e);
      expect(errorCode(err)).toBe("NOT_FOUND");
    });
  });

  describe("getRecentVideoIds", () => {
    it("calls playlistItems.list and returns the video ids", async () => {
      const { impl, calls } = recordingFetch(() => ({
        body: {
          items: [
            { contentDetails: { videoId: "v1" } },
            { contentDetails: { videoId: "v2" } },
          ],
        },
      }));
      const client = createYoutubeClient({ apiKey: API_KEY, fetchImpl: impl });

      const ids = await client.getRecentVideoIds("UU123", 10);

      const url = new URL(calls[0]);
      expect(url.pathname).toContain("/playlistItems");
      expect(url.searchParams.get("part")).toBe("contentDetails");
      expect(url.searchParams.get("playlistId")).toBe("UU123");
      expect(url.searchParams.get("maxResults")).toBe("10");
      expect(ids).toEqual(["v1", "v2"]);
    });
  });

  describe("getTrending", () => {
    it("calls videos.list mostPopular chart and maps to VideoSummary with numeric viewCount", async () => {
      const { impl, calls } = recordingFetch(() => ({
        body: {
          items: [
            {
              id: "t1",
              snippet: {
                title: "Trend 1",
                channelTitle: "Chan A",
                publishedAt: "2026-06-01T00:00:00Z",
              },
              statistics: { viewCount: "55000" },
            },
          ],
        },
      }));
      const client = createYoutubeClient({ apiKey: API_KEY, fetchImpl: impl });

      const videos = await client.getTrending("KR");

      const url = new URL(calls[0]);
      expect(url.pathname).toContain("/videos");
      expect(url.searchParams.get("chart")).toBe("mostPopular");
      expect(url.searchParams.get("regionCode")).toBe("KR");
      expect(url.searchParams.get("part")).toBe("snippet,statistics");
      expect(videos).toEqual([
        {
          id: "t1",
          title: "Trend 1",
          channelTitle: "Chan A",
          publishedAt: "2026-06-01T00:00:00Z",
          viewCount: 55000,
        },
      ]);
    });
  });

  describe("searchVideoIds", () => {
    it("calls search.list ordered by viewCount and returns video ids", async () => {
      const { impl, calls } = recordingFetch(() => ({
        body: {
          items: [{ id: { videoId: "s1" } }, { id: { videoId: "s2" } }],
        },
      }));
      const client = createYoutubeClient({ apiKey: API_KEY, fetchImpl: impl });

      const ids = await client.searchVideoIds("브이로그", "2026-05-01T00:00:00Z");

      const url = new URL(calls[0]);
      expect(url.pathname).toContain("/search");
      expect(url.searchParams.get("type")).toBe("video");
      expect(url.searchParams.get("order")).toBe("viewCount");
      expect(url.searchParams.get("q")).toBe("브이로그");
      expect(url.searchParams.get("publishedAfter")).toBe("2026-05-01T00:00:00Z");
      expect(ids).toEqual(["s1", "s2"]);
    });
  });

  describe("hydrateVideos", () => {
    it("returns [] without calling fetch for empty input", async () => {
      const { impl, calls } = recordingFetch(() => ({ body: { items: [] } }));
      const client = createYoutubeClient({ apiKey: API_KEY, fetchImpl: impl });

      const result = await client.hydrateVideos([]);

      expect(result).toEqual([]);
      expect(calls).toHaveLength(0);
    });

    it("splits requests into batches of 50 and parses viewCount to a number", async () => {
      const { impl, calls } = recordingFetch((url) => {
        const ids = (new URL(url).searchParams.get("id") ?? "")
          .split(",")
          .filter(Boolean);
        return {
          body: {
            items: ids.map((id) => ({
              id,
              snippet: {
                title: `t-${id}`,
                channelTitle: "c",
                publishedAt: "2026-01-01T00:00:00Z",
              },
              statistics: { viewCount: "100" },
            })),
          },
        };
      });
      const client = createYoutubeClient({ apiKey: API_KEY, fetchImpl: impl });

      const ids = Array.from({ length: 120 }, (_, i) => `v${i}`);
      const result = await client.hydrateVideos(ids);

      expect(calls).toHaveLength(3); // 50 + 50 + 20
      const batchSizes = calls.map(
        (c) => new URL(c).searchParams.get("id")!.split(",").length,
      );
      expect(batchSizes).toEqual([50, 50, 20]);
      expect(result).toHaveLength(120);
      expect(result[0].viewCount).toBe(100);
      expect(typeof result[0].viewCount).toBe("number");
    });
  });

  describe("error mapping", () => {
    it("maps HTTP 403 quotaExceeded to code QUOTA", async () => {
      const { impl } = recordingFetch(() => ({
        body: { error: { errors: [{ reason: "quotaExceeded" }] } },
        status: 403,
      }));
      const client = createYoutubeClient({ apiKey: API_KEY, fetchImpl: impl });

      const err = await client.getTrending("KR").catch((e) => e);
      expect(errorCode(err)).toBe("QUOTA");
    });
  });
});
