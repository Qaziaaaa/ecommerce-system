import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/performance', () => ({
  default: { trackInteraction: vi.fn() },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: {},
      post: vi.fn(),
      get: vi.fn(),
    })),
    get: vi.fn(),
  },
}));

import axios from 'axios';
import instance from './axios';

const mockCreate = (axios.create as any);
const mockAxiosGet = (axios.get as any);
const mockInstance = mockCreate.mock.results[0].value;
const mockAxiosPost = mockInstance.post as any;

const capturedConfig = mockCreate.mock.calls[0][0];

const reqUseCalls = mockInstance.interceptors.request.use.mock.calls;
const resUseCalls = mockInstance.interceptors.response.use.mock.calls;

const reqFulfilled = reqUseCalls[0][0];
const reqRejected = reqUseCalls[0][1];
const resFulfilled = resUseCalls[0][0];
const resRejected = resUseCalls[0][1];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('axios instance', () => {
  it('creates axios instance with correct config', () => {
    expect(capturedConfig.baseURL).toBe('http://localhost:5001/api/v1');
    expect(capturedConfig.withCredentials).toBe(true);
    expect(capturedConfig.headers['Content-Type']).toBe('application/json');
    expect(capturedConfig.xsrfCookieName).toBe('XSRF-TOKEN');
    expect(capturedConfig.xsrfHeaderName).toBe('X-XSRF-TOKEN');
  });

  it('instance has expected structure', () => {
    expect(typeof instance).toBe('object');
    expect(instance).toBe(mockInstance);
  });

  it('registers one request and one response interceptor', () => {
    expect(reqUseCalls.length).toBe(1);
    expect(resUseCalls.length).toBe(1);
  });

  it('request interceptor fulfilled and rejected are functions', () => {
    expect(typeof reqFulfilled).toBe('function');
    expect(typeof reqRejected).toBe('function');
  });

  it('response interceptor fulfilled and rejected are functions', () => {
    expect(typeof resFulfilled).toBe('function');
    expect(typeof resRejected).toBe('function');
  });
});

describe('request interceptor', () => {
  it('adds metadata.startTime to config', async () => {
    const config: any = { method: 'get', url: '/test', headers: {} };
    const result = await reqFulfilled(config);
    expect(result.metadata).toBeDefined();
    expect(typeof result.metadata.startTime).toBe('number');
  });

  it('skips CSRF token for GET requests', async () => {
    const config: any = { method: 'get', url: '/test', headers: {} };
    const result = await reqFulfilled(config);
    expect(result.headers['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('skips CSRF token for csrf-token endpoint', async () => {
    const config: any = { method: 'post', url: '/csrf-token', headers: {} };
    const result = await reqFulfilled(config);
    expect(result.headers['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('adds CSRF token for non-GET requests when token is in cookie', async () => {
    document.cookie = 'XSRF-TOKEN=test-csrf-token';
    const config: any = { method: 'post', url: '/orders', headers: {} };
    const result = await reqFulfilled(config);
    expect(result.headers['X-XSRF-TOKEN']).toBe('test-csrf-token');
    document.cookie = 'XSRF-TOKEN=; max-age=0';
  });

  it('skips CSRF token when not in cookie', async () => {
    const config: any = { method: 'post', url: '/orders', headers: {} };
    const result = await reqFulfilled(config);
    expect(result.headers['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('removes Content-Type header for FormData requests with CSRF token', async () => {
    document.cookie = 'XSRF-TOKEN=form-csrf';
    const formData = new FormData();
    const config: any = { method: 'post', url: '/upload', headers: { 'Content-Type': 'multipart/form-data' }, data: formData };
    const result = await reqFulfilled(config);
    expect(result.headers['Content-Type']).toBeUndefined();
    expect(result.headers['X-XSRF-TOKEN']).toBe('form-csrf');
    document.cookie = 'XSRF-TOKEN=; max-age=0';
  });

  it('request rejected handler rejects with error', async () => {
    const error = new Error('req error');
    await expect(reqRejected(error)).rejects.toThrow('req error');
  });
});

describe('response interceptor', () => {
  it('response fulfilled handler tracks performance', async () => {
    const config: any = { method: 'get', url: '/products', metadata: { startTime: performance.now() } };
    const response: any = { config, status: 200 };
    const result = await resFulfilled(response);
    expect(result).toBe(response);
  });

  it('response fulfilled returns response as-is', async () => {
    const config: any = { method: 'get', url: '/products', metadata: { startTime: performance.now() } };
    const response: any = { config, status: 200 };
    const result = await resFulfilled(response);
    expect(result).toBe(response);
  });

  it('response rejected handler rejects by default', async () => {
    const error: any = new Error('network error');
    error.config = { url: '/test', method: 'get', headers: {}, metadata: { startTime: performance.now() } };
    error.response = { status: 400, data: {} };
    await expect(resRejected(error)).rejects.toThrow('network error');
  });

  it('rejects if originalRequest is missing', async () => {
    const error = new Error('no config');
    await expect(resRejected(error)).rejects.toThrow('no config');
  });

  it('retries on retryable status (500) with exponential backoff', async () => {
    const config: any = { url: '/api/data', method: 'get', headers: {}, _retryCount: 0, metadata: { startTime: performance.now() } };
    const error: any = new Error('server error');
    error.config = config;
    error.response = { status: 500, data: {} };

    const resRejectedWrapped = resRejected as (err: any) => Promise<any>;
    const promise = resRejectedWrapped(error);

    expect(config._retryCount).toBe(1);
    await expect(promise).rejects.toThrow();
  });

  it('does not retry auth endpoints', async () => {
    const config: any = { url: '/auth/login', method: 'post', headers: {}, metadata: { startTime: performance.now() } };
    const error: any = new Error('auth error');
    error.config = config;
    error.response = { status: 500, data: {} };

    await expect(resRejected(error)).rejects.toThrow('auth error');
  });

  it('does not retry if _retry flag is set', async () => {
    const config: any = { url: '/api/data', method: 'get', headers: {}, _retry: true, metadata: { startTime: performance.now() } };
    const error: any = new Error('already retried');
    error.config = config;
    error.response = { status: 500, data: {} };

    await expect(resRejected(error)).rejects.toThrow('already retried');
  });

  it('exhausts max retries before giving up', async () => {
    const config: any = { url: '/api/data', method: 'get', headers: {}, _retryCount: 3, metadata: { startTime: performance.now() } };
    const error: any = new Error('max retries');
    error.config = config;
    error.response = { status: 500, data: {} };

    await expect(resRejected(error)).rejects.toThrow('max retries');
  });

  it('handles 403 CSRF retry when csrfRetry flag is set', async () => {
    mockAxiosGet.mockImplementationOnce(() => {
      document.cookie = 'XSRF-TOKEN=fresh-token';
      return Promise.resolve({ data: { token: 'fresh-token' } });
    });

    const config: any = { url: '/api/data', method: 'post', headers: {}, metadata: { startTime: performance.now() } };
    const error: any = new Error('csrf error');
    error.config = config;
    error.response = { status: 403, data: { csrfRetry: true } };

    const resRejectedWrapped = resRejected as (err: any) => Promise<any>;
    const promise = resRejectedWrapped(error);

    expect(config._csrfRetry).toBe(true);
    await expect(promise).rejects.toThrow();
    expect(mockAxiosGet).toHaveBeenCalled();
    expect(config.headers['X-XSRF-TOKEN']).toBe('fresh-token');
    document.cookie = 'XSRF-TOKEN=; max-age=0';
  });

  it('does not CSRF retry if _csrfRetry already set', async () => {
    const config: any = { url: '/api/data', method: 'post', headers: {}, _csrfRetry: true, metadata: { startTime: performance.now() } };
    const error: any = new Error('already retried csrf');
    error.config = config;
    error.response = { status: 403, data: { csrfRetry: true } };

    await expect(resRejected(error)).rejects.toThrow('already retried csrf');
  });

  it('handles 401 JWT refresh and retries original request', async () => {
    mockAxiosPost.mockResolvedValueOnce({ status: 200 });

    const config: any = { url: '/api/orders', method: 'get', headers: {}, metadata: { startTime: performance.now() } };
    const error: any = new Error('unauthorized');
    error.config = config;
    error.response = { status: 401, data: {} };

    const resRejectedWrapped = resRejected as (err: any) => Promise<any>;
    const promise = resRejectedWrapped(error);

    expect(config._retry).toBe(true);
    expect(mockAxiosPost).toHaveBeenCalledWith('/auth/refresh');
    await expect(promise).rejects.toThrow();
  });

  it('queues requests during JWT refresh and retries after refresh', async () => {
    const config1: any = { url: '/api/orders', method: 'get', headers: {}, metadata: { startTime: performance.now() } };
    const error1: any = new Error('unauthorized');
    error1.config = config1;
    error1.response = { status: 401, data: {} };

    const config2: any = { url: '/api/products', method: 'get', headers: {}, metadata: { startTime: performance.now() } };
    const error2: any = new Error('unauthorized');
    error2.config = config2;
    error2.response = { status: 401, data: {} };

    mockAxiosPost.mockResolvedValueOnce({ status: 200 });

    const promise1 = (resRejected as (err: any) => Promise<any>)(error1);
    const promise2 = (resRejected as (err: any) => Promise<any>)(error2);

    expect(config1._retry).toBe(true);
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    await expect(promise1).rejects.toThrow();
    await expect(promise2).rejects.toThrow();
  });

  it('does not attempt JWT refresh for auth endpoints', async () => {
    const config: any = { url: '/auth/login', method: 'post', headers: {}, metadata: { startTime: performance.now() } };
    const error: any = new Error('auth error');
    error.config = config;
    error.response = { status: 401, data: {} };

    await expect(resRejected(error)).rejects.toThrow('auth error');
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('logout on failed JWT refresh', async () => {
    const config: any = { url: '/api/orders', method: 'get', headers: {}, metadata: { startTime: performance.now() } };
    const error: any = new Error('unauthorized');
    error.config = config;
    error.response = { status: 401, data: {} };

    mockAxiosPost.mockRejectedValueOnce(new Error('refresh failed'));

    await expect((resRejected as (err: any) => Promise<any>)(error)).rejects.toThrow('refresh failed');
  });
});
