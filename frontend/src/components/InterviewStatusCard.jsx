import React, { useState } from 'react';
import { FaCalendarAlt, FaPlay, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import api from '../api/api';

const InterviewStatusCard = ({ applicant, onStatusChange }) => {
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(applicant?.interview_status || 'NOT_SCHEDULED');

  const statusConfig = {
    NOT_SCHEDULED: {
      label: '면접 미일정',
      icon: <FaClock className="text-gray-400" />,
      color: 'bg-gray-100 text-gray-600',
      nextStatus: 'SCHEDULED'
    },
    SCHEDULED: {
      label: '면접 일정 확정',
      icon: <FaCalendarAlt className="text-blue-500" />,
      color: 'bg-blue-100 text-blue-600',
      nextStatus: 'IN_PROGRESS'
    },
    IN_PROGRESS: {
      label: '면접 진행 중',
      icon: <FaPlay className="text-yellow-500" />,
      color: 'bg-yellow-100 text-yellow-600',
      nextStatus: 'COMPLETED'
    },
    COMPLETED: {
      label: '면접 완료',
      icon: <FaCheck className="text-green-500" />,
      color: 'bg-green-100 text-green-600',
      nextStatus: null
    },
    CANCELLED: {
      label: '면접 취소',
      icon: <FaTimes className="text-red-500" />,
      color: 'bg-red-100 text-red-600',
      nextStatus: 'SCHEDULED'
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!applicant?.application_id) return;
    
    setUpdating(true);
    try {
      await api.put(`/schedules/${applicant.application_id}/interview-status`, {
        interview_status: newStatus
      });
      
      setCurrentStatus(newStatus);
      if (onStatusChange) onStatusChange(newStatus);
      
      // 상태별 알림 메시지
      const messages = {
        SCHEDULED: '면접 일정이 확정되었습니다.',
        IN_PROGRESS: '면접이 시작되었습니다.',
        COMPLETED: '면접이 완료되었습니다.',
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

  const getNextStatusButton = () => {
    const config = statusConfig[currentStatus];
    if (!config.nextStatus) return null;

    const nextConfig = statusConfig[config.nextStatus];
    return (
      <button
        onClick={() => handleStatusUpdate(config.nextStatus)}
        disabled={updating}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          updating 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {updating ? '처리 중...' : `${nextConfig.label}로 변경`}
      </button>
    );
  };

  const getStatusButtons = () => {
    const buttons = [];
    Object.keys(statusConfig).forEach(status => {
      if (status !== currentStatus) {
        const config = statusConfig[status];
        buttons.push(
          <button
            key={status}
            onClick={() => handleStatusUpdate(status)}
            disabled={updating}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              updating 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {config.label}
          </button>
        );
      }
    });
    return buttons;
  };

  if (applicant?.document_status !== 'PASSED') {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <FaClock />
          <span>서류 합격 후 면접 단계로 진행됩니다.</span>
        </div>
      </div>
    );
  }

  const config = statusConfig[currentStatus];

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">면접 상태</h3>
      
      {/* 현재 상태 표시 */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${config.color}`}>
          {config.icon}
        </div>
        <div>
          <div className="font-medium text-gray-800">{config.label}</div>
          <div className="text-sm text-gray-500">
            지원자: {applicant?.name || 'N/A'}
          </div>
        </div>
      </div>

      {/* 다음 단계 버튼 */}
      <div className="mb-4">
        {getNextStatusButton()}
      </div>

      {/* 모든 상태 변경 버튼 */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700">다른 상태로 변경:</div>
        <div className="flex flex-wrap gap-2">
          {getStatusButtons()}
        </div>
      </div>

      {/* 상태별 안내 메시지 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-700">
          {currentStatus === 'NOT_SCHEDULED' && '면접 일정을 먼저 생성해주세요.'}
          {currentStatus === 'SCHEDULED' && '면접 일정이 확정되었습니다. 면접 시작 버튼을 눌러주세요.'}
          {currentStatus === 'IN_PROGRESS' && '면접이 진행 중입니다. 면접 완료 후 완료 버튼을 눌러주세요.'}
          {currentStatus === 'COMPLETED' && '면접이 완료되었습니다. 면접 평가를 진행해주세요.'}
          {currentStatus === 'CANCELLED' && '면접이 취소되었습니다. 필요시 일정을 재조정해주세요.'}
        </div>
      </div>
    </div>
  );
};

export default InterviewStatusCard; 