import axiosInstance from './axiosInstance';

/**
 * 실시간 면접 분석 세션 관리 API (Port 8000)
 */
class RealtimeAnalysisApi {
  /**
   * 실시간 분석 세션 시작
   */
  static async startSession(application_id, analysis_type) {
    const response = await axiosInstance.post('/realtime-analysis/start-session', {
      application_id,
      analysis_type
    });
    return response.data;
  }

  /**
   * 분석 청크 추가
   */
  static async addChunk(session_id, chunk_type, data) {
    const response = await axiosInstance.post(`/realtime-analysis/add-chunk/${session_id}`, {
      chunk_type,
      data
    });
    return response.data;
  }

  /**
   * 청크 분석 처리
   */
  static async processChunk(session_id, chunk_id) {
    const response = await axiosInstance.post(`/realtime-analysis/process-chunk/${session_id}/${chunk_id}`);
    return response.data;
  }

  /**
   * 세션 상태 조회
   */
  static async getSessionStatus(session_id) {
    const response = await axiosInstance.get(`/realtime-analysis/session-status/${session_id}`);
    return response.data;
  }

  /**
   * 세션의 모든 청크 조회
   */
  static async getSessionChunks(session_id) {
    const response = await axiosInstance.get(`/realtime-analysis/session-chunks/${session_id}`);
    return response.data;
  }

  /**
   * 세션 일시정지/재개/완료
   */
  static async pauseSession(session_id) {
    const response = await axiosInstance.post(`/realtime-analysis/pause-session/${session_id}`);
    return response.data;
  }

  static async resumeSession(session_id) {
    const response = await axiosInstance.post(`/realtime-analysis/resume-session/${session_id}`);
    return response.data;
  }

  static async completeSession(session_id) {
    const response = await axiosInstance.post(`/realtime-analysis/complete-session/${session_id}`);
    return response.data;
  }

  /**
   * WebSocket 연결 생성
   */
  static createWebSocketConnection(session_id, onMessage, onError) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/realtime-analysis/ws/realtime-analysis/${session_id}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (error) {
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
      if (onError) onError(error);
    };
    
    return ws;
  }
}

export default RealtimeAnalysisApi;
