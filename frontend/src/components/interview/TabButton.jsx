import React from 'react';

const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
      active
        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
    }`}
  >
    {children}
  </button>
);

export default TabButton;
