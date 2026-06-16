// 환경변수 읽기/검증. 서버에서만 호출된다 (라우트 핸들러).

export interface AppConfig {
  apiKey: string;
  channelHandle: string;
  regionCode: string;
}

/**
 * 런타임 환경변수에서 설정을 읽는다.
 * `YOUTUBE_API_KEY`가 없으면 `code: 'NO_KEY'` 속성을 가진 일반 `Error`를 throw한다.
 * (에러 클래스 계층을 만들지 않는다 — MVP)
 */
export function getConfig(): AppConfig {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error(
        "YOUTUBE_API_KEY가 설정되지 않았습니다. .env.local에 YouTube Data API v3 키를 추가하세요.",
      ),
      { code: "NO_KEY" },
    );
  }

  return {
    apiKey,
    channelHandle: process.env.YOUTUBE_CHANNEL_HANDLE ?? "",
    regionCode: process.env.YOUTUBE_REGION_CODE || "KR",
  };
}
