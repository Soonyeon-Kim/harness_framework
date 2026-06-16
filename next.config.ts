import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더(Project/)의 고아 package-lock.json 때문에 Next가 workspace 루트를
  // 잘못 추론하던 것을 이 프로젝트 폴더로 고정한다. dev 모드 RSC 클라이언트
  // 매니페스트의 모듈 경로가 어긋나 발생하던 500(__webpack_modules__ ...)을 막는다.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
