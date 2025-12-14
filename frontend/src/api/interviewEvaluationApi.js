// 면접 평가 API 연동 함수들
import apiInstance from './axiosInstance';

/**
 * 면접 평가 데이터 저장
 * @param {Object} evaluationData - 평가 데이터
 * @returns {Promise<Object>} 저장된 평가 데이터
 */
export const saveInterviewEvaluation = async (evaluationData) => {
  try {
    const response = await apiInstance.post('/api/v2/interview-evaluation/', evaluationData);
    
    if (!response.data) {
      throw new Error('평가 저장에 실패했습니다');
    }
    
    return response.data;
  } catch (error) {
    console.error('평가 저장 오류:', error);
    throw error;
  }
};

/**
 * 면접 평가 데이터 조회
 * @param {number} interviewId - 면접 ID
 * @param {number} evaluatorId - 평가자 ID
 * @returns {Promise<Object>} 평가 데이터
 */
export const getInterviewEvaluation = async (interviewId, evaluatorId) => {
  try {
    const response = await apiInstance.get(`/api/v2/interview-evaluation/${interviewId}/${evaluatorId}`);
    
    if (!response.data) {
      throw new Error('평가 데이터 조회에 실패했습니다');
    }
    
    return response.data;
  } catch (error) {
    console.error('평가 조회 오류:', error);
    throw error;
  }
};

/**
 * 지원자별 면접 평가 목록 조회
 * @param {number} applicationId - 지원자 ID
 * @returns {Promise<Array>} 평가 목록
 */
export const getInterviewEvaluationsByApplication = async (applicationId) => {
  try {
    const response = await apiInstance.get(`/api/v2/interview-evaluation/application/${applicationId}`);
    
    if (!response.data) {
      throw new Error('평가 목록 조회에 실패했습니다');
    }
    
    return response.data;
  } catch (error) {
    console.error('평가 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 면접 평가 통계 데이터 조회
 * @param {Object} filters - 필터 조건
 * @returns {Promise<Object>} 통계 데이터
 */
export const getInterviewEvaluationStats = async (filters = {}) => {
  try {
    const response = await apiInstance.get('/api/v2/interview-evaluation/stats', { params: filters });
    
    if (!response.data) {
      throw new Error('통계 데이터 조회에 실패했습니다');
    }
    
    return response.data;
  } catch (error) {
    console.error('통계 조회 오류:', error);
    throw error;
  }
};

/**
 * 평가 기준 데이터 조회
 * @param {number} jobPostId - 채용공고 ID
 * @param {string} interviewStage - 면접 단계 ('practical' 또는 'executive')
 * @returns {Promise<Object>} 평가 기준 데이터
 */
export const getEvaluationCriteria = async (jobPostId, interviewStage) => {
  try {
    const response = await apiInstance.get(`/api/v2/interview-questions/suggest-evaluation-criteria`, {
      params: {
        job_post_id: jobPostId,
        interview_stage: interviewStage
      }
    });
    
    if (!response.data) {
      throw new Error('평가 기준 데이터 조회에 실패했습니다');
    }
    
    return response.data;
  } catch (error) {
    console.error('평가 기준 조회 오류:', error);
    throw error;
  }
};

/**
 * 평가 기준 데이터 업데이트
 * @param {number} criteriaId - 평가 기준 ID
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} 업데이트된 평가 기준 데이터
 */
export const updateEvaluationCriteria = async (criteriaId, updateData) => {
  try {
    const response = await apiInstance.put(`/api/v2/evaluation-criteria/${criteriaId}`, updateData);
    
    if (!response.data) {
      throw new Error('평가 기준 업데이트에 실패했습니다');
    }
    
    return response.data;
  } catch (error) {
    console.error('평가 기준 업데이트 오류:', error);
    throw error;
  }
};
