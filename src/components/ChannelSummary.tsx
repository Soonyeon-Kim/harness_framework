import type { ChannelProfile, VideoSummary } from "@/types";

interface ChannelSummaryProps {
  profile: ChannelProfile;
  averageViewCount: number;
  topKeywords: string[];
  uploadCadenceDays: number;
  bestVideos: VideoSummary[];
}

export default function ChannelSummary({
  profile,
  averageViewCount,
  topKeywords,
  uploadCadenceDays,
  bestVideos,
}: ChannelSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity duration-300 animate-fadeIn">
      {/* Channel Profile and Metrics */}
      <div className="md:col-span-2 rounded-lg bg-[#141414] border border-neutral-800 p-6 flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-sm font-medium text-neutral-400">내 채널 요약</h2>
            <h1 className="text-xl font-semibold text-white mt-1">{profile.title}</h1>
            <p className="text-xs text-neutral-500">{profile.handle}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-neutral-500">구독자 / 총 영상수</span>
            <div className="text-sm font-medium text-neutral-300 mt-0.5">
              {profile.subscriberCount.toLocaleString()}명 / {profile.videoCount.toLocaleString()}개
            </div>
          </div>
        </div>

        {/* 3 Core Numeric Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-900">
          <div>
            <span className="text-xs font-medium text-neutral-400">평균 조회수</span>
            <div className="text-2xl font-semibold text-white mt-1 tabular-nums">
              {averageViewCount.toLocaleString()}
              <span className="text-xs text-neutral-500 font-normal ml-1">회</span>
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">최근 25개 영상 기준</p>
          </div>

          <div>
            <span className="text-xs font-medium text-neutral-400">평균 업로드 주기</span>
            <div className="text-2xl font-semibold text-white mt-1 tabular-nums">
              {uploadCadenceDays > 0 ? `${uploadCadenceDays}일` : "정보 없음"}
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">최근 25개 영상 간격 기준</p>
          </div>
        </div>

        {/* Top Keywords */}
        <div className="pt-4 border-t border-neutral-900">
          <span className="text-xs font-medium text-neutral-400 block mb-2">
            주력 키워드 (Top 5)
          </span>
          {topKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {topKeywords.map((keyword, index) => (
                <span
                  key={keyword}
                  className="px-2 py-1 text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 rounded"
                >
                  <span className="text-neutral-500 mr-1">{index + 1}.</span>
                  {keyword}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-neutral-500">추출된 키워드가 없습니다.</span>
          )}
        </div>
      </div>

      {/* Best Videos TOP 3 */}
      <div className="rounded-lg bg-[#141414] border border-neutral-800 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium text-neutral-400">인기 영상 TOP 3</h2>
          <p className="text-xs text-neutral-500 mt-1">최근 업로드 영상 중 조회수가 가장 높은 3개입니다.</p>
        </div>

        <div className="flex flex-col gap-3 mt-2 divide-y divide-neutral-900">
          {bestVideos.map((video, idx) => (
            <div key={video.id} className="pt-3 first:pt-0 flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <span className="text-xs text-neutral-500 font-semibold mt-0.5">{idx + 1}.</span>
                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-neutral-300 hover:text-[#22c55e] transition-colors line-clamp-2 leading-relaxed"
                >
                  {video.title}
                </a>
              </div>
              <span className="text-[10px] text-neutral-500 tabular-nums pl-4">
                조회수 {video.viewCount.toLocaleString()}회
              </span>
            </div>
          ))}
          {bestVideos.length === 0 && (
            <div className="text-xs text-neutral-500 py-4 text-center">조회된 영상이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
