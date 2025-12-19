import api from './axiosInstance';

/**
 * 비디오 분석 상태 조회
 * @param {number} applicationId 
 */
export const getVideoAnalysisStatus = async (applicationId) => {
  try {
    const response = await api.get(`/video-analysis/status/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('Video Analysis Status API 오류:', error);
    throw error;
  }
};

/**
 * 비디오 분석 시작
 * @param {number} applicationId 
 */
export const startVideoAnalysis = async (applicationId) => {
  try {
    const response = await api.post(`/video-analysis/analyze/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('Start Video Analysis API 오류:', error);
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
    const response = await api.get(`/video-analysis/result/${applicationId}`);
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
    // 모델 상태는 직접 서비스에 물어보거나 백엔드에 구현되어 있어야 함
    // 현재 백엔드에는 /video-analysis/models/status 같은게 없음
    // 우선 기존 URL 유지하되 필요시 백엔드 거치도록 수정
    const response = await api.get('/video-analysis/models/status');
    return response.data;
  } catch (error) {
    console.error('Models Status API 오류:', error);
    throw error;
  }
};

export default api;