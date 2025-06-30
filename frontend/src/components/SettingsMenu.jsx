import React, { useState, useRef, useEffect } from 'react';
import { IoSettingsOutline } from 'react-icons/io5';

export default function SettingsMenu({ menuItems, icon = <IoSettingsOutline className="text-3xl text-gray-800 dark:text-gray-100" />, className = '' }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        className="mr-8 mt-16 text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition"
        title="설정"
        onClick={() => setOpen((prev) => !prev)}
      >
        {icon}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-24 bg-white dark:bg-gray-800 shadow-md rounded-md z-10">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => { setOpen(false); item.onClick(); }}
              className={`w-full text-left px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${item.color || ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper for default settings button
export function getDefaultSettingsButton({ onEdit, onDelete, isVisible }) {
  if (!isVisible) return null;
  const menuItems = [
    { label: '공고 수정', onClick: onEdit },
    { label: '공고 삭제', onClick: onDelete, color: 'text-red-500' }
  ];
  return <SettingsMenu menuItems={menuItems} />;
}