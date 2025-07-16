// src/api/api.js
import axiosInstance from './axiosInstance'; // 이 줄 추가!
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1', // 백엔드 주소에 맞게 수정
  withCredentials: false, // 쿠키 인증 시 필요
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5분 타임아웃
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
  timeout: 30000,
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

// 자기소개서 형광펜 하이라이팅 API
export const highlightResumeText = async (text, jobDescription = "", companyValues = "") => {
  try {
    // baseURL이 http://localhost:8000 이므로, 전체 경로를 명확히 적음
    const response = await axiosInstance.post('/api/v1/ai/highlight-resume', {
      text,
      job_description: jobDescription,
      company_values: companyValues
    });
    return response.data;
  } catch (error) {
    console.error('자기소개서 하이라이팅 분석 실패:', error);
    throw error;
  }
};

export async function getResumeHighlights(text) {
  const res = await fetch('/api/v1/highlight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Failed to fetch highlights');
  const data = await res.json();
  return data.highlights;
}