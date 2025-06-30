import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Layout from '../../layout/Layout';
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

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
    </Layout>
  );
} 