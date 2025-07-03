import React, { useState, useRef, useEffect } from 'react';

const TimePicker = ({ 
  value, 
  onChange, 
  placeholder = "시간 선택", 
  className = "",
  error = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedMinute, setSelectedMinute] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const dropdownRef = useRef(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':');
      const hour = parseInt(hours);
      const minute = parseInt(minutes);
      
      if (hour >= 12) {
        setSelectedPeriod('PM');
        setSelectedHour(hour === 12 ? '12' : (hour - 12).toString().padStart(2, '0'));
      } else {
        setSelectedPeriod('AM');
        setSelectedHour(hour === 0 ? '12' : hour.toString().padStart(2, '0'));
      }
      setSelectedMinute(minute.toString().padStart(2, '0'));
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTimeSelect = (hour, minute, period) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedPeriod(period);
    
    // Convert to 24-hour format
    let hour24 = parseInt(hour);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${minute}`;
    onChange({ target: { value: timeString } });
    setIsOpen(false);
  };

  const displayValue = value || placeholder;
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full border px-2 py-1 rounded bg-white dark:bg-gray-800 
          text-gray-900 dark:text-white text-sm transition-colors
          flex items-center justify-between
          hover:border-gray-500 dark:hover:border-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}
          ${className}
        `}
      >
        <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {displayValue}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {/* Hours */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">시간</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleTimeSelect(hour, selectedMinute, selectedPeriod)}
                      className={`
                        w-full px-2 py-1 text-sm rounded text-left
                        hover:bg-blue-100 dark:hover:bg-blue-900
                        ${selectedHour === hour ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-white'}
                      `}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">분</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {minutes.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => handleTimeSelect(selectedHour, minute, selectedPeriod)}
                      className={`
                        w-full px-2 py-1 text-sm rounded text-left
                        hover:bg-blue-100 dark:hover:bg-blue-900
                        ${selectedMinute === minute ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-white'}
                      `}
                    >
                      {minute}
                    </button>
                  ))}
                </div>
              </div>

              {/* AM/PM */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">구분</div>
                <div className="space-y-1">
                  {['AM', 'PM'].map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => handleTimeSelect(selectedHour, selectedMinute, period)}
                      className={`
                        w-full px-2 py-1 text-sm rounded text-left
                        hover:bg-blue-100 dark:hover:bg-blue-900
                        ${selectedPeriod === period ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-white'}
                      `}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker; 