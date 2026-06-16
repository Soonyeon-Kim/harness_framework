import type { Recommendation } from "@/types";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export default function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const { title, rationale, matchedKeywords, score, source, sourceUrl } =
    recommendation;

  return (
    <div className="rounded-lg bg-[#141414] border border-neutral-800 p-6 flex flex-col gap-4 transition-opacity duration-300 animate-fadeIn">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-white leading-snug">
          {title}
        </h3>
        <span className="text-2xl font-semibold text-[#22c55e] tabular-nums shrink-0">
          {Math.round(score)}
          <span className="text-xs text-neutral-500 font-medium ml-0.5">점</span>
        </span>
      </div>

      <p className="text-sm text-neutral-300 leading-relaxed">{rationale}</p>

      {matchedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matchedKeywords.map((keyword) => (
            <span
              key={keyword}
              className="px-2 py-0.5 text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 rounded"
            >
              #{keyword}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-neutral-900 flex justify-between items-center text-xs">
        <span className="text-neutral-500">
          출처: <span className="text-neutral-400 font-medium">{source.channelTitle}</span>
        </span>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1 font-medium"
        >
          원본 영상 보기
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
