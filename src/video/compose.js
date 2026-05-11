/**
 * FFmpeg를 사용하여 음성 + 배경 + 자막을 합성하는 영상 생성 모듈
 * 독립 실행: node src/video/compose.js
 */

require('dotenv').config();
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';
const LOG_DIR = process.env.LOG_DIR || './output/logs';

// 배경 테마 컬러 (type별)
const THEMES = {
  mbti: [
    { bg: '#1a1a2e', text: '#e94560' }, // 다크 레드
    { bg: '#16213e', text: '#0f3460' }, // 딥 블루
    { bg: '#0f3460', text: '#e94560' }, // 네이비 레드
  ],
  saju: [
    { bg: '#2d1b69', text: '#f9c74f' }, // 퍼플 골드
    { bg: '#1b1b2f', text: '#e2d9f3' }, // 다크 라벤더
    { bg: '#162447', text: '#e43f5a' }, // 딥블루 레드
  ],
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeLog(filename, content) {
  ensureDir(LOG_DIR);
  fs.writeFileSync(path.join(LOG_DIR, filename), content, 'utf8');
}

/**
 * 자막 텍스트를 30자 단위로 줄바꿈
 */
function wrapText(text, maxLen = 20) {
  const lines = [];
  let current = '';
  for (const char of text) {
    current += char;
    if (current.length >= maxLen) {
      lines.push(current);
      current = '';
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

/**
 * 음성 파일 + 텍스트 자막으로 쇼츠 영상 생성
 * @param {string} audioPath - 입력 음성 파일 (.mp3)
 * @param {string} script - 자막 텍스트
 * @param {string} outputPath - 출력 영상 경로 (.mp4)
 * @param {'mbti'|'saju'} type - 콘텐츠 타입 (테마 결정)
 * @returns {Promise<string|null>}
 */
async function composeVideo(audioPath, script, outputPath, type = 'mbti') {
  return new Promise((resolve) => {
    const themes = THEMES[type] || THEMES.mbti;
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const wrappedText = wrapText(script, 18);

    ensureDir(path.dirname(outputPath));

    // FFmpeg 필터: 배경색 + 자막 오버레이
    const vf = [
      // 배경: 9:16 세로 영상 (1080x1920)
      `color=c=${theme.bg}:size=1080x1920:rate=30[bg]`,
      // 자막
      `[bg]drawtext=text='${wrappedText.replace(/'/g, "\\'")}':` +
        `fontsize=72:fontcolor=${theme.text}:` +
        `x=(w-text_w)/2:y=(h-text_h)/2:` +
        `line_spacing=20:` +
        `shadowcolor=black:shadowx=3:shadowy=3[out]`,
    ].join(';');

    ffmpeg()
      .input(audioPath)
      .inputOptions(['-f', 'lavfi'])
      .input(`color=c=${theme.bg}:size=1080x1920:rate=30`)
      .complexFilter(vf, 'out')
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-shortest',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`[OK] 영상 생성 완료: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`[ERROR] 영상 생성 실패:`, err.message);
        writeLog(`error_video_${Date.now()}.txt`, err.message);
        resolve(null);
      })
      .run();
  });
}

/**
 * 음성 파일 배열로부터 영상 일괄 생성
 * @param {Array<{script, audioPath}>} voiceResults - generateDailyVoices() 결과
 * @returns {Promise<Array<{script, audioPath, videoPath}>>}
 */
async function generateDailyVideos(voiceResults) {
  const today = new Date().toISOString().slice(0, 10);
  const videoDir = path.join(OUTPUT_DIR, 'videos', today);
  ensureDir(videoDir);

  const results = [];

  for (let i = 0; i < voiceResults.length; i++) {
    const { script, audioPath } = voiceResults[i];
    if (!audioPath) {
      results.push({ script, audioPath, videoPath: null });
      continue;
    }

    const { type } = script;
    const baseName = path.basename(audioPath, '.mp3');
    const outputPath = path.join(videoDir, `${baseName}.mp4`);

    const videoPath = await composeVideo(audioPath, script.content.script, outputPath, type);
    results.push({ script, audioPath, videoPath });
  }

  const success = results.filter(r => r.videoPath).length;
  console.log(`\n영상 생성 완료: ${success}/${results.length}개`);
  return results;
}

// 독립 실행 시 (테스트용)
if (require.main === module) {
  const testAudio = path.join(OUTPUT_DIR, 'test_voice.mp3');
  const testOutput = path.join(OUTPUT_DIR, 'test_video.mp4');
  const testScript = 'INTJ는 화가 나도 절대 티를 내지 않아. 속으로 다 기억하고 있거든. 공감되면 좋아요 눌러줘!';

  if (!fs.existsSync(testAudio)) {
    console.error('테스트 음성 파일이 없습니다. 먼저 npm run voice를 실행하세요.');
    process.exit(1);
  }

  composeVideo(testAudio, testScript, testOutput, 'mbti').catch(console.error);
}

module.exports = { composeVideo, generateDailyVideos };
