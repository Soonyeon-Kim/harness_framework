import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextPick",
  description: "내 YouTube 채널을 분석해 다음에 만들 콘텐츠를 추천하는 대시보드 (MVP)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="bg-[#0a0a0a] text-white antialiased">{children}</body>
    </html>
  );
}
