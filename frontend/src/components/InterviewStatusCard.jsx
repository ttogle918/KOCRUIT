import React, { useState } from 'react';
import { FaCalendarAlt, FaPlay, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import api from '../api/api';

const InterviewStatusCard = ({ applicant, onStatusChange }) => {
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(applicant?.interview_status || 'AI_INTERVIEW_NOT_SCHEDULED');

  // 면접 단계별 상태 매핑
  const getStatusConfig = (status) => {
    // AI 면접
    if (status?.includes('AI_INTERVIEW')) {
      return {
        AI_INTERVIEW_NOT_SCHEDULED: {
          label: 'AI 면접 미일정',
          icon: <FaClock className="text-gray-400" />,
          color: 'bg-gray-100 text-gray-600',
          nextStatus: 'AI_INTERVIEW_SCHEDULED'
        },
        AI_INTERVIEW_SCHEDULED: {
          label: 'AI 면접 일정 확정',
          icon: <FaCalendarAlt className="text-blue-500" />,
          color: 'bg-blue-100 text-blue-600',
          nextStatus: 'AI_INTERVIEW_IN_PROGRESS'
        },
        AI_INTERVIEW_IN_PROGRESS: {
          label: 'AI 면접 진행 중',
          icon: <FaPlay className="text-yellow-500" />,
          color: 'bg-yellow-100 text-yellow-600',
          nextStatus: 'AI_INTERVIEW_COMPLETED'
        },
        AI_INTERVIEW_COMPLETED: {
          label: 'AI 면접 완료',
          icon: <FaCheck className="text-green-500" />,
          color: 'bg-green-100 text-green-600',
          nextStatus: 'FIRST_INTERVIEW_NOT_SCHEDULED'
        },
        AI_INTERVIEW_CANCELLED: {
          label: 'AI 면접 취소',
          icon: <FaTimes className="text-red-500" />,
          color: 'bg-red-100 text-red-600',
          nextStatus: 'AI_INTERVIEW_SCHEDULED'
        }
      };
    }
    
    // 1차 면접
    if (status?.includes('FIRST_INTERVIEW')) {
      return {
        FIRST_INTERVIEW_NOT_SCHEDULED: {
          label: '1차 면접 미일정',
          icon: <FaClock className="text-gray-400" />,
          color: 'bg-gray-100 text-gray-600',
          nextStatus: 'FIRST_INTERVIEW_SCHEDULED'
        },
        FIRST_INTERVIEW_SCHEDULED: {
          label: '1차 면접 일정 확정',
          icon: <FaCalendarAlt className="text-blue-500" />,
          color: 'bg-blue-100 text-blue-600',
          nextStatus: 'FIRST_INTERVIEW_IN_PROGRESS'
        },
        FIRST_INTERVIEW_IN_PROGRESS: {
          label: '1차 면접 진행 중',
          icon: <FaPlay className="text-yellow-500" />,
          color: 'bg-yellow-100 text-yellow-600',
          nextStatus: 'FIRST_INTERVIEW_COMPLETED'
        },
        FIRST_INTERVIEW_COMPLETED: {
          label: '1차 면접 완료',
          icon: <FaCheck className="text-green-500" />,
          color: 'bg-green-100 text-green-600',
          nextStatus: 'SECOND_INTERVIEW_NOT_SCHEDULED'
        },
        FIRST_INTERVIEW_CANCELLED: {
          label: '1차 면접 취소',
          icon: <FaTimes className="text-red-500" />,
          color: 'bg-red-100 text-red-600',
          nextStatus: 'FIRST_INTERVIEW_SCHEDULED'
        }
      };
    }
    
    // 2차 면접
    if (status?.includes('SECOND_INTERVIEW')) {
      return {
        SECOND_INTERVIEW_NOT_SCHEDULED: {
          label: '2차 면접 미일정',
          icon: <FaClock className="text-gray-400" />,
          color: 'bg-gray-100 text-gray-600',
          nextStatus: 'SECOND_INTERVIEW_SCHEDULED'
        },
        SECOND_INTERVIEW_SCHEDULED: {
          label: '2차 면접 일정 확정',
          icon: <FaCalendarAlt className="text-blue-500" />,
          color: 'bg-blue-100 text-blue-600',
          nextStatus: 'SECOND_INTERVIEW_IN_PROGRESS'
        },
        SECOND_INTERVIEW_IN_PROGRESS: {
          label: '2차 면접 진행 중',
          icon: <FaPlay className="text-yellow-500" />,
          color: 'bg-yellow-100 text-yellow-600',
          nextStatus: 'SECOND_INTERVIEW_COMPLETED'
        },
        SECOND_INTERVIEW_COMPLETED: {
          label: '2차 면접 완료',
          icon: <FaCheck className="text-green-500" />,
          color: 'bg-green-100 text-green-600',
          nextStatus: 'FINAL_INTERVIEW_NOT_SCHEDULED'
        },
        SECOND_INTERVIEW_CANCELLED: {
          label: '2차 면접 취소',
          icon: <FaTimes className="text-red-500" />,
          color: 'bg-red-100 text-red-600',
          nextStatus: 'SECOND_INTERVIEW_SCHEDULED'
        }
      };
    }
    
    // 최종 면접
    if (status?.includes('FINAL_INTERVIEW')) {
      return {
        FINAL_INTERVIEW_NOT_SCHEDULED: {
          label: '최종 면접 미일정',
          icon: <FaClock className="text-gray-400" />,
          color: 'bg-gray-100 text-gray-600',
          nextStatus: 'FINAL_INTERVIEW_SCHEDULED'
        },
        FINAL_INTERVIEW_SCHEDULED: {
          label: '최종 면접 일정 확정',
          icon: <FaCalendarAlt className="text-blue-500" />,
          color: 'bg-blue-100 text-blue-600',
          nextStatus: 'FINAL_INTERVIEW_IN_PROGRESS'
        },
        FINAL_INTERVIEW_IN_PROGRESS: {
          label: '최종 면접 진행 중',
          icon: <FaPlay className="text-yellow-500" />,
          color: 'bg-yellow-100 text-yellow-600',
          nextStatus: 'FINAL_INTERVIEW_COMPLETED'
        },
        FINAL_INTERVIEW_COMPLETED: {
          label: '최종 면접 완료',
          icon: <FaCheck className="text-green-500" />,
          color: 'bg-green-100 text-green-600',
          nextStatus: null
        },
        FINAL_INTERVIEW_CANCELLED: {
          label: '최종 면접 취소',
          icon: <FaTimes className="text-red-500" />,
          color: 'bg-red-100 text-red-600',
          nextStatus: 'FINAL_INTERVIEW_SCHEDULED'
        }
      };
    }
    
    // 기본값 (AI 면접)
    return {
      AI_INTERVIEW_NOT_SCHEDULED: {
        label: 'AI 면접 미일정',
        icon: <FaClock className="text-gray-400" />,
        color: 'bg-gray-100 text-gray-600',
        nextStatus: 'AI_INTERVIEW_SCHEDULED'
      }
    };
  };

  const statusConfig = getStatusConfig(currentStatus);

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
        AI_INTERVIEW_SCHEDULED: 'AI 면접 일정이 확정되었습니다.',
        AI_INTERVIEW_IN_PROGRESS: 'AI 면접이 시작되었습니다.',
        AI_INTERVIEW_COMPLETED: 'AI 면접이 완료되었습니다.',
        AI_INTERVIEW_CANCELLED: 'AI 면접이 취소되었습니다.',
        FIRST_INTERVIEW_SCHEDULED: '1차 면접 일정이 확정되었습니다.',
        FIRST_INTERVIEW_IN_PROGRESS: '1차 면접이 시작되었습니다.',
        FIRST_INTERVIEW_COMPLETED: '1차 면접이 완료되었습니다.',
        FIRST_INTERVIEW_CANCELLED: '1차 면접이 취소되었습니다.',
        SECOND_INTERVIEW_SCHEDULED: '2차 면접 일정이 확정되었습니다.',
        SECOND_INTERVIEW_IN_PROGRESS: '2차 면접이 시작되었습니다.',
        SECOND_INTERVIEW_COMPLETED: '2차 면접이 완료되었습니다.',
        SECOND_INTERVIEW_CANCELLED: '2차 면접이 취소되었습니다.',
        FINAL_INTERVIEW_SCHEDULED: '최종 면접 일정이 확정되었습니다.',
        FINAL_INTERVIEW_IN_PROGRESS: '최종 면접이 시작되었습니다.',
        FINAL_INTERVIEW_COMPLETED: '최종 면접이 완료되었습니다.',
        FINAL_INTERVIEW_CANCELLED: '최종 면접이 취소되었습니다.'
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
          {currentStatus?.includes('NOT_SCHEDULED') && '면접 일정을 먼저 생성해주세요.'}
          {currentStatus?.includes('SCHEDULED') && '면접 일정이 확정되었습니다. 면접 시작 버튼을 눌러주세요.'}
          {currentStatus?.includes('IN_PROGRESS') && '면접이 진행 중입니다. 면접 완료 후 완료 버튼을 눌러주세요.'}
          {currentStatus?.includes('COMPLETED') && '면접이 완료되었습니다. 면접 평가를 진행해주세요.'}
          {currentStatus?.includes('CANCELLED') && '면접이 취소되었습니다. 필요시 일정을 재조정해주세요.'}
        </div>
      </div>
    </div>
  );
};

export default InterviewStatusCard; 