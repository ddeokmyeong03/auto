/**
 * YouTube Data API v3를 사용하여 쇼츠 영상을 자동 업로드하는 모듈
 * 독립 실행: node src/upload/youtube.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || './output/logs';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeLog(filename, content) {
  ensureDir(LOG_DIR);
  fs.writeFileSync(path.join(LOG_DIR, filename), content, 'utf8');
}

/**
 * OAuth2 클라이언트 초기화
 */
function getAuthClient() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    throw new Error('YouTube API 환경변수가 설정되지 않았습니다.');
  }

  const auth = new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });
  return auth;
}

/**
 * 예약 업로드 시간 계산 (오늘 기준 7시/12시/19시 중 선택)
 * @param {number} index - 업로드 순서 인덱스
 * @returns {string} ISO 8601 형식 예약 시간
 */
function getScheduledTime(index) {
  const times = [7, 12, 19]; // KST 기준 업로드 시간
  const now = new Date();
  // KST = UTC+9
  const kstOffset = 9 * 60 * 60 * 1000;
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const hour = times[index % times.length];

  const scheduled = new Date(tomorrow);
  scheduled.setUTCHours(hour - 9, 0, 0, 0); // KST to UTC
  return scheduled.toISOString();
}

/**
 * 유튜브에 쇼츠 영상 업로드
 * @param {string} videoPath - 영상 파일 경로
 * @param {string} thumbnailPath - 썸네일 파일 경로 (선택)
 * @param {{title, description, hashtags}} content - 콘텐츠 메타데이터
 * @param {number} scheduleIndex - 예약 시간 인덱스
 * @returns {Promise<string|null>} 업로드된 비디오 ID
 */
async function uploadToYoutube(videoPath, thumbnailPath, content, scheduleIndex = 0) {
  if (!fs.existsSync(videoPath)) {
    console.error(`[ERROR] 영상 파일 없음: ${videoPath}`);
    return null;
  }

  try {
    const auth = getAuthClient();
    const youtube = google.youtube({ version: 'v3', auth });

    const tags = content.hashtags
      ? content.hashtags.map(t => t.replace('#', ''))
      : [];

    const scheduledTime = getScheduledTime(scheduleIndex);

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: content.title,
          description: `${content.description}\n\n${content.hashtags?.join(' ') || ''}`,
          tags,
          categoryId: '22', // People & Blogs
          defaultLanguage: 'ko',
        },
        status: {
          privacyStatus: 'private', // 예약 업로드는 private으로 먼저 설정
          publishAt: scheduledTime,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    const videoId = response.data.id;
    console.log(`[OK] 유튜브 업로드 완료: https://youtu.be/${videoId} (예약: ${scheduledTime})`);

    // 썸네일 설정
    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
      await youtube.thumbnails.set({
        videoId,
        media: { body: fs.createReadStream(thumbnailPath) },
      });
      console.log(`[OK] 썸네일 설정 완료: ${videoId}`);
    }

    return videoId;
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    console.error(`[ERROR] 유튜브 업로드 실패:`, msg);
    writeLog(`error_youtube_${Date.now()}.txt`, msg);
    return null;
  }
}

/**
 * 영상 결과 배열 전체를 유튜브에 업로드
 * @param {Array<{script, videoPath, thumbnailPath}>} videoResults
 * @returns {Promise<Array<{...item, youtubeId}>>}
 */
async function uploadAllToYoutube(videoResults) {
  const results = [];
  let uploadIndex = 0;

  for (const item of videoResults) {
    if (!item.videoPath) {
      results.push({ ...item, youtubeId: null });
      continue;
    }

    const youtubeId = await uploadToYoutube(
      item.videoPath,
      item.thumbnailPath,
      item.script.content,
      uploadIndex++
    );
    results.push({ ...item, youtubeId });
  }

  const success = results.filter(r => r.youtubeId).length;
  console.log(`\n유튜브 업로드 완료: ${success}/${results.length}개`);
  return results;
}

// 독립 실행 테스트
if (require.main === module) {
  console.log('유튜브 업로드 모듈 로드 완료. pipeline.js를 통해 실행하세요.');
}

module.exports = { uploadToYoutube, uploadAllToYoutube };
