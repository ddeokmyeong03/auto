/**
 * Canva API를 사용하여 썸네일을 자동 생성하는 모듈
 * 독립 실행: node src/thumbnail/canva.js
 *
 * 참고: Canva Connect API (https://www.canva.com/developers/)
 * 현재 Canva API는 OAuth 2.0 기반으로 초기 설정 필요
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.CANVA_API_KEY;
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';
const LOG_DIR = process.env.LOG_DIR || './output/logs';

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeLog(filename, content) {
  ensureDir(LOG_DIR);
  fs.writeFileSync(path.join(LOG_DIR, filename), content, 'utf8');
}

/**
 * Canva API를 통해 디자인 생성
 * @param {string} title - 썸네일 제목 텍스트
 * @param {'mbti'|'saju'} type
 * @returns {Promise<string|null>} 디자인 ID
 */
async function createCanvaDesign(title, type) {
  if (!API_KEY) throw new Error('CANVA_API_KEY가 설정되지 않았습니다.');

  try {
    const response = await axios.post(
      `${CANVA_API_BASE}/designs`,
      {
        design_type: { name: 'SocialMedia' },
        title: `쇼츠 썸네일 - ${title}`,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.design.id;
  } catch (err) {
    const msg = err.response
      ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
      : err.message;
    console.error('[ERROR] Canva 디자인 생성 실패:', msg);
    writeLog(`error_canva_${Date.now()}.txt`, msg);
    return null;
  }
}

/**
 * 디자인을 이미지로 내보내기
 * @param {string} designId
 * @param {string} outputPath - 저장 경로 (.png)
 * @returns {Promise<string|null>}
 */
async function exportDesign(designId, outputPath) {
  try {
    // 내보내기 작업 생성
    const exportRes = await axios.post(
      `${CANVA_API_BASE}/exports`,
      {
        design_id: designId,
        format: { type: 'png', lossless: false, quality: 90 },
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const jobId = exportRes.data.job.id;

    // 완료 대기 (폴링)
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await axios.get(`${CANVA_API_BASE}/exports/${jobId}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const job = statusRes.data.job;
      if (job.status === 'success') {
        const url = job.urls[0];
        const imgRes = await axios.get(url, { responseType: 'arraybuffer' });
        ensureDir(path.dirname(outputPath));
        fs.writeFileSync(outputPath, imgRes.data);
        console.log(`[OK] 썸네일 저장: ${outputPath}`);
        return outputPath;
      }
      if (job.status === 'failed') throw new Error('Canva 내보내기 실패');
    }
    throw new Error('Canva 내보내기 타임아웃');
  } catch (err) {
    console.error('[ERROR] 썸네일 내보내기 실패:', err.message);
    writeLog(`error_thumbnail_${Date.now()}.txt`, err.message);
    return null;
  }
}

/**
 * 영상 결과 배열로부터 썸네일 일괄 생성
 * @param {Array<{script, audioPath, videoPath}>} videoResults
 * @returns {Promise<Array<{...videoResult, thumbnailPath}>>}
 */
async function generateDailyThumbnails(videoResults) {
  const today = new Date().toISOString().slice(0, 10);
  const thumbDir = path.join(OUTPUT_DIR, 'thumbnails', today);
  ensureDir(thumbDir);

  const results = [];

  for (let i = 0; i < videoResults.length; i++) {
    const item = videoResults[i];
    const { script } = item;
    const title = script.content?.title || `콘텐츠 ${i + 1}`;
    const type = script.type || 'mbti';

    const baseName = path.basename(item.videoPath || `video_${i + 1}`, '.mp4');
    const outputPath = path.join(thumbDir, `${baseName}_thumb.png`);

    const designId = await createCanvaDesign(title, type);
    let thumbnailPath = null;
    if (designId) {
      thumbnailPath = await exportDesign(designId, outputPath);
    }

    results.push({ ...item, thumbnailPath });
  }

  const success = results.filter(r => r.thumbnailPath).length;
  console.log(`\n썸네일 생성 완료: ${success}/${results.length}개`);
  return results;
}

// 독립 실행 테스트
if (require.main === module) {
  createCanvaDesign('INTJ 화날 때 행동', 'mbti')
    .then(id => id && console.log('디자인 ID:', id))
    .catch(console.error);
}

module.exports = { createCanvaDesign, exportDesign, generateDailyThumbnails };
