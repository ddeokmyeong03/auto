// MBTI 쇼츠 스크립트 프롬프트 템플릿

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

const MBTI_TOPICS = [
  '화날 때 행동',
  '연애할 때 특징',
  '친구 사귀는 방식',
  '스트레스 해소법',
  '싫어하는 것',
  '좋아하는 것',
  '직장에서 모습',
  '잠 못 잘 때 생각',
  '여행 스타일',
  '쇼핑 스타일',
  '음식 고를 때',
  '감동받는 순간',
  '절대 하지 않는 것',
  '아무도 모르는 내면',
  '호감 표현 방식',
];

/**
 * 단일 MBTI 타입에 대한 쇼츠 스크립트 생성 프롬프트
 * @param {string} mbtiType - MBTI 유형 (예: 'INTJ')
 * @param {string} topic - 주제
 * @returns {string} Claude API에 전달할 프롬프트
 */
function getMbtiScriptPrompt(mbtiType, topic) {
  return `당신은 MBTI 콘텐츠 전문 크리에이터입니다.
아래 조건에 맞는 유튜브/인스타그램 쇼츠 스크립트를 작성해주세요.

조건:
- MBTI 유형: ${mbtiType}
- 주제: "${topic}"
- 영상 길이: 30~45초 (말하는 속도 기준 약 80~120자)
- 자막용 텍스트이므로 짧고 임팩트 있게 작성
- 한국어 사용, 반말체
- 공감 유도형으로 작성 (예: "이거 너무 공감되지 않아?")
- 마지막에 좋아요/구독 유도 멘트 포함

JSON 형식으로 반환:
{
  "title": "영상 제목 (이모지 포함, 30자 이내)",
  "script": "나레이션 스크립트 (자막에 들어갈 전체 텍스트)",
  "hashtags": ["해시태그1", "해시태그2", ...] (10개),
  "description": "유튜브/인스타 설명란 텍스트 (150자 이내)"
}`;
}

/**
 * 랜덤 MBTI 타입과 주제를 선택하여 프롬프트 생성
 * @returns {{mbtiType: string, topic: string, prompt: string}}
 */
function getRandomMbtiPrompt() {
  const mbtiType = MBTI_TYPES[Math.floor(Math.random() * MBTI_TYPES.length)];
  const topic = MBTI_TOPICS[Math.floor(Math.random() * MBTI_TOPICS.length)];
  return {
    mbtiType,
    topic,
    prompt: getMbtiScriptPrompt(mbtiType, topic),
  };
}

/**
 * 오늘 날짜 기준으로 5개의 MBTI 프롬프트 생성 (중복 최소화)
 * @returns {Array<{mbtiType: string, topic: string, prompt: string}>}
 */
function getDailyMbtiPrompts(count = 5) {
  const usedCombos = new Set();
  const prompts = [];

  while (prompts.length < count) {
    const mbtiType = MBTI_TYPES[Math.floor(Math.random() * MBTI_TYPES.length)];
    const topic = MBTI_TOPICS[Math.floor(Math.random() * MBTI_TOPICS.length)];
    const key = `${mbtiType}-${topic}`;

    if (!usedCombos.has(key)) {
      usedCombos.add(key);
      prompts.push({
        mbtiType,
        topic,
        prompt: getMbtiScriptPrompt(mbtiType, topic),
      });
    }
  }

  return prompts;
}

module.exports = {
  MBTI_TYPES,
  MBTI_TOPICS,
  getMbtiScriptPrompt,
  getRandomMbtiPrompt,
  getDailyMbtiPrompts,
};
