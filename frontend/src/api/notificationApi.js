import axios from './axiosInstance'; // JWT 포함된 Axios 인스턴스 사용

const BASE_URL = '/notifications';

// 캐시 방지 헤더
const noCacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export const fetchNotifications = () => axios.get(`${BASE_URL}/`, { headers: noCacheHeaders });
export const fetchUnreadNotifications = () => axios.get(`${BASE_URL}/unread`, { headers: noCacheHeaders });
export const fetchUnreadCount = () => axios.get(`${BASE_URL}/unread/count`, { headers: noCacheHeaders });
export const markNotificationAsRead = (id) => axios.put(`${BASE_URL}/${id}/read`);
export const markAllNotificationsAsRead = () => axios.put(`${BASE_URL}/read-all`);
export const markInterviewNotificationsAsRead = () => axios.put(`${BASE_URL}/read-interview`);
export const deleteNotification = (id) => axios.delete(`${BASE_URL}/${id}`);
export const deleteAllNotifications = () => axios.delete(`${BASE_URL}/all`);
