import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

if (!API_URL) {
    throw new Error(
        'VITE_API_URL is not defined. Set it in your .env file (development) or in the Vercel dashboard (production).'
    );
}

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Required for HttpOnly cookies
    headers: {
        'Content-Type': 'application/json',
    },
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
});

// --- Request Queuing for Token Refresh ---
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Add a request interceptor to FORCE the CSRF header manually
axiosInstance.interceptors.request.use(
    async (config) => {
        // Skip CSRF for GET requests and csrf-token endpoint
        if (config.method === 'get' || config.url?.includes('/csrf-token')) {
            return config;
        }

        // Try to get token from localStorage first (cross-domain compatible)
        let token = localStorage.getItem('csrf-token');
        
        // If no token in localStorage, try to fetch one
        if (!token) {
            try {
                console.log('🔒 Fetching new CSRF token...');
                const response = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true });
                if (response.data?.token) {
                    token = response.data.token;
                    localStorage.setItem('csrf-token', token);
                    console.log('   → Token stored in localStorage:', token.substring(0, 8) + '...');
                }
            } catch (error) {
                console.warn('   → Failed to fetch CSRF token:', error);
            }
        }
        
        console.log('🔒 Axios interceptor:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 8) + '...' : 'NONE',
            isFormData: config.data instanceof FormData
        });
        
        // Add token if it exists
        if (token) {
            // For FormData uploads, don't override Content-Type
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }
            // Send token in both header and Authorization for maximum compatibility
            config.headers['X-XSRF-TOKEN'] = token;
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('   → Added CSRF headers');
        } else {
            console.warn('   → No CSRF token available!');
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle CSRF token missing — fetch token then retry once
        if (
            error.response?.status === 403 &&
            error.response?.data?.csrfRetry === true &&
            !originalRequest._csrfRetry
        ) {
            originalRequest._csrfRetry = true;
            try {
                await axiosInstance.get('/csrf-token');
                // Re-read the new cookie and set the header
                const token = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('XSRF-TOKEN='))
                    ?.split('=')[1];
                if (token) {
                    originalRequest.headers['X-XSRF-TOKEN'] = token;
                }
                return axiosInstance(originalRequest);
            } catch {
                return Promise.reject(error);
            }
        }

        // 1. If 401 Unauthorized and not previously retried
        // AND not the refresh request itself (prevents infinite deadlock loop)
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
            
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    // Mark as retry BEFORE retrying to prevent loops
                    originalRequest._retry = true;
                    return axiosInstance(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await axiosInstance.post('/auth/refresh');
                
                processQueue(null);
                isRefreshing = false;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;
                
                const { useAuthStore } = await import('../store/useAuthStore');
                useAuthStore.getState().logout();
                
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
