import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../../layout/Layout';

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 비밀번호 길이 검사
    if (form.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      setIsLoading(false);
      return;
    }

    // 비밀번호 확인 검사
    if (form.password !== form.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.message && data.message.includes("Email already exists")) {
          setError('이미 사용 중인 이메일입니다.');
        } else {
          setError(data.message || '회원가입 실패');
        }
        return;
      }
      alert('회원가입 성공! 로그인 해주세요.');
      navigate('/login');
    } catch (err) {
      setError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 이메일 입력 필드에 onBlur 이벤트 추가
  const checkEmailDuplicate = async () => {
    if (!form.email) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1/users/check-email?email=${form.email}`);
      const data = await res.json();
      
      if (data.exists) {
        setError('이미 사용 중인 이메일입니다.');
      } else {
        setError('');
      }
    } catch (err) {
      console.error('이메일 중복 체크 오류:', err);
    }
  };

  return (
    <Layout title="회원가입">
      <form 
        onSubmit={handleSubmit} 
        className="flex flex-col gap-4 max-w-md mx-auto mt-32 justify-center bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg"
      >
        <input 
          name="email" 
          type="email"
          value={form.email} 
          onChange={handleChange} 
          onBlur={checkEmailDuplicate}
          placeholder="이메일" 
          required 
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
          disabled={isLoading}
        />
        <input 
          name="name" 
          value={form.name} 
          onChange={handleChange} 
          placeholder="이름" 
          required 
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
          disabled={isLoading}
        />
        <input 
          name="password" 
          type="password" 
          value={form.password} 
          onChange={handleChange} 
          placeholder="비밀번호 (6자 이상)" 
          required 
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
          disabled={isLoading}
        />
        <input 
          name="confirmPassword" 
          type="password" 
          value={form.confirmPassword} 
          onChange={handleChange} 
          placeholder="비밀번호 확인" 
          required 
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
          disabled={isLoading}
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button 
          type="submit" 
          className={`bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? '처리 중...' : '회원가입'}
        </button>
        <Link to="/login" className="text-blue-600 text-center hover:text-blue-700">
          이미 계정이 있으신가요? 로그인
        </Link>
      </form>
    </Layout>
  );
}

export default Signup;
