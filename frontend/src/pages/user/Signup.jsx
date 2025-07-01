import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../../layout/Layout';
import axios from 'axios';

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '', 
    name: '',
    address: '',
    gender: '',
    phone: '',
    birth_date: '',
    userType: '' // 일반 or 기업
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 기업회원 이메일 인증 관련 상태
  const [emailSent, setEmailSent] = useState(false);

  const isCompanyUser = form.userType === 'company';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (form.userType === 'company') {
      // 기업 회원인 경우 이메일 인증 완료 여부 확인
      try {
        const verificationResponse = await axios.get(`http://localhost:8000/api/v1/auth/check-email-verification?email=${form.email}`);
        if (!verificationResponse.data.verified) {
          alert('이메일 인증을 먼저 완료해주세요. 이메일의 링크를 클릭해주세요.');
          return;
        }
      } catch (error) {
        console.error('이메일 인증 확인 실패:', error);
        alert('이메일 인증 확인에 실패했습니다.');
        return;
      }
    }

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

    // 기업회원 도메인 검사
    if (isCompanyUser && !form.email.endsWith('@gmail.com')) {
      setError('기업 이메일(@gmail.com)로 가입해야 합니다.');
      setIsLoading(false);
      return;
    }

    // 기업회원 인증 미완료 시
    if (isCompanyUser && !emailSent) {
      setError('이메일 인증을 먼저 완료해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      // 백엔드 스키마에 맞는 데이터 준비
      const signupData = {
        email: form.email,
        name: form.name,
        password: form.password,
        address: form.address || null,
        gender: form.gender || null,
        phone: form.phone || null,
        birth_date: form.birth_date || null,
        userType: form.userType || 'applicant',
      };

      const res = await fetch('http://localhost:8000/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        if (data.detail && data.detail.includes("이미 가입된 이메일")) {
          setError('이미 사용 중인 이메일입니다.');
        } else {
          setError(data.detail || '회원가입 실패');
        }
        return;
      }
      
      alert('회원가입 성공! 이메일 인증을 확인해주세요.');
      navigate('/login');
    } catch (error) {
      console.error('Signup error:', error);
      let msg = '회원가입 중 오류가 발생했습니다.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          msg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // FastAPI validation error: 배열
          msg = error.response.data.detail.map(e => e.msg).join('\\n');
        } else if (typeof error.response.data.detail === 'object') {
          // 객체일 경우
          msg = JSON.stringify(error.response.data.detail);
        }
      }
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 이메일 입력 필드에 onBlur 이벤트 추가
  const checkEmailDuplicate = async () => {
    if (!form.email) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1/auth/check-email?email=${form.email}`);
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

  // 기업회원 이메일 인증 요청
  const handleSendVerification = async () => {
    if (!form.email) {
      setError('이메일을 먼저 입력하세요.');
      return;
    }

    try {
      // 이메일 인증만을 위한 임시 요청 (실제 회원가입은 하지 않음)
      const verificationData = {
        email: form.email,
        action: 'send_verification'
      };

      const res = await fetch('http://localhost:8000/api/v1/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationData),
      });
      
      if (res.ok) {
        setEmailSent(true);
        alert('인증 이메일이 전송되었습니다. 이메일을 확인해주세요.');
      } else {
        const data = await res.json();
        setError(data.detail || '이메일 전송에 실패했습니다.');
      }
    } catch (err) {
      console.error('이메일 전송 오류:', err);
      setError('이메일 전송에 실패했습니다.');
    }
  };

  return (
    <Layout title="회원가입">
      <form 
        onSubmit={handleSubmit} 
        className="flex flex-col gap-4 max-w-md mx-auto mt-32 justify-center bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg"
      >
        <select
          name="userType"
          value={form.userType}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">회원 유형 선택</option>
          <option value="applicant">일반 회원</option>
          <option value="company">기업 회원</option>
        </select>

        <input 
          name="email" 
          type="email"
          value={form.email} 
          onChange={handleChange} 
          onBlur={checkEmailDuplicate}
          placeholder={isCompanyUser ? "기업 이메일 (@gmail.com)" : "이메일"} 
          required 
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
          disabled={isLoading}
        />

        {isCompanyUser && (
          <>
            <button
              type="button"
              onClick={handleSendVerification}
              disabled={emailSent || isLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              이메일 인증 요청
            </button>

            {emailSent && (
              <p className="text-green-600 text-sm">
                인증 이메일이 발송되었습니다! 이메일의 링크를 클릭하여 인증을 완료해주세요. ✔️
              </p>
            )}
          </>
        )}

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
        <input 
          name="address" 
          value={form.address} 
          onChange={handleChange} 
          placeholder="주소 (선택사항)" 
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
          disabled={isLoading}
        />
        <select 
          name="gender" 
          value={form.gender} 
          onChange={handleChange} 
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
          disabled={isLoading}
        >
          <option value="">성별 선택 (선택사항)</option>
          <option value="MALE">남성</option>
          <option value="FEMALE">여성</option>
        </select>
        <input 
          name="phone" 
          value={form.phone} 
          onChange={handleChange} 
          placeholder="전화번호 (선택사항)" 
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
          disabled={isLoading}
        />
        <input 
          name="birth_date" 
          type="date" 
          value={form.birth_date} 
          onChange={handleChange} 
          placeholder="생년월일 (선택사항)" 
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
