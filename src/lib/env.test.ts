import { describe, it, expect, afterEach, vi } from "vitest";
import { getConfig } from "./env";

function errorCode(e: unknown): string | undefined {
  return (e as { code?: string }).code;
}

describe("getConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws an Error with code NO_KEY when YOUTUBE_API_KEY is missing", () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    vi.stubEnv("YOUTUBE_CHANNEL_HANDLE", "@me");

    let err: unknown;
    try {
      getConfig();
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(Error);
    expect(errorCode(err)).toBe("NO_KEY");
  });

  it("returns apiKey, channelHandle and regionCode when configured", () => {
    vi.stubEnv("YOUTUBE_API_KEY", "real-key");
    vi.stubEnv("YOUTUBE_CHANNEL_HANDLE", "@me");
    vi.stubEnv("YOUTUBE_REGION_CODE", "KR");

    expect(getConfig()).toEqual({
      apiKey: "real-key",
      channelHandle: "@me",
      regionCode: "KR",
    });
  });

  it("defaults regionCode to KR when unset", () => {
    vi.stubEnv("YOUTUBE_API_KEY", "real-key");
    vi.stubEnv("YOUTUBE_CHANNEL_HANDLE", "@me");
    vi.stubEnv("YOUTUBE_REGION_CODE", "");

    expect(getConfig().regionCode).toBe("KR");
  });
});
