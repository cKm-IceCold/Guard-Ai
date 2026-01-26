import axios from 'axios';

// Centralized Axios instance for all API communication.
const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Gateway to the Django Backend
    headers: {
        'Content-Type': 'application/json',
    },
});

// REQUEST INTERCEPTOR: Automatically attaches the JWT Access Token to every outgoing request.
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR: Handles global API response behaviors and automated session recovery.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // SILENT TOKEN REFRESH: If we receive a 401 (Unauthorized) and haven't tried refreshing yet.
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                try {
                    // Attempt to exchange the Refresh Token for a new Access Token.
                    // We use the raw 'axios' package here to avoid a recursion loop with this 'api' instance.
                    const resp = await axios.post('http://localhost:8000/api/token/refresh/', {
                        refresh: refreshToken
                    });

                    const { access } = resp.data;
                    localStorage.setItem('access_token', access);

                    // Update the header of the original failed request and retry it immediately.
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // If the refresh token is also expired or invalid, we must force a logout.
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            } else {
                // No refresh token available, session is unrecoverable.
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
