const API_CONFIG = {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v2',

    // baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v2',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false
};

export default API_CONFIG; 