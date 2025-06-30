import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/datepicker.css'; // 사용자 정의 스타일이 있다면 유지
import { useNavigate } from 'react-router-dom';
import { FaCheck } from 'react-icons/fa';
import Layout from '../../layout/Layout';
import { useAuth } from '../../context/AuthContext';

function MyPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#eef6ff] dark:bg-gray-900 flex justify-center items-center py-16 px-4">
        <div className="relative bg-white dark:bg-gray-800 w-full max-w-6xl rounded-xl shadow-lg p-12 grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-lg font-semibold px-3 py-1 rounded">← 뒤로가기
          </button>
          {/* 왼쪽 프로필 섹션 */}
          <div className="flex flex-col items-center md:items-start">
            {/* 프로필 이미지 */}
            <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <i className="fa-solid fa-user text-6xl text-gray-500"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">홍길동</h2>

            <div className="space-y-3 text-gray-700 dark:text-gray-300 w-full">
              <div>전화번호</div>
              <div>이메일</div>
              <div>상태 메세지</div>

              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800 dark:text-white">Private profile</span>
                <FaCheck className="text-green-500 text-lg" />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800 dark:text-white">Notifications</span>
                <FaCheck className="text-green-500 text-lg" />
              </div>

              <button
                onClick={handleLogout}
                className="mt-6 w-full text-center py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md"
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* 오른쪽 달력 + 연차 정보 */}
          <div className="flex flex-col items-center justify-start gap-8">
            {/* 달력 */}
            <div className="flex justify-center scale-110 mt-10">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                inline
                calendarClassName="bg-transparent"
                dayClassName={() => 'text-gray-800 dark:text-white'}
              />
            </div>


            {/* 연차 정보 */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg text-sm overflow-hidden w-full max-w-sm">
              <div className="grid grid-cols-2 divide-x divide-gray-300 dark:divide-gray-600 text-center">
                <div className="p-4">
                  <div className="text-gray-500 dark:text-gray-300">총 연차</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">15</div>
                </div>
                <div className="p-4">
                  <div className="text-gray-500 dark:text-gray-300">남은 연차</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">10</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

export default MyPage;
