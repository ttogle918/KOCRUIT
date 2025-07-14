import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Layout from '../../layout/Layout';
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaUserTie, FaBuilding } from 'react-icons/fa';
import { interviewPanelApi } from '../../api/interviewPanelApi';
import { useAuth } from '../../context/AuthContext';

// Mock data: interview classes with multiple options
const initialRequests = [
  {
    id: 1,
    className: '보안SW 개발자 모집',
    options: [
      { id: 1, date: new Date(), time: '14:00', status: 'pending' },
      { id: 2, date: new Date(Date.now() + 86400000), time: '10:00', status: 'pending' },
    ],
    status: 'pending',
  },
];
const initialSchedules = [
  { date: new Date(), time: '09:00', status: 'approved' },
];

export default function MemberSchedule() {
  const [requests, setRequests] = useState(initialRequests);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [panelRequests, setPanelRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Approve one option in a class, reject others
  const handleApprove = (reqId, optId) => {
    setRequests(prev => prev.map(req =>
      req.id === reqId
        ? {
            ...req,
            options: req.options.map(opt =>
              opt.id === optId
                ? { ...opt, status: 'approved' }
                : { ...opt, status: 'rejected' }
            ),
            status: 'responded',
          }
        : req
    ));
    // Add approved option to schedule
    const req = requests.find(r => r.id === reqId);
    const opt = req.options.find(o => o.id === optId);
    setSchedules(prev => [...prev, { date: opt.date, time: opt.time, status: 'approved' }]);
  };

  // Reject a single option (if not already approved)
  const handleReject = (reqId, optId) => {
    setRequests(prev => prev.map(req =>
      req.id === reqId
        ? {
            ...req,
            options: req.options.map(opt =>
              opt.id === optId && opt.status === 'pending'
                ? { ...opt, status: 'rejected' }
                : opt
            ),
          }
        : req
    ));
  };

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

  // Handle interview panel request response
  const handlePanelResponse = async (requestId, status) => {
    try {
      await interviewPanelApi.respondToRequest(requestId, status);
      
      // Update local state
      setPanelRequests(prev => prev.filter(req => req.request_id !== requestId));
      
      // Show success message
      alert(status === 'ACCEPTED' ? '면접관 요청을 수락했습니다.' : '면접관 요청을 거절했습니다.');
    } catch (error) {
      console.error('면접관 요청 응답 실패:', error);
      alert('요청 처리 중 오류가 발생했습니다.');
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

  return (
    <Layout title="면접 일정 응답">
      <div className="min-h-screen bg-[#eef6ff] dark:bg-gray-900 flex justify-center items-start py-12 px-4">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 flex flex-col md:flex-row gap-8">
          {/* Calendar on the left */}
          <div className="w-full md:w-1/3">
            <h2 className="font-bold mb-4 flex items-center gap-2 text-lg"><FaCalendarAlt />내 일정</h2>
            <DatePicker
              selected={null}
              inline
              highlightDates={schedules.map(s => s.date)}
              readOnly
            />
            <ul className="mt-4">
              {schedules.map((s, idx) => (
                <li key={idx} className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded flex items-center gap-2">
                  <FaCheckCircle className="text-green-500" />
                  {s.date.toLocaleDateString()} {s.time} - {s.status === 'approved' ? '승인됨' : '대기'}
                </li>
              ))}
            </ul>
          </div>
          {/* Requests on the right */}
          <div className="flex-1">
            <h2 className="font-bold mb-4 text-lg">면접 요청 목록</h2>
            
            {/* Interview Panel Requests */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                <FaUserTie className="text-blue-600" />
                면접관 요청
              </h3>
              {loading ? (
                <div className="text-gray-500">로딩 중...</div>
              ) : panelRequests.length === 0 ? (
                <div className="text-gray-500">대기 중인 면접관 요청이 없습니다.</div>
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
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium"
                          onClick={() => handlePanelResponse(req.request_id, 'ACCEPTED')}
                        >
                          수락
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium"
                          onClick={() => handlePanelResponse(req.request_id, 'REJECTED')}
                        >
                          거절
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Original Interview Requests */}
            <div>
              <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                <FaBuilding className="text-green-600" />
                기존 면접 요청
              </h3>
              {requests.length === 0 ? (
                <div className="text-gray-500">대기 중인 요청이 없습니다.</div>
              ) : (
                <ul className="space-y-4">
                  {requests.map(req => (
                    <li key={req.id} className="p-4 bg-yellow-50 dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-gray-700">
                      <div className="font-semibold mb-2 text-blue-700 dark:text-blue-300">{req.className}</div>
                      <ul>
                        {req.options.map(opt => (
                          <li key={opt.id} className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-2">
                              {opt.status === 'approved' && <FaCheckCircle className="text-green-500" />}
                              {opt.status === 'rejected' && <FaTimesCircle className="text-red-500" />}
                              {opt.date.toLocaleDateString()} {opt.time}
                              {opt.status === 'approved' && <span className="ml-2 text-green-600 font-bold">(승인)</span>}
                              {opt.status === 'rejected' && <span className="ml-2 text-red-500">(거절)</span>}
                            </span>
                            {opt.status === 'pending' && req.options.every(o => o.status !== 'approved') && (
                              <div className="space-x-2">
                                <button
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                                  onClick={() => handleApprove(req.id, opt.id)}
                                >O</button>
                                <button
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                                  onClick={() => handleReject(req.id, opt.id)}
                                >X</button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 