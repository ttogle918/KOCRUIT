import api from './api';

class QuestionVideoAnalysisApi {
  /**
   * 질문별 비디오 분석 시작
   * @param {number} applicationId - 지원자 ID
   * @returns {Promise<Object>} 분석 시작 결과
   */
  static async startQuestionAnalysis(applicationId) {
    try {
      const response = await api.post(`/question-video-analysis/analyze/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('질문별 분석 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 질문별 분석 결과 조회
   * @param {number} applicationId - 지원자 ID
   * @returns {Promise<Object>} 분석 결과
   */
  static async getQuestionAnalysisResults(applicationId) {
    try {
      const response = await api.get(`/question-video-analysis/results/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('질문별 분석 결과 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 질문별 분석 통계 조회
   * @param {number} applicationId - 지원자 ID
   * @returns {Promise<Object>} 분석 통계
   */
  static async getQuestionAnalysisStatistics(applicationId) {
    try {
      const response = await api.get(`/question-video-analysis/statistics/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('질문별 분석 통계 조회 실패:', error);
      throw error;
    }
  }
}

export default QuestionVideoAnalysisApi; 