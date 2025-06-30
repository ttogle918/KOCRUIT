import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROLES } from '../constants/roles';
import api from '../api/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const guestUser = { role: ROLES.GUEST };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(guestUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('user');
    if (token && userInfo) {
      setUser(JSON.parse(userInfo));
    } else {
      setUser(guestUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken } = response.data;
      
      localStorage.setItem('token', accessToken);
      
      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data;
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return true;
    } catch (err) {
      setError(err.response?.status === 401 
        ? '이메일 또는 비밀번호가 올바르지 않습니다.' 
        : '로그인 실패');
      setUser(guestUser);
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
    user,
    setUser,
    isLoading,
    error,
    login,
    logout,
    hasRole,
    hasAnyRole,
    hasAllRoles
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};