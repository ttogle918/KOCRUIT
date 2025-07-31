// === Video Analysis API ===
import axios from 'axios';

const VIDEO_ANALYSIS_BASE_URL = 'http://localhost:8002';

// Video Analysis API 인스턴스
const videoAnalysisApi = axios.create({
  baseURL: VIDEO_ANALYSIS_BASE_URL,
  timeout: 300000, // 5분 (영상 분석은 시간이 오래 걸림)
  headers: {
    'Content-Type': 'application/json',
  },
});

// === Video Analysis API 함수들 ===

/**
 * URL 기반 영상 분석 요청
 * @param {string} videoUrl - 분석할 영상 URL
 * @param {number} applicationId - 지원자 ID
 * @returns {Promise} 분석 결과
 */
export const analyzeVideoByUrl = async (videoUrl, applicationId) => {
  try {
    const response = await videoAnalysisApi.post('/analyze-video-url', {
      video_url: videoUrl,
      application_id: applicationId
    });
    return response.data;
  } catch (error) {
    console.error('Video Analysis API 오류:', error);
    throw error;
  }
};

/**
 * 파일 업로드 기반 영상 분석 요청
 * @param {File} videoFile - 분석할 영상 파일
 * @returns {Promise} 분석 결과
 */
export const analyzeVideoByUpload = async (videoFile) => {
  try {
    const formData = new FormData();
    formData.append('file', videoFile);
    
    const response = await videoAnalysisApi.post('/analyze-video-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Video Upload Analysis API 오류:', error);
    throw error;
  }
};

/**
 * 분석 결과 조회
 * @param {number} applicationId - 지원자 ID
 * @returns {Promise} 분석 결과
 */
export const getAnalysisResult = async (applicationId) => {
  try {
    const response = await videoAnalysisApi.get(`/analysis-result/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('Analysis Result API 오류:', error);
    throw error;
  }
};

/**
 * 모델 상태 확인
 * @returns {Promise} 모델 상태
 */
export const getModelsStatus = async () => {
  try {
    const response = await videoAnalysisApi.get('/models/status');
    return response.data;
  } catch (error) {
    console.error('Models Status API 오류:', error);
    throw error;
  }
};

/**
 * 서비스 헬스체크
 * @returns {Promise} 서비스 상태
 */
export const checkVideoAnalysisHealth = async () => {
  try {
    const response = await videoAnalysisApi.get('/health');
    return response.data;
  } catch (error) {
    console.error('Video Analysis Health Check 오류:', error);
    throw error;
  }
};

export default videoAnalysisApi; 