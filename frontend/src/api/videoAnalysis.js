import axios from 'axios';
import apiInstance from './axiosInstance'; // 기존 apiInstance (Backend API용)

const VIDEO_ANALYSIS_BASE_URL = 'http://localhost:8002';

// Video Analysis API 인스턴스 (FastAPI Video Service 전용)
const videoAnalysisClient = axios.create({
  baseURL: VIDEO_ANALYSIS_BASE_URL,
  timeout: 300000, // 5분
  headers: {
    'Content-Type': 'application/json',
  },
});

// === Video Analysis API (Dedicated Service) ===

/**
 * URL 기반 영상 분석 요청
 * @param {string} videoUrl - 분석할 영상 URL
 * @param {number} applicationId - 지원자 ID
 * @returns {Promise} 분석 결과
 */
export const analyzeVideoByUrl = async (videoUrl, applicationId) => {
  try {
    const response = await videoAnalysisClient.post('/analyze-video-url', {
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
    
    const response = await videoAnalysisClient.post('/analyze-video-upload', formData, {
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
    const response = await videoAnalysisClient.get(`/analysis-result/${applicationId}`);
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
    const response = await videoAnalysisClient.get('/models/status');
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
    const response = await videoAnalysisClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Video Analysis Health Check 오류:', error);
    throw error;
  }
};

// === Realtime Analysis API (Backend Service) ===

export class RealtimeAnalysisApi {
  /**
   * 실시간 분석 세션 시작
   */
  static async startSession(application_id, analysis_type) {
    const response = await apiInstance.post('/realtime-analysis/start-session', {
      application_id,
      analysis_type
    });
    return response.data;
  }

  /**
   * 분석 청크 추가
   */
  static async addChunk(session_id, chunk_type, data) {
    const response = await apiInstance.post(`/realtime-analysis/add-chunk/${session_id}`, {
      chunk_type,
      data
    });
    return response.data;
  }

  /**
   * 청크 분석 처리
   */
  static async processChunk(session_id, chunk_id) {
    const response = await apiInstance.post(`/realtime-analysis/process-chunk/${session_id}/${chunk_id}`);
    return response.data;
  }

  /**
   * 세션 상태 조회
   */
  static async getSessionStatus(session_id) {
    const response = await apiInstance.get(`/realtime-analysis/session-status/${session_id}`);
    return response.data;
  }

  /**
   * 세션의 모든 청크 조회
   */
  static async getSessionChunks(session_id) {
    const response = await apiInstance.get(`/realtime-analysis/session-chunks/${session_id}`);
    return response.data;
  }

  /**
   * 세션 일시정지
   */
  static async pauseSession(session_id) {
    const response = await apiInstance.post(`/realtime-analysis/pause-session/${session_id}`);
    return response.data;
  }

  /**
   * 세션 재개
   */
  static async resumeSession(session_id) {
    const response = await apiInstance.post(`/realtime-analysis/resume-session/${session_id}`);
    return response.data;
  }

  /**
   * 세션 완료
   */
  static async completeSession(session_id) {
    const response = await apiInstance.post(`/realtime-analysis/complete-session/${session_id}`);
    return response.data;
  }

  /**
   * 활성 세션 목록 조회
   */
  static async getActiveSessions() {
    const response = await apiInstance.get('/realtime-analysis/active-sessions');
    return response.data;
  }

  /**
   * 오래된 세션 정리
   */
  static async cleanupOldSessions(days = 1) {
    const response = await apiInstance.delete(`/realtime-analysis/cleanup-sessions?days=${days}`);
    return response.data;
  }

  /**
   * WebSocket 연결
   */
  static createWebSocketConnection(session_id, onMessage, onError) {
    const wsUrl = `ws://${window.location.host}/api/v2/realtime-analysis/ws/realtime-analysis/${session_id}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
      } catch (error) {
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
      if (onError) {
        onError(error);
      }
    };
    
    return ws;
  }

  /**
   * 청크 데이터 Base64 인코딩
   */
  static async encodeChunkData(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 오디오 청크 데이터 생성
   */
  static async createAudioChunkData(audioBlob) {
    const base64Data = await this.encodeChunkData(audioBlob);
    return {
      timestamp: Date.now(),
      size: audioBlob.size,
      type: audioBlob.type,
      data: base64Data
    };
  }

  /**
   * 비디오 청크 데이터 생성
   */
  static async createVideoChunkData(videoBlob) {
    const base64Data = await this.encodeChunkData(videoBlob);
    return {
      timestamp: Date.now(),
      size: videoBlob.size,
      type: videoBlob.type,
      data: base64Data
    };
  }

  /**
   * 텍스트 청크 데이터 생성
   */
  static createTextChunkData(text) {
    return {
      timestamp: Date.now(),
      text: text,
      word_count: text.split(' ').length
    };
  }
}

export default {
  analyzeVideoByUrl,
  analyzeVideoByUpload,
  getAnalysisResult,
  getModelsStatus,
  checkVideoAnalysisHealth,
  RealtimeAnalysisApi
};

