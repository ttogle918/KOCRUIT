import { useState, useEffect } from 'react';
import api from '../api/api';

function TestConnection() {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const testConnection = async () => {
        try {
            const response = await api.get('/test/hello');
            setMessage(response.data.message);
            setError('');
        } catch (err) {
            setError('Failed to connect to backend');
            setMessage('');
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Backend Connection Test</h2>
            <button 
                onClick={testConnection}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
                Test Connection
            </button>
            
            {message && (
                <div className="mt-4 p-4 bg-green-100 text-green-700 rounded">
                    {message}
                </div>
            )}
            
            {error && (
                <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}
        </div>
    );
}

export default TestConnection; 