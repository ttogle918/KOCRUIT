import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { fetchNotifications } from '../api/notificationApi.js';

dayjs.extend(relativeTime);

export default function NotiBar({ initialNotifications = [] }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchNotifications();
        setNotifications(response.data || []);
        console.log('알림 데이터:', response.data);
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

  const handleNotificationClick = (noti) => {
    if (noti.type === 'RESUME_VIEWED' || noti.type === 'INTERVIEW_PANEL_REQUEST') {
      navigate('/memberschedule');
    } else {
      navigate('/');
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
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-3 w-64 space-y-2 border border-gray-200">
      {notifications.length === 0 ? (
        <div className="text-gray-400 text-sm text-center">알림이 없습니다</div>
      ) : (
        notifications.map((noti) => (
          <div
            key={noti.id}
            className={`text-sm truncate border-b pb-2 last:border-b-0 last:pb-0 cursor-pointer 
              ${noti.is_read ? 'text-gray-700' : 'text-blue-700 font-semibold'} 
              hover:underline`}
            style={{ maxWidth: '220px' }}
            onClick={() => handleNotificationClick(noti)}
          >
            <div>{noti.message}</div>
            <div className="text-xs text-gray-400 mt-1">{dayjs(noti.created_at).fromNow()}</div>
          </div>
        ))
      )}
    </div>
  );
}
