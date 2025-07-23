import api from './api';

class AiInterviewApi {
  /**
   * 특정 지원자의 AI 면접 평가 결과 조회
   * @param {number} applicationId - 지원자 ID
   * @returns {Promise<Object>} AI 면접 평가 결과
   */
  static async getAiInterviewEvaluation(applicationId) {
    try {
      const response = await api.get(`/interview-evaluation/ai-interview/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('AI 면접 평가 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 공고의 모든 AI 면접 평가 결과 조회
   * @param {number} jobPostId - 공고 ID
   * @returns {Promise<Object>} 공고별 AI 면접 평가 결과 목록
   */
  static async getAiInterviewEvaluationsByJobPost(jobPostId) {
    try {
      const response = await api.get(`/interview-evaluation/ai-interview/job-post/${jobPostId}`);
      return response.data;
    } catch (error) {
      console.error('공고별 AI 면접 평가 조회 실패:', error);
      throw error;
    }
  }

  /**
   * AI 면접 전체 요약 통계 조회
   * @returns {Promise<Object>} AI 면접 요약 통계
   */
  static async getAiInterviewSummary() {
    try {
      const response = await api.get('/interview-evaluation/ai-interview/summary');
      return response.data;
    } catch (error) {
      console.error('AI 면접 요약 조회 실패:', error);
      throw error;
    }
  }

  /**
   * AI 면접 질문 생성
   * @param {Object} params - 질문 생성 파라미터
   * @returns {Promise<Object>} 생성된 질문들
   */
  static async generateAiInterviewQuestions(params) {
    try {
      const response = await api.post('/ai-interview-questions/generate-ai-interview-questions', params);
      return response.data;
    } catch (error) {
      console.error('AI 면접 질문 생성 실패:', error);
      throw error;
    }
  }

  /**
   * AI 면접 질문 조회
   * @param {string} category - 질문 카테고리 (선택사항)
   * @returns {Promise<Object>} AI 면접 질문 목록
   */
  static async getAiInterviewQuestions(category = null) {
    try {
      const params = category ? { category } : {};
      const response = await api.get('/ai-interview-questions/ai-interview-questions', { params });
      return response.data;
    } catch (error) {
      console.error('AI 면접 질문 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 지원자의 AI 면접 질문 조회
   * @param {number} applicationId - 지원서 ID
   * @returns {Promise<Object>} 질문 데이터
   */
  static async getAiInterviewQuestionsByApplication(applicationId) {
    try {
      const response = await api.get(`/interview-questions/application/${applicationId}/ai-questions`);
      return response.data;
    } catch (error) {
      console.error('AI 면접 질문 조회 실패:', error);
      throw error;
    }
  }

  /**
   * AI 면접 시나리오 조회
   * @returns {Promise<Object>} AI 면접 시나리오 정보
   */
  static async getAiInterviewScenarios() {
    try {
      const response = await api.get('/ai-interview-questions/ai-interview-scenarios');
      return response.data;
    } catch (error) {
      console.error('AI 면접 시나리오 조회 실패:', error);
      throw error;
    }
  }

  /**
   * AI 면접 시나리오 질문 생성
   * @param {number} jobPostId - 공고 ID
   * @param {number} applicantId - 지원자 ID
   * @returns {Promise<Object>} 생성된 시나리오 질문들
   */
  static async generateScenarioQuestions(jobPostId, applicantId) {
    try {
      const response = await api.post('/ai-interview-questions/scenarios', {
        job_post_id: jobPostId,
        applicant_id: applicantId
      });
      return response.data;
    } catch (error) {
      console.error('시나리오 질문 생성 실패:', error);
      throw error;
    }
  }

  /**
   * AI 면접 시작
   * @param {number} jobPostId - 공고 ID
   * @param {number} applicantId - 지원자 ID
   * @returns {Promise<Object>} 면접 시작 정보
   */
  static async startAiInterview(jobPostId, applicantId) {
    try {
      const response = await api.post('/ai-interview-questions/start-interview', {
        job_post_id: jobPostId,
        applicant_id: applicantId
      });
      return response.data;
    } catch (error) {
      console.error('AI 면접 시작 실패:', error);
      throw error;
    }
  }

  /**
   * AI 면접 응답 평가
   * @param {Object} responseData - 응답 데이터
   * @returns {Promise<Object>} 평가 결과
   */
  static async evaluateResponse(responseData) {
    try {
      const response = await api.post('/ai-interview-questions/evaluate', responseData);
      return response.data;
    } catch (error) {
      console.error('응답 평가 실패:', error);
      throw error;
    }
  }

  /**
   * 게임 테스트 시작
   * @param {string} gameType - 게임 타입
   * @param {number} jobPostId - 공고 ID
   * @param {number} applicantId - 지원자 ID
   * @returns {Promise<Object>} 게임 정보
   */
  static async startGameTest(gameType, jobPostId, applicantId) {
    try {
      const response = await api.post('/ai-interview-questions/game-test', {
        game_type: gameType,
        job_post_id: jobPostId,
        applicant_id: applicantId
      });
      return response.data;
    } catch (error) {
      console.error('게임 테스트 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 게임 점수 제출
   * @param {string} gameType - 게임 타입
   * @param {number} score - 점수
   * @param {number} jobPostId - 공고 ID
   * @param {number} applicantId - 지원자 ID
   * @returns {Promise<Object>} 제출 결과
   */
  static async submitGameScore(gameType, score, jobPostId, applicantId) {
    try {
      const response = await api.post('/ai-interview-questions/game-score', {
        game_type: gameType,
        score: score,
        job_post_id: jobPostId,
        applicant_id: applicantId
      });
      return response.data;
    } catch (error) {
      console.error('게임 점수 제출 실패:', error);
      throw error;
    }
  }

  /**
   * 후속 질문 생성
   * @param {string} originalQuestion - 원본 질문
   * @param {string} candidateResponse - 지원자 응답
   * @param {Array<string>} evaluationFocus - 평가 포커스
   * @returns {Promise<Object>} 후속 질문들
   */
  static async generateFollowUpQuestions(originalQuestion, candidateResponse, evaluationFocus) {
    try {
      const response = await api.post('/ai-interview-questions/follow-up-questions', {
        original_question: originalQuestion,
        candidate_response: candidateResponse,
        evaluation_focus: evaluationFocus
      });
      return response.data;
    } catch (error) {
      console.error('후속 질문 생성 실패:', error);
      throw error;
    }
  }

  /**
   * AI 면접 상태 조회
   * @param {number} jobPostId - 공고 ID
   * @param {number} applicantId - 지원자 ID
   * @returns {Promise<Object>} 면접 상태
   */
  static async getInterviewStatus(jobPostId, applicantId) {
    try {
      const response = await api.get(`/ai-interview-questions/status/${jobPostId}/${applicantId}`);
      return response.data;
    } catch (error) {
      console.error('면접 상태 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 지원자의 AI 면접 질문+답변 로그 조회
   * @param {number} applicationId - 지원서 ID
   * @returns {Promise<Array>} 질문+답변 로그 리스트
   */
  static async getInterviewQuestionLogsByApplication(applicationId) {
    try {
      const response = await api.get(`/interview-questions/application/${applicationId}/logs`);
      return response.data;
    } catch (error) {
      console.error('AI 면접 질문+답변 로그 조회 실패:', error);
      throw error;
    }
  }
}

export default AiInterviewApi; 