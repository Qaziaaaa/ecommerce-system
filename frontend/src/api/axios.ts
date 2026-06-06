import axios from 'axios';
import performanceMonitor from '../utils/performance';

declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: { startTime: number };
    _retry?: boolean;
    _retryCount?: number;
    _csrfRetry?: boolean;
  }
}

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

if (!API_URL) {
    throw new Error(
        'VITE_API_URL is not defined. Set it in your .env file (development) or in the Vercel dashboard (production).'
    );
}

// ─── Retry config ─────────────────────────────────────────────────────────────
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 300,
  maxDelay: 5000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

const getRetryDelay = (attempt: number): number => {
  const exp = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(exp + Math.random() * 100, RETRY_CONFIG.maxDelay);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Axios instance ───────────────────────────────────────────────────────────
const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
});

// ─── Token refresh queue ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: { resolve: (v: any) => void; reject: (e: any) => void }[] = [];

const processQueue = (error: any) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(null)));
    failedQueue = [];
};

// ─── CSRF token helper ────────────────────────────────────────────────────────
const getCsrfToken = async (): Promise<string | null> => {
    let token = localStorage.getItem('csrf-token');
    if (token) return token;

    try {
        const res = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true });
        if (res.data?.token) {
            localStorage.setItem('csrf-token', res.data.token);
            return res.data.token;
        }
    } catch {
        // Silent — CSRF fetch failure is non-fatal for GET requests
    }
    return null;
};

// ─── Request interceptor ──────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
    async (config) => {
        config.metadata = { startTime: performance.now() };

        // GET requests and csrf-token endpoint don't need CSRF header
        if (config.method === 'get' || config.url?.includes('/csrf-token')) {
            return config;
        }

        const token = await getCsrfToken();

        if (token) {
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }
            config.headers['X-XSRF-TOKEN'] = token;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response interceptor ─────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
    (response) => {
        const endTime = performance.now();
        const duration = endTime - (response.config.metadata?.startTime || endTime);
        performanceMonitor.trackInteraction(
            `api-${response.config.method?.toLowerCase() || 'unknown'}`,
            response.config.url || 'unknown',
            duration
        );
        return response;
    },
    async (error) => {
        const endTime = performance.now();
        const duration = endTime - (error.config?.metadata?.startTime || endTime);
        performanceMonitor.trackInteraction(
            'api-error',
            `${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${error.config?.url || 'unknown'}`,
            duration
        );

        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);

        // ── Exponential backoff retry for server errors ───────────────────
        const retryCount = originalRequest._retryCount || 0;
        const isRetryable =
            !originalRequest._retry &&
            retryCount < RETRY_CONFIG.maxRetries &&
            !originalRequest.url?.includes('/auth/') &&
            (!error.response || RETRY_CONFIG.retryableStatuses.includes(error.response.status));

        if (isRetryable) {
            originalRequest._retryCount = retryCount + 1;
            await sleep(getRetryDelay(retryCount));
            return axiosInstance(originalRequest);
        }

        // ── CSRF token refresh on 403 ─────────────────────────────────────
        if (
            error.response?.status === 403 &&
            error.response?.data?.csrfRetry === true &&
            !originalRequest._csrfRetry
        ) {
            originalRequest._csrfRetry = true;
            localStorage.removeItem('csrf-token'); // Force fresh token
            const newToken = await getCsrfToken();
            if (newToken) {
                originalRequest.headers['X-XSRF-TOKEN'] = newToken;
            }
            return axiosInstance(originalRequest);
        }

        // ── JWT refresh on 401 ────────────────────────────────────────────
        // Don't refresh for auth endpoints (login, signup, verify-otp, etc.)
        // — they're self-contained and don't need an existing token
        const isAuthEndpoint = originalRequest.url?.includes('/auth/');
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isAuthEndpoint
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    originalRequest._retry = true;
                    return axiosInstance(originalRequest);
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
                processQueue(refreshError);
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
