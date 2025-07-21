import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Layout from '../../layout/Layout';
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaUserTie, FaHistory } from 'react-icons/fa';
import { interviewPanelApi } from '../../api/interviewPanelApi';
import { markInterviewNotificationsAsRead } from '../../api/notificationApi';
import { useAuth } from '../../context/AuthContext';

export default function MemberSchedule() {
  const [panelRequests, setPanelRequests] = useState([]);
  const [responseHistory, setResponseHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [responding, setResponding] = useState({}); // 응답 중인 요청 ID들을 추적
  const { user } = useAuth();

  // Mark all interview notifications as read when page loads
  useEffect(() => {
    const markNotificationsAsRead = async () => {
      if (!user) return;
      
      try {
        await markInterviewNotificationsAsRead();
        console.log('면접 관련 알림을 모두 읽음 처리했습니다.');
      } catch (error) {
        console.error('알림 읽음 처리 실패:', error);
      }
    };

    markNotificationsAsRead();
  }, [user]);

  // Load interview panel requests
  useEffect(() => {
    const loadPanelRequests = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const response = await interviewPanelApi.getMyPendingRequests();
        setPanelRequests(response);
      } catch (error) {
        console.error('면접관 요청 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPanelRequests();
  }, [user]);

  // Load response history
  useEffect(() => {
    const loadResponseHistory = async () => {
      if (!user) return;
      
      setHistoryLoading(true);
      try {
        const response = await interviewPanelApi.getMyResponseHistory();
        setResponseHistory(response);
      } catch (error) {
        console.error('응답 기록 로드 실패:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadResponseHistory();
  }, [user]);

  // Handle interview panel request response
  const handlePanelResponse = async (requestId, status) => {
    // 이미 응답 중인 요청인지 확인
    if (responding[requestId]) {
      return;
    }

    setResponding(prev => ({ ...prev, [requestId]: true }));
    
    try {
      await interviewPanelApi.respondToRequest(requestId, status);
      
      // Update local state
      setPanelRequests(prev => prev.filter(req => req.request_id !== requestId));
      
      // Reload history to show the new response
      const historyResponse = await interviewPanelApi.getMyResponseHistory();
      setResponseHistory(historyResponse);
      
      // Show success message
      alert(status === 'ACCEPTED' ? '면접관 요청을 수락했습니다.' : '면접관 요청을 거절했습니다.');
    } catch (error) {
      console.error('면접관 요청 응답 실패:', error);
      
      // 이미 응답한 요청인지 확인
      if (error.response?.data?.detail === 'Request has already been responded to') {
        alert('이미 응답한 요청입니다. 페이지를 새로고침합니다.');
        // 페이지 새로고침하여 최신 상태로 업데이트
        window.location.reload();
      } else {
        alert('요청 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setResponding(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    }
  };

  // Format assignment type for display
  const formatAssignmentType = (type) => {
    switch (type) {
      case 'SAME_DEPARTMENT':
        return '같은 부서';
      case 'HR_DEPARTMENT':
        return '인사팀';
      default:
        return type;
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return { text: '수락', color: 'text-green-600', bgColor: 'bg-green-100', icon: <FaCheckCircle className="text-green-500" /> };
      case 'REJECTED':
        return { text: '거절', color: 'text-red-600', bgColor: 'bg-red-100', icon: <FaTimesCircle className="text-red-500" /> };
      default:
        return { text: status, color: 'text-gray-600', bgColor: 'bg-gray-100', icon: null };
    }
  };

  return (
    <Layout title="면접 일정 응답">
      <div className="min-h-screen bg-[#eef6ff] dark:bg-gray-900 flex justify-center items-start py-12 px-4">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">면접관 요청 관리</h1>
          
          {/* Pending Interview Panel Requests */}
          <div className="mb-8">
            <h2 className="font-bold mb-4 text-lg flex items-center gap-2">
              <FaUserTie className="text-blue-600" />
              대기 중인 면접관 요청
            </h2>
            {loading ? (
              <div className="text-gray-500">로딩 중...</div>
            ) : panelRequests.length === 0 ? (
              <div className="text-gray-500 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                대기 중인 면접관 요청이 없습니다.
              </div>
            ) : (
              <ul className="space-y-3">
                {panelRequests.map(req => (
                  <li key={req.request_id} className="p-4 bg-blue-50 dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-blue-700 dark:text-blue-300">
                        {req.job_post_title}
                      </div>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        {formatAssignmentType(req.assignment_type)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {req.schedule_date && (
                        <div>면접 일정: {new Date(req.schedule_date).toLocaleString()}</div>
                      )}
                      <div>요청일: {new Date(req.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                          responding[req.request_id] 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                        onClick={() => handlePanelResponse(req.request_id, 'ACCEPTED')}
                        disabled={responding[req.request_id]}
                      >
                        {responding[req.request_id] ? '처리 중...' : '수락'}
                      </button>
                      <button
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                          responding[req.request_id] 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                        onClick={() => handlePanelResponse(req.request_id, 'REJECTED')}
                        disabled={responding[req.request_id]}
                      >
                        {responding[req.request_id] ? '처리 중...' : '거절'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Response History */}
          <div>
            <h2 className="font-bold mb-4 text-lg flex items-center gap-2">
              <FaHistory className="text-purple-600" />
              응답 기록
            </h2>
            {historyLoading ? (
              <div className="text-gray-500">로딩 중...</div>
            ) : responseHistory.length === 0 ? (
              <div className="text-gray-500 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                아직 응답한 면접관 요청이 없습니다.
              </div>
            ) : (
              <ul className="space-y-3">
                {responseHistory.map(req => {
                  const statusInfo = formatStatus(req.status);
                  return (
                    <li key={req.request_id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-700 dark:text-gray-300">
                          {req.job_post_title}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${statusInfo.bgColor} ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                          {statusInfo.icon}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {req.schedule_date && (
                          <div>면접 일정: {new Date(req.schedule_date).toLocaleString()}</div>
                        )}
                        <div>요청일: {new Date(req.created_at).toLocaleDateString()}</div>
                        <div>응답일: {new Date(req.responded_at).toLocaleDateString()}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        역할: {formatAssignmentType(req.assignment_type)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 