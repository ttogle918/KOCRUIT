import axiosInstance from './axiosInstance';

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

  // Get detailed assignment information
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

  // Get user's response history (accepted/rejected requests)
  getMyResponseHistory: async () => {
    try {
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/my-response-history/`);
      return response.data;
    } catch (error) {
      console.error('응답 기록 조회 실패:', error);
      throw error;
    }
  },

  // Cancel individual interview request (pending only)
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
      // 먼저 메인 엔드포인트 시도
      const response = await axiosInstance.get(`${INTERVIEW_PANEL_API}/my-interview-schedules/`);
      return response.data;
    } catch (error) {
      console.error('메인 면접 일정 API 실패:', error);
      
      // 대안 엔드포인트 시도
      try {
        console.log('대안 엔드포인트 시도 중...');
        const alternativeResponse = await axiosInstance.get('/schedules/interviews/');
        return alternativeResponse.data;
      } catch (alternativeError) {
        console.error('대안 엔드포인트도 실패:', alternativeError);
        
        // 테스트 엔드포인트 시도 (인증 없음)
        try {
          console.log('테스트 엔드포인트 시도 중...');
          const testResponse = await axiosInstance.get(`${INTERVIEW_PANEL_API}/my-interview-schedules-test/`);
          return testResponse.data;
        } catch (testError) {
          console.error('모든 엔드포인트 실패:', testError);
          throw error; // 원래 에러를 던짐
        }
      }
    }
  }
};

export default interviewPanelApi; 