import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROLES } from '../constants/roles';
import api from '../api/api';
import { devLogin } from '../api/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 개발자 전용 테스트 계정 정보
const DEV_EMAIL = 'dev@test.com';
const DEV_PASSWORD = 'dev123456';

// 일반 게스트 사용자 (로그인 전)
const guestUser = { 
  role: ROLES.GUEST, 
  id: null, 
  email: null, 
  name: null,
  company_id: null,
  isAuthenticated: false
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(guestUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // 토큰이 있으면 서버에서 최신 사용자 정보를 가져옴
      console.log('🔐 토큰 발견, 서버에서 최신 사용자 정보 가져오는 중...');
      api.get('/auth/me')
        .then(response => {
          const userData = response.data;
          console.log('🔐 서버에서 가져온 최신 사용자 정보:', userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('🔐 사용자 정보 가져오기 실패:', error);
          // 토큰이 유효하지 않으면 로그아웃 처리
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(guestUser);
          setIsLoading(false);
        });
    } else {
      setUser(guestUser);
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setError(null);
    
    // 개발자 전용 테스트 계정 체크
    if (email === DEV_EMAIL && password === DEV_PASSWORD) {
      console.log('🔐 개발자 테스트 계정으로 로그인');
      // 개발자 계정도 일반 로그인과 동일하게 처리
      try {
        const response = await api.post('/auth/login', { email, password });
        const { access_token } = response.data;
        
        localStorage.setItem('token', access_token);
        
        const userResponse = await api.get('/auth/me');
        const userData = userResponse.data;
        
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return true;
      } catch (err) {
        setError(err.response?.status === 401 
          ? '이메일 또는 비밀번호가 올바르지 않습니다.' 
          : '로그인 실패');
        return false;
      }
    }
    
    // 일반 로그인 처리
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      
      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data;
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return true;
    } catch (err) {
      setError(err.response?.status === 401 
        ? '이메일 또는 비밀번호가 올바르지 않습니다.' 
        : '로그인 실패');
      return false;
    }
  };

  const fastLogin = async (email) => {
    setError(null);
    
    try {
      const response = await devLogin(email);
      const { access_token } = response;
      
      localStorage.setItem('token', access_token);
      
      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data;
      
      console.log('🔐 개발자 로그인 사용자 정보:', userData);
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || '빠른 로그인 실패');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(guestUser);
  };

  const hasRole = (role) => {
    return user && user.role === role;
  };

  const hasAnyRole = (roles) => {
    return user && roles.includes(user.role);
  };

  const hasAllRoles = (roles) => {
    return user && roles.every(role => user.role === role);
  };

  const value = {
    hasRole: (role) => user && user.role === role,
    hasAnyRole: (roles) => user && roles.includes(user.role),
    hasAllRoles: (roles) => user && roles.every(role => user.role === role),
    user,
    setUser,
    isLoading,
    error,
    login,
    fastLogin,
    logout
    // hasRole,
    // hasAnyRole,
    // hasAllRoles
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
