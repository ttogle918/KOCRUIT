import api from './axiosInstance';

class PersonalQuestionApi {
  /**
   * 개인 질문 생성
   * @param {Object} data - 질문 생성 데이터
   * @returns {Promise<Object>} 생성 결과
   */
  static async generatePersonalQuestions(data) {
    try {
      const response = await api.post('/interview-questions/job-questions', data);
      return response.data;
    } catch (error) {
      console.error('개인 질문 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 저장된 개인 질문 결과 조회
   * @param {number} applicationId - 지원자 ID
   * @returns {Promise<Object>} 조회 결과
   */
  static async getPersonalQuestions(applicationId) {
    try {
      const response = await api.get(`/interview-questions/personal-questions/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('개인 질문 조회 실패:', error);
      throw error;
    }
  }
}

export default PersonalQuestionApi; 