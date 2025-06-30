import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Layout from '../../layout/Layout';
import { FaUser, FaPlus, FaCalendarAlt, FaPaperPlane } from 'react-icons/fa';

// Mock members and schedules
const members = [
  { id: 1, name: '홍길동' },
  { id: 2, name: '김철수' },
  { id: 3, name: '이영희' },
];

const initialRequests = { 1: [], 2: [], 3: [] };

export default function ManagerSchedule() {
  const [selectedMember, setSelectedMember] = useState(members[0].id);
  const [className, setClassName] = useState('');
  const [optionDate, setOptionDate] = useState(null);
  const [optionTime, setOptionTime] = useState('');
  const [options, setOptions] = useState([]); // [{date, time}]
  const [pendingRequests, setPendingRequests] = useState(initialRequests);

  // Add date/time option to current class
  const handleAddOption = () => {
    if (!optionDate || !optionTime) return;
    setOptions(prev => [...prev, { date: optionDate, time: optionTime }]);
    setOptionDate(null);
    setOptionTime('');
  };

  // Send interview class request
  const handleSendRequest = () => {
    if (!className || options.length === 0) return;
    setPendingRequests(prev => ({
      ...prev,
      [selectedMember]: [
        ...prev[selectedMember],
        { className, options: [...options], status: 'pending' },
      ],
    }));
    setClassName('');
    setOptions([]);
  };

  return (
    <Layout title="면접 일정 관리">
      <div className="min-h-screen bg-[#eef6ff] dark:bg-gray-900 flex justify-center items-start py-12 px-4">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
          <div className="mb-8 flex flex-col md:flex-row gap-6 md:gap-12">
            <div className="flex-1">
              <label className="block mb-2 font-semibold flex items-center gap-2"><FaUser />직원 선택</label>
              <select
                className="w-full p-2 border rounded mb-4"
                value={selectedMember}
                onChange={e => setSelectedMember(Number(e.target.value))}
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <label className="block mb-2 font-semibold flex items-center gap-2"><FaCalendarAlt />면접 클래스명</label>
              <input
                type="text"
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="border p-2 rounded w-full mb-2"
                placeholder="예: 보안SW 개발자 모집"
              />
              <label className="block mb-2 font-semibold flex items-center gap-2"><FaPlus />날짜/시간 옵션 추가</label>
              <div className="flex gap-2 mb-2">
                <DatePicker
                  selected={optionDate}
                  onChange={date => setOptionDate(date)}
                  dateFormat="yyyy-MM-dd"
                  className="border p-2 rounded w-1/2"
                  placeholderText="날짜 선택"
                />
                <input
                  type="time"
                  value={optionTime}
                  onChange={e => setOptionTime(e.target.value)}
                  className="border p-2 rounded w-1/2"
                />
                <button
                  className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded flex items-center"
                  onClick={handleAddOption}
                  type="button"
                  title="옵션 추가"
                ><FaPlus /></button>
              </div>
              <ul className="mb-2">
                {options.map((opt, idx) => (
                  <li key={idx} className="text-sm text-gray-700 mb-1">{opt.date?.toLocaleDateString()} {opt.time}</li>
                ))}
              </ul>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full flex items-center justify-center gap-2 mt-2"
                onClick={handleSendRequest}
                type="button"
              ><FaPaperPlane />요청 보내기</button>
            </div>
            <div className="flex-1">
              <h2 className="font-bold mb-4 text-lg">{members.find(m => m.id === selectedMember).name}의 대기 중인 면접 요청</h2>
              <ul>
                {(pendingRequests[selectedMember] || []).map((req, idx) => (
                  <li key={idx} className="mb-4 p-3 bg-yellow-50 dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-gray-700">
                    <div className="font-semibold mb-1 text-blue-700 dark:text-blue-300">{req.className}</div>
                    <ul className="ml-4 list-disc">
                      {req.options.map((opt, oidx) => (
                        <li key={oidx} className="text-gray-700 dark:text-gray-200">{opt.date?.toLocaleDateString()} {opt.time}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 