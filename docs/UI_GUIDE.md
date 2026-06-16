# UI 디자인 가이드

## 디자인 원칙
1. 도구처럼 보여야 한다. 마케팅 페이지가 아니라 매일 쓰는 분석 대시보드.
2. 데이터 밀도 우선. 숫자와 근거가 한눈에 들어오게, 장식은 최소.
3. 위계는 타이포·간격·1색 포인트로만. 화려한 색/그림자에 의존하지 않는다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |

## 색상
### 배경
| 용도 | 값 |
|------|------|
| 페이지 | #0a0a0a |
| 카드 | #141414 |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트 | text-white |
| 본문 | text-neutral-300 |
| 보조 | text-neutral-400 |
| 비활성 | text-neutral-500 |

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| 상승/긍정 (조회속도·추천점수) | #22c55e |
| 부정/에러 | #ef4444 |
| 중립/기본 | #525252 |

## 컴포넌트
### 카드
```
rounded-lg bg-[#141414] border border-neutral-800 p-6
```

### 버튼
```
Primary: rounded-lg bg-white text-black hover:bg-neutral-200
Text:    text-neutral-500 hover:text-neutral-300
```

### 입력 필드
```
rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3
```
(MVP는 완전 자동이라 입력 필드는 거의 없음 — 새로고침 버튼 위주)

## 레이아웃
- 전체 너비: max-w-5xl mx-auto px-6
- 정렬: 좌측 정렬 기본. 중앙 정렬 금지.
- 간격: 카드 내부 gap-3~4, 섹션 간 space-y-8

## 타이포그래피
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | text-3xl font-semibold text-white |
| 섹션/카드 제목 | text-sm font-medium text-neutral-400 |
| 본문 | text-sm text-neutral-300 leading-relaxed |
| 수치(지표) | text-2xl font-semibold text-white tabular-nums |

## 애니메이션
- fade-in (0.4s) 만 허용.
- 그 외 모든 애니메이션 금지 (글로우/바운스/무한 루프 금지).

## 아이콘
- SVG 인라인, strokeWidth 1.5
- 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다. 이모지 남용 금지.
