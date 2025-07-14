import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../../layout/Layout';
import { useAuth } from '../../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login, fastLogin, user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fastLoginEmail, setFastLoginEmail] = useState('');
  const [showFastLogin, setShowFastLogin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFastLoginLoading, setIsFastLoginLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(form.email, form.password);
    setIsLoading(false);

    if (success) {
      // 개발자 계정이면 기업 홈으로, 일반 사용자는 역할에 따라 이동
      if (form.email === 'dev@test.com') {
        navigate('/corporatehome');
      } else {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && ['ADMIN', 'MANAGER', 'MEMBER', 'EMP'].includes(user.role)) {
          navigate('/corporatehome');
        } else {
          navigate('/');
        }
      }
    } else {
      setError('로그인 실패. 이메일과 비밀번호를 확인하세요.');
    }
  };

  const handleFastLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsFastLoginLoading(true);

    const success = await fastLogin(fastLoginEmail);
    setIsFastLoginLoading(false);

    if (success) {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && ['ADMIN', 'MANAGER', 'MEMBER', 'EMP'].includes(user.role)) {
        navigate('/corporatehome');
      } else {
        navigate('/');
      }
      setShowFastLogin(false);
      setFastLoginEmail('');
    } else {
      setError('빠른 로그인 실패. 이메일을 확인하세요.');
    }
  };

  return (
    <Layout title="로그인">
      <div className="flex flex-col gap-4 max-w-md mx-auto mt-32 justify-center bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="이메일"
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="비밀번호"
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button 
            type="submit" 
            className={`bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 개발자 전용 빠른 로그인 */}
        <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
          <div className="text-center mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">개발자 전용</span>
          </div>
          {!showFastLogin ? (
            <button
              onClick={() => setShowFastLogin(true)}
              className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 transition-colors text-sm"
            >
              🚀 빠른 로그인 (이메일만)
            </button>
          ) : (
            <form onSubmit={handleFastLogin} className="flex flex-col gap-3">
              <input
                type="email"
                value={fastLoginEmail}
                onChange={(e) => setFastLoginEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                placeholder="이메일 입력"
              />
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  className={`flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 transition-colors text-sm ${isFastLoginLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isFastLoginLoading}
                >
                  {isFastLoginLoading ? '로그인 중...' : '빠른 로그인'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFastLogin(false);
                    setFastLoginEmail('');
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </div>

        <Link to="/signup" className="text-blue-600 text-center hover:text-blue-700 text-sm">
          계정이 없으신가요? 회원가입
        </Link>
      </div>
    </Layout>
  );
}

export default Login;
