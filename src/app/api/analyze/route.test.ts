import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { getConfig } from "@/lib/env";
import { createYoutubeClient } from "@/services/youtube";

// Mock the modules
vi.mock("@/lib/env", () => ({
  getConfig: vi.fn(),
}));

vi.mock("@/services/youtube", () => ({
  createYoutubeClient: vi.fn(),
}));

describe("GET /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and a full TrendReport on success", async () => {
    // 1. Mock getConfig
    vi.mocked(getConfig).mockReturnValue({
      apiKey: "test-api-key",
      channelHandle: "@testchannel",
      regionCode: "KR",
    });

    // 2. Mock client methods
    const mockResolveChannelId = vi.fn().mockResolvedValue({
      channelId: "channel-123",
      uploadsPlaylistId: "uploads-123",
      profile: {
        channelId: "channel-123",
        title: "Test Channel",
        handle: "@testchannel",
        subscriberCount: 100,
        videoCount: 10,
      },
    });

    const mockGetRecentVideoIds = vi.fn().mockResolvedValue(["v1", "v2"]);
    
    const mockHydrateVideos = vi.fn().mockImplementation(async (ids: string[]) => {
      return ids.map((id) => ({
        id,
        title: `Video ${id} with keyword1 and keyword2`,
        channelTitle: "Test Channel",
        publishedAt: id === "v1" ? "2026-06-10T00:00:00Z" : "2026-06-05T00:00:00Z",
        viewCount: id === "v1" ? 1000 : 2000,
      }));
    });

    const mockGetTrending = vi.fn().mockResolvedValue([
      {
        id: "trend1",
        title: "Trending video about keyword1",
        channelTitle: "Other Channel",
        publishedAt: "2026-06-15T00:00:00Z",
        viewCount: 50000,
      },
    ]);

    const mockSearchVideoIds = vi.fn().mockResolvedValue(["trend1", "search1"]);

    const mockClient = {
      resolveChannelId: mockResolveChannelId,
      getRecentVideoIds: mockGetRecentVideoIds,
      getTrending: mockGetTrending,
      searchVideoIds: mockSearchVideoIds,
      hydrateVideos: mockHydrateVideos,
    };

    vi.mocked(createYoutubeClient).mockReturnValue(mockClient);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const data = await response.json();
    expect(data.channel.channelId).toBe("channel-123");
    
    // Validate calculations:
    // averageViewCount: (1000 + 2000) / 2 = 1500
    expect(data.averageViewCount).toBe(1500);

    // topKeywords: "keyword1", "keyword2", "video", "with" etc.
    expect(data.topKeywords.length).toBeGreaterThan(0);

    // uploadCadenceDays: (2026-06-10 - 2026-06-05) = 5 days diff. (5 / (2-1)) = 5
    expect(data.uploadCadenceDays).toBe(5);

    // bestVideos (sorted by views descending: v2 (2000) then v1 (1000))
    expect(data.bestVideos[0].id).toBe("v2");
    expect(data.bestVideos[1].id).toBe("v1");

    // Check we called searchVideoIds for top 2 keywords
    expect(mockSearchVideoIds).toHaveBeenCalledTimes(2);

    // Check hydrateVideos was only called for non-trending search IDs
    // Search returns ["trend1", "search1"], trending has "trend1".
    // So only "search1" needs hydration.
    // First hydration is for recent video IDs ["v1", "v2"], second hydration is for ["search1"].
    expect(mockHydrateVideos).toHaveBeenCalledWith(["v1", "v2"]);
    expect(mockHydrateVideos).toHaveBeenCalledWith(["search1"]);
    
    // Total trends and recommendations checks
    expect(data.trends.length).toBeGreaterThan(0);
    expect(data.recommendations.length).toBeGreaterThan(0);
  });

  it("returns 503 if NO_KEY is thrown", async () => {
    vi.mocked(getConfig).mockImplementation(() => {
      throw Object.assign(new Error("No API Key"), { code: "NO_KEY" });
    });

    const response = await GET();
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toContain("No API Key");
  });

  it("returns 404 if NOT_FOUND is thrown", async () => {
    vi.mocked(getConfig).mockReturnValue({
      apiKey: "test-api-key",
      channelHandle: "@unknown",
      regionCode: "KR",
    });

    const mockClient = {
      resolveChannelId: vi.fn().mockRejectedValue(
        Object.assign(new Error("Channel not found"), { code: "NOT_FOUND" })
      ),
      getRecentVideoIds: vi.fn(),
      getTrending: vi.fn(),
      searchVideoIds: vi.fn(),
      hydrateVideos: vi.fn(),
    };
    vi.mocked(createYoutubeClient).mockReturnValue(mockClient);

    const response = await GET();
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain("Channel not found");
  });

  it("returns 429 if QUOTA is thrown", async () => {
    vi.mocked(getConfig).mockReturnValue({
      apiKey: "test-api-key",
      channelHandle: "@quota",
      regionCode: "KR",
    });

    const mockClient = {
      resolveChannelId: vi.fn().mockRejectedValue(
        Object.assign(new Error("Quota exceeded"), { code: "QUOTA" })
      ),
      getRecentVideoIds: vi.fn(),
      getTrending: vi.fn(),
      searchVideoIds: vi.fn(),
      hydrateVideos: vi.fn(),
    };
    vi.mocked(createYoutubeClient).mockReturnValue(mockClient);

    const response = await GET();
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toContain("Quota exceeded");
  });

  it("returns 500 for general errors", async () => {
    vi.mocked(getConfig).mockReturnValue({
      apiKey: "test-api-key",
      channelHandle: "@general",
      regionCode: "KR",
    });

    const mockClient = {
      resolveChannelId: vi.fn().mockRejectedValue(new Error("Random crash")),
      getRecentVideoIds: vi.fn(),
      getTrending: vi.fn(),
      searchVideoIds: vi.fn(),
      hydrateVideos: vi.fn(),
    };
    vi.mocked(createYoutubeClient).mockReturnValue(mockClient);

    const response = await GET();
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain("Random crash");
  });
});
