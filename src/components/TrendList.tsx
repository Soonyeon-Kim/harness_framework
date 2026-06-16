import type { ScoredCandidate } from "@/types";

interface TrendListProps {
  trends: ScoredCandidate[];
}

export default function TrendList({ trends }: TrendListProps) {
  return (
    <div className="rounded-lg bg-[#141414] border border-neutral-800 p-6 flex flex-col gap-6 transition-opacity duration-300 animate-fadeIn">
      <div>
        <h2 className="text-sm font-medium text-neutral-400">지금 뜨는 트렌드 후보군</h2>
        <p className="text-xs text-neutral-500 mt-1">
          조회속도(Virality)와 관련도를 기준으로 정렬된 후보 영상 리스트입니다.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-xs text-neutral-500 font-medium">
              <th className="pb-3 font-medium">영상 정보</th>
              <th className="pb-3 text-right font-medium pr-4">조회속도 (일평균)</th>
              <th className="pb-3 text-right font-medium">관련도</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {trends.map(({ video, virality, relevance, matchedKeywords }, idx) => {
              const watchUrl = `https://www.youtube.com/watch?v=${video.id}`;
              return (
                <tr key={`${video.id}-${idx}`} className="group hover:bg-neutral-900/30 transition-colors">
                  <td className="py-4 pr-4 max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg">
                    <div className="flex flex-col gap-1">
                      <a
                        href={watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-[#22c55e] transition-colors font-medium line-clamp-1 leading-snug"
                      >
                        {video.title}
                      </a>
                      <span className="text-xs text-neutral-500">{video.channelTitle}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right tabular-nums pr-4 font-semibold text-neutral-200">
                    {Math.round(virality).toLocaleString()}회
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="tabular-nums font-semibold text-neutral-200">
                        {Math.round(relevance * 100)}%
                      </span>
                      {matchedKeywords.length > 0 && (
                        <span className="text-[10px] text-neutral-500 truncate max-w-[120px]">
                          {matchedKeywords.join(", ")}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
