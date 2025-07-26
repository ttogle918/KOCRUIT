import api from './api';

class InterviewQuestionApi {
  /**
   * 공고별 공통 질문 조회
   * @param {number} jobPostId - 공고 ID
   * @returns {Promise<Object>} 공통 질문 목록
   */
  static async getCommonQuestions(jobPostId) {
    try {
      const response = await api.get(`/interview-questions/job/${jobPostId}/common-questions`);
      return response.data;
    } catch (error) {
      console.error('공통 질문 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 지원자별 면접 질문 조회
   * @param {number} applicationId - 지원자 ID
   * @param {string} questionType - 질문 타입 (선택사항)
   * @returns {Promise<Object>} 질문 목록
   */
  static async getQuestionsForApplication(applicationId, questionType = null) {
    try {
      const params = questionType ? { question_type: questionType } : {};
      const response = await api.get(`/interview-questions/application/${applicationId}/questions`, { params });
      return response.data;
    } catch (error) {
      console.error('지원자 질문 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 공고별 질문 생성 상태 조회
   * @param {number} jobPostId - 공고 ID
   * @returns {Promise<Object>} 질문 생성 상태
   */
  static async getQuestionsStatus(jobPostId) {
    try {
      const response = await api.get(`/interview-questions/job/${jobPostId}/questions-status`);
      return response.data;
    } catch (error) {
      console.error('질문 상태 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 공고별 공통 질문 수동 생성
   * @param {number} jobPostId - 공고 ID
   * @returns {Promise<Object>} 생성 결과
   */
  static async generateCommonQuestions(jobPostId) {
    try {
      // body를 명시적으로 빈 객체로 보냄
      const response = await api.post(`/interview-questions/job/${jobPostId}/generate-common-questions`, {});
      return response.data;
    } catch (error) {
      console.error('공통 질문 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 지원자별 개별 질문 수동 생성
   * @param {number} applicationId - 지원자 ID
   * @returns {Promise<Object>} 생성 결과
   */
  static async generateIndividualQuestions(applicationId) {
    try {
      const response = await api.post(`/interview-questions/application/${applicationId}/generate-individual-questions`);
      return response.data;
    } catch (error) {
      console.error('개별 질문 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 질문 생성 (기존 LangGraph 방식과 호환)
   * @param {Object} params - 질문 생성 파라미터
   * @returns {Promise<Object>} 생성된 질문들
   */
  static async generateQuestions(params) {
    try {
      const response = await api.post('/interview-questions/generate', params);
      return response.data;
    } catch (error) {
      console.error('질문 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 질문 저장
   * @param {Object} questionData - 질문 데이터
   * @returns {Promise<Object>} 저장된 질문
   */
  static async saveQuestion(questionData) {
    try {
      const response = await api.post('/interview-questions/', questionData);
      return response.data;
    } catch (error) {
      console.error('질문 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 대량 질문 저장
   * @param {Object} bulkData - 대량 질문 데이터
   * @returns {Promise<Array>} 저장된 질문들
   */
  static async saveQuestionsBulk(bulkData) {
    try {
      const response = await api.post('/interview-questions/bulk', bulkData);
      return response.data;
    } catch (error) {
      console.error('대량 질문 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 질문 삭제
   * @param {number} questionId - 질문 ID
   * @returns {Promise<Object>} 삭제 결과
   */
  static async deleteQuestion(questionId) {
    try {
      const response = await api.delete(`/interview-questions/${questionId}`);
      return response.data;
    } catch (error) {
      console.error('질문 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 질문 업데이트
   * @param {number} questionId - 질문 ID
   * @param {Object} updateData - 업데이트 데이터
   * @returns {Promise<Object>} 업데이트된 질문
   */
  static async updateQuestion(questionId, updateData) {
    try {
      const response = await api.put(`/interview-questions/${questionId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('질문 업데이트 실패:', error);
      throw error;
    }
  }
}

export default InterviewQuestionApi; 