import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { fetchNotifications, markNotificationAsRead } from '../api/notificationApi.js';

dayjs.extend(relativeTime);

export default function NotiBar({ onNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAsRead, setMarkingAsRead] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchNotifications();
        const allNotifications = response.data || [];
        
        // Sort notifications: unread first, then by creation date (newest first)
        const sortedNotifications = allNotifications.sort((a, b) => {
          // First sort by read status (unread first)
          if (a.is_read !== b.is_read) {
            return a.is_read ? 1 : -1;
          }
          // Then sort by creation date (newest first)
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        setNotifications(sortedNotifications);
        console.log('알림 데이터:', sortedNotifications);
      } catch (error) {
        console.error('알림 가져오기 실패:', error.response?.status, error.response?.data || error.message);
        setError('알림을 불러오는데 실패했습니다.');
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    getNotifications();
  }, []);

  const handleNotificationClick = async (noti) => {
    try {
      // Mark notification as read
      if (!noti.is_read) {
        setMarkingAsRead(noti.id);
        await markNotificationAsRead(noti.id);
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === noti.id ? { ...n, is_read: true } : n
          )
        );
        
        // Notify parent component
        if (onNotificationClick) {
          onNotificationClick();
        }
      }
      
      // Navigate based on notification type
      if (noti.type === 'RESUME_VIEWED' || noti.type === 'INTERVIEW_PANEL_REQUEST') {
        navigate('/memberschedule');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      // Still navigate even if marking as read fails
      if (noti.type === 'RESUME_VIEWED' || noti.type === 'INTERVIEW_PANEL_REQUEST') {
        navigate('/memberschedule');
      } else {
        navigate('/');
      }
    } finally {
      setMarkingAsRead(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-3 w-64 space-y-2 border border-gray-200">
        <div className="text-gray-400 text-sm text-center">알림을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow p-3 w-64 space-y-2 border border-gray-200">
        <div className="text-red-500 text-sm text-center">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="w-full text-xs text-blue-600 hover:text-blue-700 py-1"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-3 w-64 border border-gray-200">
      {notifications.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-4">알림이 없습니다</div>
      ) : (
        <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="space-y-2">
            {notifications.map((noti, index) => {
              const isFirstRead = index > 0 && noti.is_read && !notifications[index - 1].is_read;
              return (
                <React.Fragment key={noti.id}>
                  {isFirstRead && (
                    <div className="text-xs text-gray-400 text-center py-1 border-t border-gray-200">
                      읽은 알림
                    </div>
                  )}
                  <div
                    className={`text-sm truncate border-b pb-2 last:border-b-0 last:pb-0 cursor-pointer transition-colors
                      ${noti.is_read 
                        ? 'text-gray-700 hover:text-gray-900' 
                        : 'text-blue-700 font-semibold hover:text-blue-900 bg-blue-50'
                      } 
                      hover:underline ${markingAsRead === noti.id ? 'opacity-50' : ''}`}
                    style={{ maxWidth: '220px' }}
                    onClick={() => handleNotificationClick(noti)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex-1">{noti.message}</span>
                      {markingAsRead === noti.id && (
                        <span className="text-xs text-gray-400 ml-2">처리중...</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{dayjs(noti.created_at).fromNow()}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {notifications.length > 3 && (
            <div className="text-xs text-gray-400 text-center mt-2 border-t pt-2">
              더 많은 알림이 있습니다 (스크롤하세요)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
