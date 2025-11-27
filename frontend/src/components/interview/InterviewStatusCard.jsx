import React, { useState } from 'react';
import { FaCalendarAlt, FaPlay, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import api from '../../api/api';

const InterviewStatusCard = ({ applicant, onStatusChange }) => {
  const [updating, setUpdating] = useState(false);
  const [currentAiStatus, setCurrentAiStatus] = useState(applicant?.ai_interview_status || 'PENDING');
  const [currentFirstStatus, setCurrentFirstStatus] = useState(applicant?.practical_interview_status || 'PENDING');
  const [currentSecondStatus, setCurrentSecondStatus] = useState(applicant?.executive_interview_status || 'PENDING');

  // AI 면접 상태 매핑
  const getAiStatusConfig = (status) => {
    return {
      PENDING: {
        label: 'AI 면접 대기',
        icon: <FaClock className="text-gray-400" />,
        color: 'bg-gray-100 text-gray-600',
        nextStatus: 'SCHEDULED'
      },
      SCHEDULED: {
        label: 'AI 면접 일정 확정',
        icon: <FaCalendarAlt className="text-blue-500" />,
        color: 'bg-blue-100 text-blue-600',
        nextStatus: 'IN_PROGRESS'
      },
      IN_PROGRESS: {
        label: 'AI 면접 진행 중',
        icon: <FaPlay className="text-yellow-500" />,
        color: 'bg-yellow-100 text-yellow-600',
        nextStatus: 'COMPLETED'
      },
      COMPLETED: {
        label: 'AI 면접 완료',
        icon: <FaCheck className="text-green-500" />,
        color: 'bg-green-100 text-green-600',
        nextStatus: 'PASSED'
      },
      PASSED: {
        label: 'AI 면접 합격',
        icon: <FaCheck className="text-green-500" />,
        color: 'bg-green-200 text-green-700',
        nextStatus: null
      },
      FAILED: {
        label: 'AI 면접 불합격',
        icon: <FaTimes className="text-red-500" />,
        color: 'bg-red-100 text-red-600',
        nextStatus: null
      },
      CANCELLED: {
        label: 'AI 면접 취소',
        icon: <FaTimes className="text-red-500" />,
        color: 'bg-red-100 text-red-600',
        nextStatus: 'SCHEDULED'
      }
    };
  };

  // 1차 면접 상태 매핑
  const getFirstStatusConfig = (status) => {
    return {
      PENDING: {
        label: '1차 면접 대기',
        icon: <FaClock className="text-gray-400" />,
        color: 'bg-gray-100 text-gray-600',
        nextStatus: 'SCHEDULED'
      },
      SCHEDULED: {
        label: '1차 면접 일정 확정',
        icon: <FaCalendarAlt className="text-blue-500" />,
        color: 'bg-blue-100 text-blue-600',
        nextStatus: 'IN_PROGRESS'
      },
      IN_PROGRESS: {
        label: '1차 면접 진행 중',
        icon: <FaPlay className="text-yellow-500" />,
        color: 'bg-yellow-100 text-yellow-600',
        nextStatus: 'COMPLETED'
      },
      COMPLETED: {
        label: '1차 면접 완료',
        icon: <FaCheck className="text-green-500" />,
        color: 'bg-green-100 text-green-600',
        nextStatus: 'PASSED'
      },
      PASSED: {
        label: '1차 면접 합격',
        icon: <FaCheck className="text-green-500" />,
        color: 'bg-green-200 text-green-700',
        nextStatus: null
      },
      FAILED: {
        label: '1차 면접 불합격',
        icon: <FaTimes className="text-red-500" />,
        color: 'bg-red-100 text-red-600',
        nextStatus: null
      },
      CANCELLED: {
        label: '1차 면접 취소',
        icon: <FaTimes className="text-red-500" />,
        color: 'bg-red-100 text-red-600',
        nextStatus: 'SCHEDULED'
      }
    };
  };

  // 2차 면접 상태 매핑
  const getSecondStatusConfig = (status) => {
    return {
      PENDING: {
        label: '2차 면접 대기',
        icon: <FaClock className="text-gray-400" />,
        color: 'bg-gray-100 text-gray-600',
        nextStatus: 'SCHEDULED'
      },
      SCHEDULED: {
        label: '2차 면접 일정 확정',
        icon: <FaCalendarAlt className="text-blue-500" />,
        color: 'bg-blue-100 text-blue-600',
        nextStatus: 'IN_PROGRESS'
      },
      IN_PROGRESS: {
        label: '2차 면접 진행 중',
        icon: <FaPlay className="text-yellow-500" />,
        color: 'bg-yellow-100 text-yellow-600',
        nextStatus: 'COMPLETED'
      },
      COMPLETED: {
        label: '2차 면접 완료',
        icon: <FaCheck className="text-green-500" />,
        color: 'bg-green-100 text-green-600',
        nextStatus: 'PASSED'
      },
      PASSED: {
        label: '2차 면접 합격',
        icon: <FaCheck className="text-green-500" />,
        color: 'bg-green-200 text-green-700',
        nextStatus: null
      },
      FAILED: {
        label: '2차 면접 불합격',
        icon: <FaTimes className="text-red-500" />,
        color: 'bg-red-100 text-red-600',
        nextStatus: null
      },
      CANCELLED: {
        label: '2차 면접 취소',
        icon: <FaTimes className="text-red-500" />,
        color: 'bg-red-100 text-red-600',
        nextStatus: 'SCHEDULED'
      }
    };
  };

  const handleStatusUpdate = async (stage, newStatus) => {
    if (updating || !applicant?.application_id) return;
    
    setUpdating(true);
    try {
      const updateData = {};
      if (stage === 'ai') {
        updateData.ai_interview_status = newStatus;
        setCurrentAiStatus(newStatus);
      } else if (stage === 'first') {
        updateData.practical_interview_status = newStatus;
        setCurrentFirstStatus(newStatus);
      } else if (stage === 'second') {
        updateData.executive_interview_status = newStatus;
        setCurrentSecondStatus(newStatus);
      }
      
      const response = await api.put(`/applications/${applicant.application_id}/status`, updateData);
      
      if (onStatusChange) {
        onStatusChange(response.data);
      }
      
      // 상태별 알림 메시지
      const messages = {
        SCHEDULED: '면접 일정이 확정되었습니다.',
        IN_PROGRESS: '면접이 시작되었습니다.',
        COMPLETED: '면접이 완료되었습니다.',
        PASSED: '면접에 합격했습니다.',
        FAILED: '면접에 불합격했습니다.',
        CANCELLED: '면접이 취소되었습니다.'
      };
      
      if (messages[newStatus]) {
        alert(messages[newStatus]);
      }
    } catch (error) {
      console.error('면접 상태 업데이트 실패:', error);
      alert('면접 상태 업데이트에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const renderStatusCard = (stage, currentStatus, statusConfig, title) => {
    const config = statusConfig[currentStatus] || statusConfig.PENDING;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {config.icon}
            <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
        </div>
        
        {config.nextStatus && (
          <button
            onClick={() => handleStatusUpdate(stage, config.nextStatus)}
            disabled={updating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium py-2 px-3 rounded transition-colors"
          >
            {updating ? '업데이트 중...' : '다음 단계로'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        면접 진행 상황
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderStatusCard('ai', currentAiStatus, getAiStatusConfig(), 'AI 면접')}
        {renderStatusCard('first', currentFirstStatus, getFirstStatusConfig(), '1차 면접')}
        {renderStatusCard('second', currentSecondStatus, getSecondStatusConfig(), '2차 면접')}
      </div>
    </div>
  );
};

export default InterviewStatusCard; 