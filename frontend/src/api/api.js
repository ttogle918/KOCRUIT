// src/api/api.js
import axios from 'axios';
import mockApi from './mockApi';

// 개발 환경에서는 mockApi 사용, 프로덕션에서는 실제 API 사용
const isDevelopment = process.env.NODE_ENV === 'development';
const api = isDevelopment ? mockApi : axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  withCredentials: false, // 쿠키 인증 시 필요
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10초 타임아웃
});

// axios 인터셉터 설정 (실제 API 사용 시에만)
if (!isDevelopment) {
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
}

// Enhanced API with fallback to mock
const enhancedApi = {
  async post(url, data) {
    try {
      return await api.post(url, data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.log('Using mock API for POST:', url);
        return await mockApi.post(url, data);
      }
      throw error;
    }
  },

  async get(url) {
    try {
      return await api.get(url);
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.log('Using mock API for GET:', url);
        return await mockApi.get(url);
      }
      throw error;
    }
  },

  async put(url, data) {
    try {
      return await api.put(url, data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.log('Using mock API for PUT:', url);
        return await mockApi.put(url, data);
      }
      throw error;
    }
  },

  async delete(url) {
    try {
      return await api.delete(url);
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.log('Using mock API for DELETE:', url);
        return await mockApi.delete(url);
      }
      throw error;
    }
  }
};

export default enhancedApi;
