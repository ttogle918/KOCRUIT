// src/api/api.js
import axiosInstance from './axiosInstance';
import axios from 'axios';

/**
 * 공통 axios 인스턴스를 기본으로 export 합니다.
 * 특정 도메인에 종속되지 않은 공통 API들을 정의합니다.
 */

export default axiosInstance;

// AI Agent API (가중치 추출용) - Port 8001
const agentApi = axios.create({
  baseURL: 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
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
    const response = await axiosInstance.post('/ai-evaluate/spell-check', {
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
    const response = await axiosInstance.post('/auth/dev-login', { email });
    return response.data;
  } catch (error) {
    console.error('빠른 로그인 실패:', error);
    throw error;
  }
};

// 이력서 하이라이팅 및 분석 관련
export const highlightResumeByApplicationId = async (applicationId, jobpostId = null, companyId = null) => {
  try {
    const response = await axiosInstance.post('/ai/highlight-resume-by-application', {
      application_id: applicationId,
      jobpost_id: jobpostId,
      company_id: companyId
    }, {
      timeout: 300000
    });
    return response.data;
  } catch (error) {
    console.error('하이라이팅 분석 실패:', error);
    throw error;
  }
};

export const getHighlightResults = async (applicationId) => {
  try {
    const response = await axiosInstance.get(`/ai/highlight-results/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('하이라이팅 결과 조회 실패:', error);
    throw error;
  }
};

export const deleteHighlightResults = async (applicationId) => {
  try {
    const response = await axiosInstance.delete(`/ai/highlight-results/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('하이라이팅 결과 삭제 실패:', error);
    throw error;
  }
};

// 지원자 정보 조회 공통 API
export const getApplication = async (applicationId) => {
  try {
    const response = await axiosInstance.get(`/applications/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('지원자 정보 조회 실패:', error);
    throw error;
  }
};
