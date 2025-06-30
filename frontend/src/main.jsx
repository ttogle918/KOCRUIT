import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';  // Tailwind 스타일을 실제로 적용
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
