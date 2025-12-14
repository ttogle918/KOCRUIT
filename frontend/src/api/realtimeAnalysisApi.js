import api from './api';

class RealtimeAnalysisApi {
  /**
   * 실시간 분석 세션 시작
   * @param {number} application_id - 지원자 ID
   * @param {string} analysis_type - 분석 타입 ('video' 또는 'audio')
   * @returns {Promise<Object>} 세션 정보
   */
  static async startSession(application_id, analysis_type) {
    const response = await api.post('/realtime-analysis/start-session', {
      application_id,
      analysis_type
    });
    return response.data;
  }

  /**
   * 분석 청크 추가
   * @param {string} session_id - 세션 ID
   * @param {string} chunk_type - 청크 타입 ('audio', 'video', 'text')
   * @param {Object} data - 청크 데이터
   * @returns {Promise<Object>} 청크 정보
   */
  static async addChunk(session_id, chunk_type, data) {
    const response = await api.post(`/realtime-analysis/add-chunk/${session_id}`, {
      chunk_type,
      data
    });
    return response.data;
  }

  /**
   * 청크 분석 처리
   * @param {string} session_id - 세션 ID
   * @param {string} chunk_id - 청크 ID
   * @returns {Promise<Object>} 분석 결과
   */
  static async processChunk(session_id, chunk_id) {
    const response = await api.post(`/realtime-analysis/process-chunk/${session_id}/${chunk_id}`);
    return response.data;
  }

  /**
   * 세션 상태 조회
   * @param {string} session_id - 세션 ID
   * @returns {Promise<Object>} 세션 상태
   */
  static async getSessionStatus(session_id) {
    const response = await api.get(`/realtime-analysis/session-status/${session_id}`);
    return response.data;
  }

  /**
   * 세션의 모든 청크 조회
   * @param {string} session_id - 세션 ID
   * @returns {Promise<Object>} 청크 목록
   */
  static async getSessionChunks(session_id) {
    const response = await api.get(`/realtime-analysis/session-chunks/${session_id}`);
    return response.data;
  }

  /**
   * 세션 일시정지
   * @param {string} session_id - 세션 ID
   * @returns {Promise<Object>} 결과
   */
  static async pauseSession(session_id) {
    const response = await api.post(`/realtime-analysis/pause-session/${session_id}`);
    return response.data;
  }

  /**
   * 세션 재개
   * @param {string} session_id - 세션 ID
   * @returns {Promise<Object>} 결과
   */
  static async resumeSession(session_id) {
    const response = await api.post(`/realtime-analysis/resume-session/${session_id}`);
    return response.data;
  }

  /**
   * 세션 완료
   * @param {string} session_id - 세션 ID
   * @returns {Promise<Object>} 최종 결과
   */
  static async completeSession(session_id) {
    const response = await api.post(`/realtime-analysis/complete-session/${session_id}`);
    return response.data;
  }

  /**
   * 활성 세션 목록 조회
   * @returns {Promise<Object>} 활성 세션 목록
   */
  static async getActiveSessions() {
    const response = await api.get('/realtime-analysis/active-sessions');
    return response.data;
  }

  /**
   * 오래된 세션 정리
   * @param {number} days - 정리할 일수 (기본값: 1일)
   * @returns {Promise<Object>} 정리 결과
   */
  static async cleanupOldSessions(days = 1) {
    const response = await api.delete(`/realtime-analysis/cleanup-sessions?days=${days}`);
    return response.data;
  }

  /**
   * WebSocket 연결을 통한 실시간 통신 (선택적)
   * @param {string} session_id - 세션 ID
   * @param {Function} onMessage - 메시지 수신 콜백
   * @param {Function} onError - 오류 콜백
   * @returns {WebSocket} WebSocket 인스턴스
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
   * 청크 데이터를 Base64로 인코딩
   * @param {Blob} blob - 청크 데이터
   * @returns {Promise<string>} Base64 인코딩된 데이터
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
   * @param {Blob} audioBlob - 오디오 데이터
   * @returns {Promise<Object>} 청크 데이터
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
   * @param {Blob} videoBlob - 비디오 데이터
   * @returns {Promise<Object>} 청크 데이터
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
   * @param {string} text - 텍스트 데이터
   * @returns {Object} 청크 데이터
   */
  static createTextChunkData(text) {
    return {
      timestamp: Date.now(),
      text: text,
      word_count: text.split(' ').length
    };
  }

  /**
   * 세션 상태 폴링 시작
   * @param {string} session_id - 세션 ID
   * @param {Function} onStatusUpdate - 상태 업데이트 콜백
   * @param {number} interval - 폴링 간격 (밀리초, 기본값: 2000)
   * @returns {number} 폴링 인터벌 ID
   */
  static startStatusPolling(session_id, onStatusUpdate, interval = 2000) {
    return setInterval(async () => {
      try {
        const response = await this.getSessionStatus(session_id);
        if (response.success && onStatusUpdate) {
          onStatusUpdate(response.status);
        }
      } catch (error) {
        console.error('상태 폴링 오류:', error);
      }
    }, interval);
  }

  /**
   * 세션 상태 폴링 중지
   * @param {number} intervalId - 폴링 인터벌 ID
   */
  static stopStatusPolling(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export default RealtimeAnalysisApi; 