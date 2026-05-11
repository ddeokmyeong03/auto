# CLAUDE.md — Shorts Automation Project

## 프로젝트 개요
MBTI / 사주 관련 유튜브 & 인스타그램 쇼츠를 자동으로 생성하고 업로드하는 시스템.
최종 목표는 이 시스템 자체를 외주 및 디지털 상품으로 판매하여 2026년 6월 30일까지 총 매출 1,000만원 달성.

## 사업 목표
- 마감: 2026년 6월 30일
- 목표 매출: 10,000,000원
- 수익 구조:
  - 외주 수주 (크몽): 건당 200만원 × 3건 = 600만원
  - 디지털 상품 판매: 49,000원 × 82개 = 400만원

## 기술 스택
- Runtime: Node.js
- 스크립트 생성: Anthropic Claude API (claude-sonnet-4-20250514)
- 음성 생성: ElevenLabs API
- 영상 합성: Remotion + FFmpeg
- 썸네일: Canva API
- 업로드: YouTube Data API v3, Instagram Graph API
- 자동화 실행: GitHub Actions (매일 오전 6시 KST)
- 환경변수 관리: .env (절대 커밋 금지)

## 프로젝트 구조
```
shorts-automation/
├── CLAUDE.md               ← 현재 파일
├── README.md               ← 외부 공개용 설명
├── .env.example            ← 환경변수 템플릿
├── .gitignore
├── package.json
├── src/
│   ├── generator/
│   │   └── script.js       ← Claude API로 스크립트 생성
│   ├── voice/
│   │   └── elevenlabs.js   ← TTS 음성 생성
│   ├── video/
│   │   └── compose.js      ← FFmpeg 영상 합성
│   ├── thumbnail/
│   │   └── canva.js        ← 썸네일 자동 생성
│   ├── upload/
│   │   ├── youtube.js      ← 유튜브 자동 업로드
│   │   └── instagram.js    ← 인스타 릴스 자동 업로드
│   └── pipeline.js         ← 전체 파이프라인 실행 진입점
├── templates/
│   ├── mbti/
│   │   └── prompts.js      ← MBTI 스크립트 프롬프트 모음
│   └── saju/
│       └── prompts.js      ← 사주 스크립트 프롬프트 모음
├── output/                 ← 생성된 영상 임시 저장 (gitignore)
└── .github/
    └── workflows/
        └── daily.yml       ← GitHub Actions 자동 실행
```

## 개발 원칙
1. 각 모듈은 독립적으로 테스트 가능하게 작성할 것
2. API 키는 절대 하드코딩 금지, 반드시 .env 사용
3. 각 단계(스크립트→음성→영상→업로드)는 개별 실행 가능하게 분리
4. 에러 발생 시 로그를 output/logs/ 에 저장하고 다음 항목으로 넘어갈 것
5. 하루 생성 기본값: MBTI 5개 + 사주 5개 = 총 10개

## 콘텐츠 전략
- 영상 길이: 30~45초
- 자막: 한국어, 큰 폰트, 중앙 정렬
- 배경: 템플릿 기반 (색상 테마별 분류)
- 업로드 시간: 매일 오전 7시, 12시, 저녁 7시 (예약 업로드)
- 해시태그: 자동 생성 (Claude API 활용)

## 판매 전략
- 1차 포트폴리오: 본인 채널 30일 운영 실적으로 증명
- 크몽 등록 카테고리: IT·프로그래밍 > 업무자동화
- 상품명 예시: "유튜브/인스타 쇼츠 자동화 시스템 구축 (하루 10개 자동 생성)"
- 디지털 상품: 소스코드 + 설치 가이드 + 프롬프트 템플릿 패키지

## 현재 진행 상태
- [ ] 프로젝트 초기 세팅
- [ ] Claude API 스크립트 생성 모듈
- [ ] ElevenLabs 음성 생성 모듈
- [ ] FFmpeg 영상 합성 모듈
- [ ] YouTube 자동 업로드 모듈
- [ ] Instagram 자동 업로드 모듈
- [ ] GitHub Actions 파이프라인 연결
- [ ] 테스트 영상 10개 생성 완료
- [ ] 크몽 상품 등록
- [ ] 첫 외주 수주
- [ ] 매출 1,000만원 달성