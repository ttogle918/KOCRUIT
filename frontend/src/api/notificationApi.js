import axios from './axiosInstance'; // JWT 포함된 Axios 인스턴스 사용

const BASE_URL = '/api/v1/notifications';

export const fetchNotifications = () => axios.get(`${BASE_URL}/`);
export const fetchUnreadNotifications = () => axios.get(`${BASE_URL}/unread`);
export const fetchUnreadCount = () => axios.get(`${BASE_URL}/unread/count`);
export const markNotificationAsRead = (id) => axios.put(`${BASE_URL}/${id}/read`);
export const markAllNotificationsAsRead = () => axios.put(`${BASE_URL}/read-all`);
export const markInterviewNotificationsAsRead = () => axios.put(`${BASE_URL}/read-interview`);
export const deleteNotification = (id) => axios.delete(`${BASE_URL}/${id}`);
export const deleteAllNotifications = () => axios.delete(`${BASE_URL}/all`);
