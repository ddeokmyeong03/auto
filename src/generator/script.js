/**
 * Claude API를 사용하여 MBTI/사주 쇼츠 스크립트를 생성하는 모듈
 * 독립 실행: node src/generator/script.js
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const { getDailyMbtiPrompts } = require('../../templates/mbti/prompts');
const { getDailySajuPrompts } = require('../../templates/saju/prompts');

const LOG_DIR = process.env.LOG_DIR || './output/logs';
const MBTI_COUNT = parseInt(process.env.DAILY_MBTI_COUNT || '5');
const SAJU_COUNT = parseInt(process.env.DAILY_SAJU_COUNT || '5');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeLog(filename, content) {
  ensureDir(LOG_DIR);
  fs.writeFileSync(path.join(LOG_DIR, filename), content, 'utf8');
}

/**
 * Claude API를 호출하여 스크립트 생성
 * @param {string} prompt
 * @param {string} label - 로그용 레이블
 * @returns {Promise<{title, script, hashtags, description}|null>}
 */
async function generateScript(prompt, label) {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text;

    // JSON 파싱 시도
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON not found in response');

    const result = JSON.parse(jsonMatch[0]);
    console.log(`[OK] ${label} 스크립트 생성 완료: ${result.title}`);
    return result;
  } catch (err) {
    console.error(`[ERROR] ${label} 스크립트 생성 실패:`, err.message);
    writeLog(`error_${label}_${Date.now()}.txt`, `${label}\n${err.message}`);
    return null;
  }
}

/**
 * 오늘의 MBTI + 사주 스크립트 전체 생성
 * @returns {Promise<Array<{type, meta, content}>>}
 */
async function generateDailyScripts() {
  const results = [];

  const mbtiPrompts = getDailyMbtiPrompts(MBTI_COUNT);
  const sajuPrompts = getDailySajuPrompts(SAJU_COUNT);

  console.log(`\nMBTI 스크립트 생성 시작 (${MBTI_COUNT}개)...`);
  for (const item of mbtiPrompts) {
    const label = `MBTI_${item.mbtiType}_${item.topic}`;
    const content = await generateScript(item.prompt, label);
    if (content) {
      results.push({ type: 'mbti', meta: { mbtiType: item.mbtiType, topic: item.topic }, content });
    }
  }

  console.log(`\n사주 스크립트 생성 시작 (${SAJU_COUNT}개)...`);
  for (const item of sajuPrompts) {
    const label = `SAJU_${item.zodiac || 'common'}_${item.topic}`;
    const content = await generateScript(item.prompt, label);
    if (content) {
      results.push({ type: 'saju', meta: { zodiac: item.zodiac, topic: item.topic }, content });
    }
  }

  // 결과 저장
  const today = new Date().toISOString().slice(0, 10);
  const outputPath = path.join(process.env.OUTPUT_DIR || './output', `scripts_${today}.json`);
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n스크립트 저장 완료: ${outputPath} (총 ${results.length}개)`);

  return results;
}

// 독립 실행 시
if (require.main === module) {
  generateDailyScripts().catch((err) => {
    console.error('치명적 오류:', err);
    process.exit(1);
  });
}

module.exports = { generateScript, generateDailyScripts };
