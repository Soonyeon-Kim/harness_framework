import { NextResponse } from "next/server";
import { getConfig } from "@/lib/env";
import { createYoutubeClient } from "@/services/youtube";
import {
  extractKeywords,
  rankCandidates,
  buildRecommendations,
} from "@/lib/scoring";
import type { TrendReport } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const now = new Date();

  try {
    // 1. Get configurations from environment variables
    const { apiKey, channelHandle, regionCode } = getConfig();

    // 2. Initialize YouTube Client
    const client = createYoutubeClient({ apiKey });

    // 3. Resolve target channel ID and upload playlist ID
    const { uploadsPlaylistId, profile } = await client.resolveChannelId(channelHandle);

    // 4. Fetch recent video IDs and hydrate them
    const recentVideoIds = await client.getRecentVideoIds(uploadsPlaylistId, 25);
    const myVideos = await client.hydrateVideos(recentVideoIds);

    // 5. Extract top 5 keywords from my video titles
    const myVideoTitles = myVideos.map((v) => v.title);
    const channelKeywords = extractKeywords(myVideoTitles, 5);

    // 6. Fetch trending videos for the region
    const trendingVideos = await client.getTrending(regionCode);

    // 7. Perform keyword search for top 2 keywords
    const top2Keywords = channelKeywords.slice(0, 2);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const publishedAfter = thirtyDaysAgo.toISOString();

    const searchIdPromises = top2Keywords.map((keyword) =>
      client.searchVideoIds(keyword, publishedAfter)
    );
    const searchIdResults = await Promise.all(searchIdPromises);
    const searchIds = searchIdResults.flat();

    // 8. Deduplicate and filter out videos already in the trending list
    const trendingMap = new Map(trendingVideos.map((v) => [v.id, v]));
    const uniqueSearchIds = [...new Set(searchIds)];
    const idsToHydrate = uniqueSearchIds.filter((id) => !trendingMap.has(id));

    // Hydrate stats for search videos
    const hydratedSearchVideos = await client.hydrateVideos(idsToHydrate);

    // Combine trending and search videos to build candidates list
    const candidates = [...trendingVideos, ...hydratedSearchVideos];

    // 9. Score and rank candidates, then build recommendations
    const rankedCandidates = rankCandidates(candidates, channelKeywords, now);
    const recommendations = buildRecommendations(rankedCandidates, channelKeywords);

    // 10. Calculate the 4 key channel analytics metrics
    const averageViewCount =
      myVideos.length > 0
        ? Math.round(myVideos.reduce((sum, v) => sum + v.viewCount, 0) / myVideos.length)
        : 0;

    let uploadCadenceDays = 0;
    if (myVideos.length > 1) {
      const sortedMyVideos = [...myVideos].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      const newestTime = new Date(sortedMyVideos[0].publishedAt).getTime();
      const oldestTime = new Date(sortedMyVideos[sortedMyVideos.length - 1].publishedAt).getTime();
      const diffDays = (newestTime - oldestTime) / (1000 * 60 * 60 * 24);
      uploadCadenceDays = Number((diffDays / (sortedMyVideos.length - 1)).toFixed(1));
    }

    const bestVideos = [...myVideos]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 3);

    // 11. Prepare TrendReport
    const report: TrendReport = {
      channel: profile,
      averageViewCount,
      topKeywords: channelKeywords,
      uploadCadenceDays,
      bestVideos,
      trends: rankedCandidates,
      recommendations,
    };

    return NextResponse.json(report, {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string } | null | undefined;
    const code = err?.code;
    let status = 500;

    if (code === "NO_KEY") {
      status = 503;
    } else if (code === "NOT_FOUND") {
      status = 404;
    } else if (code === "QUOTA") {
      status = 429;
    }

    return NextResponse.json(
      { error: err?.message || "알 수 없는 서버 에러가 발생했습니다." },
      {
        status,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  }
}
