/**
 * ElevenLabs API를 사용하여 TTS 음성 파일을 생성하는 모듈
 * 독립 실행: node src/voice/elevenlabs.js
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const LOG_DIR = process.env.LOG_DIR || './output/logs';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeLog(filename, content) {
  ensureDir(LOG_DIR);
  fs.writeFileSync(path.join(LOG_DIR, filename), content, 'utf8');
}

/**
 * 텍스트를 음성 파일로 변환
 * @param {string} text - 변환할 텍스트
 * @param {string} outputPath - 저장할 경로 (.mp3)
 * @returns {Promise<string|null>} 저장된 파일 경로 or null
 */
async function textToSpeech(text, outputPath) {
  if (!API_KEY || !VOICE_ID) {
    throw new Error('ELEVENLABS_API_KEY 또는 ELEVENLABS_VOICE_ID가 설정되지 않았습니다.');
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
      }
    );

    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, response.data);
    console.log(`[OK] 음성 생성 완료: ${outputPath}`);
    return outputPath;
  } catch (err) {
    const msg = err.response
      ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
      : err.message;
    console.error(`[ERROR] 음성 생성 실패:`, msg);
    writeLog(`error_voice_${Date.now()}.txt`, msg);
    return null;
  }
}

/**
 * 스크립트 배열로부터 음성 파일 일괄 생성
 * @param {Array<{type, meta, content}>} scripts - generateDailyScripts() 결과
 * @returns {Promise<Array<{script, audioPath}>>}
 */
async function generateDailyVoices(scripts) {
  const today = new Date().toISOString().slice(0, 10);
  const voiceDir = path.join(OUTPUT_DIR, 'voices', today);
  ensureDir(voiceDir);

  const results = [];

  for (let i = 0; i < scripts.length; i++) {
    const { type, meta, content } = scripts[i];
    const label = type === 'mbti'
      ? `${meta.mbtiType}_${meta.topic}`
      : `${meta.zodiac || 'common'}_${meta.topic}`;
    const filename = `${String(i + 1).padStart(2, '0')}_${type}_${label.replace(/\s/g, '_')}.mp3`;
    const outputPath = path.join(voiceDir, filename);

    const audioPath = await textToSpeech(content.script, outputPath);
    results.push({ script: scripts[i], audioPath });
  }

  console.log(`\n음성 생성 완료: ${results.filter(r => r.audioPath).length}/${scripts.length}개`);
  return results;
}

// 독립 실행 시 (테스트용)
if (require.main === module) {
  const testText = 'INTJ는 화가 나도 절대 티를 내지 않아. 속으로 다 기억하고 있거든. 공감되면 좋아요 눌러줘!';
  const testPath = path.join(OUTPUT_DIR, 'test_voice.mp3');
  textToSpeech(testText, testPath).catch(console.error);
}

module.exports = { textToSpeech, generateDailyVoices };
