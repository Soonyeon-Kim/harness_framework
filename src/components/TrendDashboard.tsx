"use client";

import { useEffect, useState } from "react";
import type { TrendReport } from "@/types";
import ChannelSummary from "./ChannelSummary";
import TrendList from "./TrendList";
import RecommendationCard from "./RecommendationCard";

export default function TrendDashboard() {
  const [data, setData] = useState<TrendReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze");
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `API 요청 실패 (HTTP ${res.status})`);
      }
      const report: TrendReport = await res.json();
      setData(report);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "데이터를 불러오는 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 animate-fadeIn text-neutral-400">
        <svg
          className="animate-spin h-5 w-5 text-neutral-500"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-xs font-medium tracking-wide">내 채널 및 YouTube 트렌드 데이터를 분석하고 있습니다...</span>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-6 flex flex-col gap-4 max-w-xl animate-fadeIn">
        <div>
          <h2 className="text-sm font-semibold text-red-500">데이터 분석 실패</h2>
          <p className="text-xs text-red-400/80 mt-1">
            YouTube API 처리 혹은 설정을 불러오는 과정에서 에러가 발생했습니다.
          </p>
        </div>
        <div className="text-sm text-neutral-300 font-mono bg-neutral-950 p-4 rounded border border-neutral-900 overflow-x-auto">
          {error}
        </div>
        <button
          onClick={fetchData}
          className="self-start rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors text-xs font-medium px-4 py-2"
        >
          다시 요청하기
        </button>
      </div>
    );
  }

  // 3. Empty State
  if (!data || (!data.trends.length && !data.recommendations.length)) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-[#141414] p-8 text-center flex flex-col items-center gap-4 animate-fadeIn">
        <span className="text-sm text-neutral-400">표시할 분석 데이터가 존재하지 않습니다.</span>
        <button
          onClick={fetchData}
          className="rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-medium px-4 py-2"
        >
          분석 시작하기
        </button>
      </div>
    );
  }

  // 4. Success State
  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-neutral-900 pb-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">NextPick</h1>
          <p className="text-xs text-neutral-500 mt-1">
            내 YouTube 채널 분석 및 니치 트렌드에 기반한 맞춤형 콘텐츠 추천
          </p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-medium px-4 py-2.5 flex items-center gap-1.5"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          새로고침
        </button>
      </div>

      {/* ① Channel Summary Section */}
      <ChannelSummary
        profile={data.channel}
        averageViewCount={data.averageViewCount}
        topKeywords={data.topKeywords}
        uploadCadenceDays={data.uploadCadenceDays}
        bestVideos={data.bestVideos}
      />

      {/* ② Recommendations and Trends list split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Recommendations Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-medium text-neutral-400">추천 콘텐츠 아이디어</h2>
          <div className="flex flex-col gap-4">
            {data.recommendations.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} />
            ))}
          </div>
        </div>

        {/* Trends List Column */}
        <div className="lg:col-span-1">
          <TrendList trends={data.trends} />
        </div>
      </div>
    </div>
  );
}
