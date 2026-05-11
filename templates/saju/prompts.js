// 사주 쇼츠 스크립트 프롬프트 템플릿

const BIRTH_ELEMENTS = ['갑목', '을목', '병화', '정화', '무토', '기토', '경금', '신금', '임수', '계수'];

const SAJU_TOPICS = [
  '2026년 하반기 운세',
  '올해 금전운',
  '연애운 & 결혼운',
  '직업운 & 직장운',
  '건강 주의 사항',
  '이달의 행운 컬러',
  '피해야 할 날',
  '귀인을 만나는 시기',
  '재물을 부르는 방법',
  '숨겨진 재능',
  '전생에서 온 인연',
  '운을 높이는 음식',
  '이번 달 조심할 것',
  '성공 가능성이 높은 분야',
  '타고난 성격의 비밀',
];

const ZODIAC_SIGNS = [
  '자(쥐)', '축(소)', '인(호랑이)', '묘(토끼)',
  '진(용)', '사(뱀)', '오(말)', '미(양)',
  '신(원숭이)', '유(닭)', '술(개)', '해(돼지)'
];

/**
 * 사주/운세 쇼츠 스크립트 생성 프롬프트
 * @param {string} topic - 주제
 * @param {string|null} zodiac - 띠 (선택)
 * @returns {string}
 */
function getSajuScriptPrompt(topic, zodiac = null) {
  const target = zodiac ? `${zodiac}띠` : '모든 띠 공통';
  return `당신은 사주·운세 콘텐츠 전문 크리에이터입니다.
아래 조건에 맞는 유튜브/인스타그램 쇼츠 스크립트를 작성해주세요.

조건:
- 대상: ${target}
- 주제: "${topic}"
- 영상 길이: 30~45초 (자막 기준 약 80~120자)
- 한국어 사용, 친근하고 신비로운 어조
- 구체적인 수치나 날짜로 신뢰감 부여 (예: "5월 15일~20일 주의")
- 마지막에 좋아요/저장 유도 멘트 포함
- 과도한 공포 유발 금지, 긍정적 방향 제시

JSON 형식으로 반환:
{
  "title": "영상 제목 (이모지 포함, 30자 이내)",
  "script": "나레이션 스크립트 (자막에 들어갈 전체 텍스트)",
  "hashtags": ["해시태그1", "해시태그2", ...] (10개),
  "description": "유튜브/인스타 설명란 텍스트 (150자 이내)"
}`;
}

/**
 * 랜덤 사주 프롬프트 생성
 * @returns {{topic: string, zodiac: string|null, prompt: string}}
 */
function getRandomSajuPrompt() {
  const topic = SAJU_TOPICS[Math.floor(Math.random() * SAJU_TOPICS.length)];
  // 50% 확률로 특정 띠 대상, 나머지는 공통
  const zodiac = Math.random() > 0.5
    ? ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)]
    : null;
  return {
    topic,
    zodiac,
    prompt: getSajuScriptPrompt(topic, zodiac),
  };
}

/**
 * 오늘의 사주 프롬프트 5개 생성
 * @param {number} count
 * @returns {Array}
 */
function getDailySajuPrompts(count = 5) {
  const usedCombos = new Set();
  const prompts = [];

  while (prompts.length < count) {
    const topic = SAJU_TOPICS[Math.floor(Math.random() * SAJU_TOPICS.length)];
    const zodiac = Math.random() > 0.5
      ? ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)]
      : null;
    const key = `${topic}-${zodiac || 'common'}`;

    if (!usedCombos.has(key)) {
      usedCombos.add(key);
      prompts.push({
        topic,
        zodiac,
        prompt: getSajuScriptPrompt(topic, zodiac),
      });
    }
  }

  return prompts;
}

module.exports = {
  BIRTH_ELEMENTS,
  SAJU_TOPICS,
  ZODIAC_SIGNS,
  getSajuScriptPrompt,
  getRandomSajuPrompt,
  getDailySajuPrompts,
};
