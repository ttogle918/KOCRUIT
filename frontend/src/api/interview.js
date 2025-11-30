import axiosInstance from './axiosInstance';

// === Interview Evaluation API ===

/**
 * 면접 평가 데이터 저장
 * @param {Object} evaluationData - 평가 데이터
 * @returns {Promise<Object>} 저장된 평가 데이터
 */
export const saveInterviewEvaluation = async (evaluationData) => {
  try {
    const response = await axiosInstance.post('/interview-evaluation/', evaluationData);
    
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
 * @param {number} evaluatorId - 평가자 ID (또는 interviewType)
 * @returns {Promise<Object>} 평가 데이터
 */
export const getInterviewEvaluation = async (interviewId, evaluatorId) => {
  try {
    // evaluatorId가 문자열이면 interviewType으로 간주 (api.js 호환)
    const url = typeof evaluatorId === 'string' 
      ? `/interview-evaluation/${interviewId}/${evaluatorId}`
      : `/interview-evaluation/${interviewId}/${evaluatorId}`;
      
    const response = await axiosInstance.get(url);
    
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
    const response = await axiosInstance.get(`/interview-evaluation/application/${applicationId}`);
    
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
    const response = await axiosInstance.get('/interview-evaluation/stats', { params: filters });
    
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
    const response = await axiosInstance.get(`/interview-questions/suggest-evaluation-criteria`, {
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
    const response = await axiosInstance.put(`/evaluation-criteria/${criteriaId}`, updateData);
    
    if (!response.data) {
      throw new Error('평가 기준 업데이트에 실패했습니다');
    }
    
    return response.data;
  } catch (error) {
    console.error('평가 기준 업데이트 오류:', error);
    throw error;
  }
};

/**
 * 면접 평가 항목 조회 API
 */
export const getInterviewEvaluationItems = async (resumeId, applicationId = null, interviewStage) => {
  try {
    const response = await axiosInstance.post('/interview-questions/evaluation-items/interview', {
      resume_id: resumeId,
      application_id: applicationId,
      interview_stage: interviewStage // "practical" 또는 "executive"
    });
    return response.data;
  } catch (error) {
    console.error('면접 평가 항목 조회 실패:', error);
    throw error;
  }
};

/**
 * 임원진 면접 평가 저장 API
 */
export const saveExecutiveInterviewEvaluation = async (applicationId, evaluationData) => {
  try {
    const response = await axiosInstance.post(`/executive-interview/evaluate/${applicationId}`, evaluationData);
    return response.data;
  } catch (error) {
    console.error('임원진 면접 평가 저장 실패:', error);
    throw error;
  }
};

// === Interview Panel API ===

const INTERVIEW_PANEL_API = '/interview-panel';

export const interviewPanelApi = {
  // Assign interviewers for a job post
  assignInterviewers: async (criteria) => {
    try {
      const response = await axiosInstance.post(`${INTERVIEW_PANEL_API}/assign-interviewers/`, criteria);
      return response.data;
    } catch (error) {
      console.error('면접관 배정 실패:', error);
      throw error;
    }
  },

  // Respond to interview request (accept/reject)
  respondToRequest: async (requestId, status) => {
    try {
      const response = await axiosInstance.post(`${INTERVIEW_PANEL_API}/respond-to-request/`, {
        request_id: requestId,
        status: status
      });
      return response.data;
    } catch (error) {
      console.error('면접 요청 응답 실패:', error);
      throw error;
    }
  },

  // Get pending requests for current user
  getMyPendingRequests: async () => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/my-pending-requests/`);
      return response.data;
    } catch (error) {
      console.error('대기 중인 요청 조회 실패:', error);
      throw error;
    }
  },

  // Get panel members for a job post
  getPanelMembers: async (jobPostId) => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/panel-members/${jobPostId}/`);
      return response.data;
    } catch (error) {
      console.error('면접관 목록 조회 실패:', error);
      throw error;
    }
  },

  // Get assignments for a job post
  getJobPostAssignments: async (jobPostId) => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/assignments/${jobPostId}/`);
      return response.data;
    } catch (error) {
      console.error('면접 배정 조회 실패:', error);
      throw error;
    }
  },

  // Get assignment details
  getAssignmentDetails: async (assignmentId) => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/assignment/${assignmentId}/details/`);
      return response.data;
    } catch (error) {
      console.error('면접 배정 상세 조회 실패:', error);
      throw error;
    }
  },

  // Cancel an assignment
  cancelAssignment: async (assignmentId) => {
    try {
      const response = await axiosInstance.delete(`${INTERVIEW_PANEL_API}/assignment/${assignmentId}/`);
      return response.data;
    } catch (error) {
      console.error('면접 배정 취소 실패:', error);
      throw error;
    }
  },

  // Get user's response history
  getMyResponseHistory: async () => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/my-response-history/`);
      return response.data;
    } catch (error) {
      console.error('응답 기록 조회 실패:', error);
      throw error;
    }
  },

  // Cancel individual interview request
  cancelRequest: async (requestId) => {
    try {
      const response = await axiosInstance.post(`${INTERVIEW_PANEL_API}/request/${requestId}/cancel/`);
      return response.data;
    } catch (error) {
      console.error('면접관 요청 취소 실패:', error);
      throw error;
    }
  },

  // Invite new interviewer manually
  inviteInterviewer: async (assignmentId, userId) => {
    try {
      const response = await axiosInstance.post(`${INTERVIEW_PANEL_API}/assignment/${assignmentId}/invite/`, {}, {
        params: { user_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error('면접관 초대 실패:', error);
      throw error;
    }
  },

  // Search company members for interview panel
  searchCompanyMembers: async (companyId, search = '') => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/company/${companyId}/members/search/`, {
        params: { q: search }
      });
      return response.data;
    } catch (error) {
      console.error('회사 멤버 검색 실패:', error);
      throw error;
    }
  },

  // Get matching details for an assignment
  getMatchingDetails: async (assignmentId) => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/assignment/${assignmentId}/matching-details/`);
      return response.data;
    } catch (error) {
      console.error('매칭 상세 정보 조회 실패:', error);
      throw error;
    }
  },

  // Get interviewer profile details
  getInterviewerProfile: async (userId) => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/interviewer-profile/${userId}/`);
      return response.data;
    } catch (error) {
      console.error('면접관 프로필 조회 실패:', error);
      throw error;
    }
  },

  // Get my interview schedules for current user
  getMyInterviewSchedules: async () => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/my-interview-schedules/`);
      return response.data;
    } catch (error) {
      console.error('메인 면접 일정 API 실패:', error);
      try {
        const alternativeResponse = await axiosInstance.get('/schedules/interviews/');
        return alternativeResponse.data;
      } catch (alternativeError) {
        console.error('대안 엔드포인트도 실패:', alternativeError);
        try {
          const testResponse = await axiosInstance.get(`${INTERVIEW_PANEL_API}/my-interview-schedules-test/`);
          return testResponse.data;
        } catch (testError) {
          console.error('모든 엔드포인트 실패:', testError);
          throw error;
        }
      }
    }
  }
};

export default {
  saveInterviewEvaluation,
  getInterviewEvaluation,
  getInterviewEvaluationsByApplication,
  getInterviewEvaluationStats,
  getEvaluationCriteria,
  updateEvaluationCriteria,
  getInterviewEvaluationItems,
  saveExecutiveInterviewEvaluation,
  interviewPanelApi
};
