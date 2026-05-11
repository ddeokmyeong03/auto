/**
 * Instagram Graph API를 사용하여 릴스를 자동 업로드하는 모듈
 * 독립 실행: node src/upload/instagram.js
 *
 * 참고: 영상은 공개 URL이 필요하므로 임시 호스팅 또는 presigned URL 활용
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
const LOG_DIR = process.env.LOG_DIR || './output/logs';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeLog(filename, content) {
  ensureDir(LOG_DIR);
  fs.writeFileSync(path.join(LOG_DIR, filename), content, 'utf8');
}

/**
 * 영상 컨테이너 생성 (릴스)
 * @param {string} videoUrl - 공개 접근 가능한 영상 URL
 * @param {string} caption - 캡션 (해시태그 포함)
 * @returns {Promise<string|null>} 컨테이너 ID
 */
async function createReelsContainer(videoUrl, caption) {
  if (!ACCESS_TOKEN || !ACCOUNT_ID) {
    throw new Error('INSTAGRAM_ACCESS_TOKEN 또는 INSTAGRAM_ACCOUNT_ID가 설정되지 않았습니다.');
  }

  try {
    const response = await axios.post(
      `${GRAPH_BASE}/${ACCOUNT_ID}/media`,
      null,
      {
        params: {
          media_type: 'REELS',
          video_url: videoUrl,
          caption,
          share_to_feed: true,
          access_token: ACCESS_TOKEN,
        },
      }
    );
    const containerId = response.data.id;
    console.log(`[OK] 인스타 컨테이너 생성: ${containerId}`);
    return containerId;
  } catch (err) {
    const msg = err.response
      ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
      : err.message;
    console.error('[ERROR] 인스타 컨테이너 생성 실패:', msg);
    writeLog(`error_instagram_container_${Date.now()}.txt`, msg);
    return null;
  }
}

/**
 * 컨테이너 처리 상태 확인 (폴링)
 * @param {string} containerId
 * @returns {Promise<boolean>}
 */
async function waitForContainer(containerId, maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const response = await axios.get(`${GRAPH_BASE}/${containerId}`, {
        params: { fields: 'status_code', access_token: ACCESS_TOKEN },
      });
      const status = response.data.status_code;
      if (status === 'FINISHED') return true;
      if (status === 'ERROR') {
        console.error('[ERROR] 인스타 컨테이너 처리 오류');
        return false;
      }
      console.log(`  컨테이너 처리 중... (${status})`);
    } catch (err) {
      console.error('[ERROR] 상태 확인 실패:', err.message);
    }
  }
  console.error('[ERROR] 컨테이너 처리 타임아웃');
  return false;
}

/**
 * 컨테이너를 실제 게시
 * @param {string} containerId
 * @returns {Promise<string|null>} 미디어 ID
 */
async function publishContainer(containerId) {
  try {
    const response = await axios.post(
      `${GRAPH_BASE}/${ACCOUNT_ID}/media_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: ACCESS_TOKEN,
        },
      }
    );
    const mediaId = response.data.id;
    console.log(`[OK] 인스타 릴스 게시 완료: ${mediaId}`);
    return mediaId;
  } catch (err) {
    const msg = err.response
      ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
      : err.message;
    console.error('[ERROR] 인스타 게시 실패:', msg);
    writeLog(`error_instagram_publish_${Date.now()}.txt`, msg);
    return null;
  }
}

/**
 * 릴스 업로드 전체 플로우
 * @param {string} videoUrl - 공개 영상 URL
 * @param {{title, description, hashtags}} content
 * @returns {Promise<string|null>} 미디어 ID
 */
async function uploadToInstagram(videoUrl, content) {
  const caption = [
    content.title,
    '',
    content.description,
    '',
    content.hashtags?.join(' ') || '',
  ].join('\n');

  const containerId = await createReelsContainer(videoUrl, caption);
  if (!containerId) return null;

  const ready = await waitForContainer(containerId);
  if (!ready) return null;

  return publishContainer(containerId);
}

/**
 * 영상 결과 배열 전체를 인스타에 업로드
 * @param {Array<{script, videoPath, videoUrl}>} videoResults - videoUrl: 공개 URL
 * @returns {Promise<Array<{...item, instagramId}>>}
 */
async function uploadAllToInstagram(videoResults) {
  const results = [];

  for (const item of videoResults) {
    if (!item.videoUrl) {
      console.warn(`[SKIP] 공개 URL 없음: ${item.videoPath}`);
      results.push({ ...item, instagramId: null });
      continue;
    }

    const instagramId = await uploadToInstagram(item.videoUrl, item.script.content);
    results.push({ ...item, instagramId });
  }

  const success = results.filter(r => r.instagramId).length;
  console.log(`\n인스타그램 업로드 완료: ${success}/${results.length}개`);
  return results;
}

// 독립 실행 테스트
if (require.main === module) {
  console.log('인스타그램 업로드 모듈 로드 완료. pipeline.js를 통해 실행하세요.');
}

module.exports = { uploadToInstagram, uploadAllToInstagram };
