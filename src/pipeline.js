/**
 * 전체 자동화 파이프라인 진입점
 * 실행: node src/pipeline.js
 *
 * 흐름: 스크립트 생성 → 음성 생성 → 영상 합성 → 썸네일 → 유튜브/인스타 업로드
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { generateDailyScripts } = require('./generator/script');
const { generateDailyVoices } = require('./voice/elevenlabs');
const { generateDailyVideos } = require('./video/compose');
const { generateDailyThumbnails } = require('./thumbnail/canva');
const { uploadAllToYoutube } = require('./upload/youtube');
const { uploadAllToInstagram } = require('./upload/instagram');

const LOG_DIR = process.env.LOG_DIR || './output/logs';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeLog(filename, content) {
  ensureDir(LOG_DIR);
  fs.writeFileSync(path.join(LOG_DIR, filename), content, 'utf8');
}

function logStep(step, status = 'START') {
  const ts = new Date().toISOString();
  const msg = `[${ts}] [${status}] ${step}`;
  console.log(msg);
}

/**
 * 전체 파이프라인 실행
 */
async function runPipeline() {
  const startTime = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  ensureDir(LOG_DIR);
  ensureDir(OUTPUT_DIR);

  const summary = {
    date: today,
    steps: {},
    errors: [],
  };

  console.log('='.repeat(60));
  console.log('쇼츠 자동화 파이프라인 시작');
  console.log(`날짜: ${today}`);
  console.log('='.repeat(60));

  // 1단계: 스크립트 생성
  logStep('1. 스크립트 생성 (Claude API)');
  let scripts = [];
  try {
    scripts = await generateDailyScripts();
    summary.steps.scripts = { success: scripts.length, total: scripts.length };
    logStep('1. 스크립트 생성', 'DONE');
  } catch (err) {
    summary.errors.push(`스크립트: ${err.message}`);
    logStep('1. 스크립트 생성', 'FAILED');
    console.error('파이프라인 중단: 스크립트 생성 실패');
    writeLog(`pipeline_error_${today}.txt`, JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  // 2단계: 음성 생성
  logStep('2. 음성 생성 (ElevenLabs)');
  let voiceResults = [];
  try {
    voiceResults = await generateDailyVoices(scripts);
    const success = voiceResults.filter(r => r.audioPath).length;
    summary.steps.voices = { success, total: voiceResults.length };
    logStep('2. 음성 생성', 'DONE');
  } catch (err) {
    summary.errors.push(`음성: ${err.message}`);
    logStep('2. 음성 생성', 'FAILED');
  }

  // 3단계: 영상 합성
  logStep('3. 영상 합성 (FFmpeg)');
  let videoResults = [];
  try {
    videoResults = await generateDailyVideos(voiceResults);
    const success = videoResults.filter(r => r.videoPath).length;
    summary.steps.videos = { success, total: videoResults.length };
    logStep('3. 영상 합성', 'DONE');
  } catch (err) {
    summary.errors.push(`영상: ${err.message}`);
    logStep('3. 영상 합성', 'FAILED');
  }

  // 4단계: 썸네일 생성
  logStep('4. 썸네일 생성 (Canva)');
  let thumbResults = videoResults;
  try {
    thumbResults = await generateDailyThumbnails(videoResults);
    const success = thumbResults.filter(r => r.thumbnailPath).length;
    summary.steps.thumbnails = { success, total: thumbResults.length };
    logStep('4. 썸네일 생성', 'DONE');
  } catch (err) {
    summary.errors.push(`썸네일: ${err.message}`);
    logStep('4. 썸네일 생성', 'FAILED');
  }

  // 5단계: 유튜브 업로드
  logStep('5. 유튜브 업로드');
  let ytResults = thumbResults;
  try {
    ytResults = await uploadAllToYoutube(thumbResults);
    const success = ytResults.filter(r => r.youtubeId).length;
    summary.steps.youtube = { success, total: ytResults.length };
    logStep('5. 유튜브 업로드', 'DONE');
  } catch (err) {
    summary.errors.push(`유튜브: ${err.message}`);
    logStep('5. 유튜브 업로드', 'FAILED');
  }

  // 6단계: 인스타그램 업로드
  // 주의: Instagram Graph API는 공개 URL 필요 — videoUrl 필드가 있을 때만 실행
  logStep('6. 인스타그램 업로드');
  const itemsWithUrl = ytResults.filter(r => r.videoUrl);
  if (itemsWithUrl.length > 0) {
    try {
      const igResults = await uploadAllToInstagram(itemsWithUrl);
      const success = igResults.filter(r => r.instagramId).length;
      summary.steps.instagram = { success, total: igResults.length };
      logStep('6. 인스타그램 업로드', 'DONE');
    } catch (err) {
      summary.errors.push(`인스타: ${err.message}`);
      logStep('6. 인스타그램 업로드', 'FAILED');
    }
  } else {
    console.log('  공개 URL 없음 — 인스타그램 업로드 건너뜀');
    summary.steps.instagram = { skipped: true };
  }

  // 완료 요약
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  summary.elapsed = `${elapsed}s`;

  console.log('\n' + '='.repeat(60));
  console.log('파이프라인 완료');
  console.log(JSON.stringify(summary.steps, null, 2));
  if (summary.errors.length > 0) {
    console.log('\n오류 목록:');
    summary.errors.forEach(e => console.log(`  - ${e}`));
  }
  console.log(`소요 시간: ${elapsed}초`);
  console.log('='.repeat(60));

  const summaryPath = path.join(LOG_DIR, `summary_${today}.json`);
  writeLog(`summary_${today}.json`, JSON.stringify(summary, null, 2));
  console.log(`\n요약 저장: ${summaryPath}`);
}

runPipeline().catch((err) => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
