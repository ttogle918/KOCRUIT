import api from './axiosInstance';

/**
 * 면접 관련 일반 API 관리
 */
class InterviewApi {
  /**
   * 해당 공고의 모든 지원자 목록 조회 (전체 통계용)
   * @param {number} jobPostId - 공고 ID
   */
  static async getAllApplicants(jobPostId) {
    try {
      const response = await api.get(`/applications/job/${jobPostId}/applicants`);
      return response.data;
    } catch (error) {
      console.error('전체 지원자 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * AI 면접 대상자 목록 조회
   * @param {number} jobPostId - 공고 ID
   */
  static async getAiInterviewCandidates(jobPostId = null) {
    try {
      const response = await api.get(`/applications/job/${jobPostId}/applicants-ai-interview`);
      console.log("response", response.data);
      return response.data;
    } catch (error) {
      console.error('AI 면접 대상자 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 실무진 면접 대상자 목록 조회
   * @param {number} jobPostId - 공고 ID
   */
  static async getPracticalCandidates(jobPostId = null) {
    try {
      const response = await api.get(`/applications/job/${jobPostId}/applicants-practical-interview`);
      return response.data;
    } catch (error) {
      console.error('실무진 면접 대상자 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 임원진 면접 대상자 목록 조회
   * @param {number} jobPostId - 공고 ID
   */
  static async getExecutiveCandidates(jobPostId = null) {
    try {
      const response = await api.get(`/applications/job/${jobPostId}/applicants-executive-interview`);
      return response.data;
    } catch (error) {
      console.error('임원진 면접 대상자 조회 실패:', error);
      throw error;
    }
  }
  /**
   * 특정 지원자 정보 조회
   * @param {number} applicationId 
   */
  static async getApplication(applicationId) {
    try {
      const response = await api.get(`/applications/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('지원자 정보 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 면접 상태 업데이트 API
   * @param {number} applicationId 
   * @param {string} stageStatus 
   */
  static async updateInterviewStatus(applicationId, stageStatus) {
    try {
      const response = await api.put(`/schedules/${applicationId}/interview-status`, null, {
        params: { stage_status: stageStatus }
      });
      return response.data;
    } catch (error) {
      console.error('면접 상태 업데이트 실패:', error);
      throw error;
    }
  }
}

export default InterviewApi;

