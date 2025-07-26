// src/api/api.js
import axiosInstance from './axiosInstance'; // 이 줄 추가!
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1', // 백엔드 주소에 맞게 수정
  withCredentials: false, // 쿠키 인증 시 필요
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 600000, // 10분 타임아웃 (하이라이팅 분석 시간 고려)
});

// 요청 전 인터셉터: 토큰이 있다면 자동으로 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('Current token:', token ? 'exists' : 'missing');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Request headers:', config.headers);
    } else {
      console.warn('No authentication token found');
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 로깅 또는 토큰 만료 시 처리 등
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      if (error.response.status === 401) {
        console.warn('🔒 인증 오류 - 로그인 필요');
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // You might want to redirect to login here
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// AI Agent API (가중치 추출용)
const agentApi = axios.create({
  baseURL: 'http://localhost:8001', // AI Agent 서버 주소
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60초로 증가 (AI 모델 로딩 시간 고려)
});

export const extractWeights = async (jobPostingContent, existingWeights = []) => {
  try {
    const response = await agentApi.post('/extract-weights/', {
      job_posting: jobPostingContent,
      existing_weights: existingWeights
    });
    return response.data;
  } catch (error) {
    console.error('가중치 추출 실패:', error);
    throw error;
  }
};

// 맞춤법 검사 API
export const spellCheck = async (text, fieldName = "") => {
  try {
    const response = await api.post('/ai-evaluate/spell-check', {
      text: text,
      field_name: fieldName
    });
    return response.data;
  } catch (error) {
    console.error('맞춤법 검사 실패:', error);
    throw error;
  }
};

// 개발자 전용 빠른 로그인 API
export const devLogin = async (email) => {
  try {
    const response = await api.post('/auth/dev-login', { email });
    return response.data;
  } catch (error) {
    console.error('빠른 로그인 실패:', error);
    throw error;
  }
};

// 자기소개서 형광펜 하이라이팅 API (application_id 기반)
export const highlightResumeByApplicationId = async (applicationId, jobpostId = null, companyId = null) => {
  try {
    const response = await api.post('/ai/highlight-resume-by-application', {
      application_id: applicationId,
      jobpost_id: jobpostId,
      company_id: companyId
    }, {
      timeout: 300000 // 5분으로 증가 (AI 분석 시간 고려)
    });
    return response.data;
  } catch (error) {
    console.error('하이라이팅 분석 실패:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('하이라이팅 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    }
    throw error;
  }
};

// 저장된 하이라이팅 결과 조회
export const getHighlightResults = async (applicationId) => {
  try {
    const response = await api.get(`/ai/highlight-results/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('하이라이팅 결과 조회 실패:', error);
    throw error;
  }
};

// 저장된 하이라이팅 결과 삭제
export const deleteHighlightResults = async (applicationId) => {
  try {
    const response = await api.delete(`/ai/highlight-results/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('하이라이팅 결과 삭제 실패:', error);
    throw error;
  }
};


export async function getResumeHighlights(text) {
  try {
    const response = await api.post('/ai-evaluate/highlight-resume', {
      text: text
    });
    return response.data;
  } catch (error) {
    console.error('이력서 하이라이트 실패:', error);
    throw error;
  }
}

// 면접 평가 항목 조회 API
export const getInterviewEvaluationItems = async (resumeId, applicationId = null, interviewStage) => {
  try {
    const response = await api.post('/interview-questions/evaluation-items/interview', {
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

// 이력서 기반 평가 기준 조회 API
export const getResumeBasedEvaluationCriteria = async (resumeId, applicationId = null, interviewStage = null) => {
  try {
    const params = new URLSearchParams();
    if (applicationId) params.append('application_id', applicationId);
    if (interviewStage) params.append('interview_stage', interviewStage);
    
    const response = await api.get(`/interview-questions/evaluation-criteria/resume/${resumeId}?${params}`);
    return response.data;
  } catch (error) {
    console.error('이력서 기반 평가 기준 조회 실패:', error);
    throw error;
  }
};

// 면접 평가 저장 API
export const saveInterviewEvaluation = async (evaluationData) => {
  try {
    const response = await api.post('/interview-evaluation/', evaluationData);
    return response.data;
  } catch (error) {
    console.error('면접 평가 저장 실패:', error);
    throw error;
  }
};

// 임원진 면접 평가 저장 API
export const saveExecutiveInterviewEvaluation = async (applicationId, evaluationData) => {
  try {
    const response = await api.post(`/executive-interview/evaluate/${applicationId}`, evaluationData);
    return response.data;
  } catch (error) {
    console.error('임원진 면접 평가 저장 실패:', error);
    throw error;
  }
};

// 면접 평가 결과 조회 API
export const getInterviewEvaluation = async (applicationId, interviewType = 'practical') => {
  try {
    const response = await api.get(`/interview-evaluation/${applicationId}/${interviewType}`);
    return response.data;
  } catch (error) {
    console.error('면접 평가 결과 조회 실패:', error);
    throw error;
  }
};

// 지원자 정보 조회 API
export const getApplication = async (applicationId) => {
  try {
    const response = await api.get(`/applications/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('지원자 정보 조회 실패:', error);
    throw error;
  }
};