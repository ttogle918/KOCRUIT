import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import { useTheme } from '../context/ThemeContext';
import { IoIosMoon } from "react-icons/io";
import { IoSunny } from "react-icons/io5";
import { FaRegBell } from "react-icons/fa";
import { BsPersonCircle } from "react-icons/bs";
import NotiBar from './NotiBar';
import { fetchUnreadCount } from '../api/notificationApi';

function NavBar() {
  const { user, logout } = useAuth();
  const isGuest = !user || user.role === ROLES.GUEST;
  const isUser = user && user.role === ROLES.USER;
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const notiRef = useRef();

  // Fetch unread notifications count
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const fetchNotifications = async () => {
      if (!isGuest && user?.id) {
        try {
          setLoading(true);
          console.log(`🔔 알림 개수 조회 시작 - 사용자: ${user.email}, ID: ${user.id}`);
          
          const response = await fetchUnreadCount();
          const count = response.data?.count || 0;
          
          // 컴포넌트가 여전히 마운트되어 있는지 확인
          if (isMounted) {
            console.log(`🔔 알림 개수 조회 완료 - ${count}개`);
            setUnreadCount(count);
          }
        } catch (error) {
          console.error('Failed to fetch notification count:', error);
          if (isMounted) {
            setUnreadCount(0);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else {
        // 게스트이거나 사용자 정보가 없으면 알림 개수 0으로 설정
        if (isMounted) {
          setUnreadCount(0);
          setLoading(false);
        }
      }
    };

    // 즉시 실행
    fetchNotifications();
    
    // 30초마다 자동 새로고침 (사용자가 로그인한 경우에만)
    if (!isGuest && user?.id) {
      intervalId = setInterval(fetchNotifications, 30000);
    }
    
    // 윈도우 포커스 시 새로고침 (사용자가 로그인한 경우에만)
    const handleFocus = () => {
      if (!isGuest && user?.id) {
        fetchNotifications();
      }
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [isGuest, user?.id, user?.email]); // 사용자 ID나 email이 변경될 때마다 실행

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notiRef.current && !notiRef.current.contains(event.target)) {
        setNotiOpen(false);
      }
    }
    if (notiOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notiOpen]);

  const getHomePath = () => {
    if (isGuest || isUser) return '/';
    return '/corporatehome';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNotificationRead = () => {
    // Refresh the unread count when a notification is marked as read
    const refreshCount = async () => {
      try {
        const response = await fetchUnreadCount();
        setUnreadCount(response.data?.count || 0);
      } catch (error) {
        console.error('Failed to refresh notification count:', error);
      }
    };
    refreshCount();
  };

  const handleNotificationClick = () => {
    setNotiOpen((open) => !open);
    // 알림을 열 때는 자동 새로고침하지 않음 (NotiBar에서 처리됨)
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-gray-800 shadow-md">
      <div className="flex justify-between items-center h-16 w-full px-12">
        {/* Logo - Far Left */}
        <div className="flex items-center">
          <Link to={getHomePath()} className="text-blue-600 dark:text-blue-400 font-bold text-2xl">
            Kocruit
          </Link>
        </div>

        {/* Buttons - Far Right */}
        <div className="flex items-center space-x-6">
          {/* Dark Mode Button */}
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
            title="Toggle dark mode"
          >
            {isDarkMode ? (
              <span role="img" aria-label="Light mode"><IoSunny className="text-2xl" /></span>
            ) : (
              <span role="img" aria-label="Dark mode"><IoIosMoon className="text-2xl" /></span>
            )}
          </button>

          {/* Notification Icon Only */}
          {!isGuest && (
            <div className="relative" ref={notiRef}>
              <button
                className="relative focus:outline-none flex items-center"
                onClick={handleNotificationClick}
                aria-label="알림"
              >
                <span className="text-2xl flex items-center"><FaRegBell /></span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1 py-0.3">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {/* Only NotiBar as popup */}
              {notiOpen && (
                <div className="absolute right-0 mt-2 z-50">
                  <NotiBar onNotificationClick={handleNotificationRead} />
                </div>
              )}
            </div>
          )}

          {/* Show current user role */}
          {!isGuest && (
            <span className="text-xs text-gray-500 dark:text-gray-300 font-semibold">
              {user.role} {user.email === 'dev@test.com' ? '(개발자)' : ''}
            </span>
          )}

          {/* Profile Icon or Auth Buttons */}
          {isGuest ? (
            <div className="flex items-center space-x-4">
              <Link to="/signup" className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                Sign Up
              </Link>
              <Link to="/login" className="bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800 px-4 py-2 rounded-md text-sm font-medium">
                Login
              </Link>
            </div>
          ) : (
            <>
              <Link to="/mypage" className="flex items-center">
                <span className="text-2xl"><BsPersonCircle /></span>
              </Link>
              <button
                onClick={handleLogout}
                className="ml-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-medium"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
