const API_CONFIG = {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
};

export default API_CONFIG; 