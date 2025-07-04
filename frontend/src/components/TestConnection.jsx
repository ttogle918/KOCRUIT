import React, { useState, useEffect } from 'react';
import api from '../api/api';

const TestConnection = () => {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [mockStatus, setMockStatus] = useState('available');
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    testConnections();
  }, []);

  const testConnections = async () => {
    const results = [];

    // Test backend connection
    try {
      const response = await fetch('http://localhost:8000/api/v1/health', {
        method: 'GET',
        timeout: 3000
      });
      if (response.ok) {
        setBackendStatus('connected');
        results.push('✅ Backend: Connected');
      } else {
        setBackendStatus('error');
        results.push('❌ Backend: Error response');
      }
    } catch (error) {
      setBackendStatus('disconnected');
      results.push('❌ Backend: Disconnected');
    }

    // Test mock API
    try {
      const mockResponse = await api.get('/auth/me');
      setMockStatus('working');
      results.push('✅ Mock API: Working');
    } catch (error) {
      setMockStatus('error');
      results.push('❌ Mock API: Error');
    }

    setTestResults(results);
  };

  const testLogin = async () => {
    try {
      const response = await api.post('/auth/login', {
        email: 'admin@test.com',
        password: 'admin123'
      });
      alert('✅ Login test successful!');
    } catch (error) {
      alert('❌ Login test failed: ' + error.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Connection Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${
          backendStatus === 'connected' ? 'bg-green-50 border-green-200' :
          backendStatus === 'disconnected' ? 'bg-red-50 border-red-200' :
          'bg-yellow-50 border-yellow-200'
        }`}>
          <h3 className="font-semibold mb-2">Backend Status</h3>
          <p className={`text-sm ${
            backendStatus === 'connected' ? 'text-green-600' :
            backendStatus === 'disconnected' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {backendStatus === 'connected' ? '✅ Connected' :
             backendStatus === 'disconnected' ? '❌ Disconnected' :
             '⏳ Checking...'}
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${
          mockStatus === 'working' ? 'bg-green-50 border-green-200' :
          'bg-red-50 border-red-200'
        }`}>
          <h3 className="font-semibold mb-2">Mock API Status</h3>
          <p className={`text-sm ${
            mockStatus === 'working' ? 'text-green-600' : 'text-red-600'
          }`}>
            {mockStatus === 'working' ? '✅ Available' : '❌ Error'}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Test Results</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          {testResults.map((result, index) => (
            <div key={index} className="text-sm mb-1">{result}</div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={testConnections}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Connections
        </button>
        
        <button
          onClick={testLogin}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-2"
        >
          Test Login
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Test Accounts</h3>
        <div className="text-sm space-y-1">
          <div><strong>Admin:</strong> admin@test.com / admin123</div>
          <div><strong>User:</strong> user@test.com / user123</div>
          <div><strong>Company:</strong> company@test.com / company123</div>
        </div>
      </div>
    </div>
  );
};

export default TestConnection; 