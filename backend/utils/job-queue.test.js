import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn(() => mockLogger) };
vi.mock('./logger.js', () => ({ default: mockLogger, childLogger: vi.fn(() => mockLogger) }));

let JobQueue, queues;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('./job-queue.js');
  JobQueue = mod.JobQueue;
  queues = mod;
});

describe('JobQueue', () => {
  it('starts with empty queue', () => {
    const q = new JobQueue('test');
    const stats = q.getStats();
    expect(stats.pending).toBe(0);
    expect(stats.running).toBe(0);
  });

  it('enqueue processes a job and resolves', async () => {
    const q = new JobQueue('test', { concurrency: 1 });
    const fn = vi.fn().mockResolvedValue('done');
    const result = await q.enqueue(fn, { name: 'test-job' });
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalled();
    expect(q.stats.completed).toBe(1);
  });

  it('retries failed jobs up to maxRetries', async () => {
    vi.useFakeTimers();
    const q = new JobQueue('test', { concurrency: 1, retries: 2, retryDelay: 10 });
    const fn = vi.fn().mockRejectedValue(new Error('transient'));
    const promise = q.enqueue(fn, { name: 'fail-job' });

    // Process the retry delays
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(50);
    }

    await expect(promise).rejects.toThrow('transient');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(q.stats.failed).toBe(1);
    expect(q.stats.retried).toBe(2);
    vi.useRealTimers();
  });

  it('drain resolves when queue is empty', async () => {
    const q = new JobQueue('test', { concurrency: 1 });
    await expect(q.drain()).resolves.toBeUndefined();
  });

  it('getStats returns correct counters', async () => {
    const q = new JobQueue('test', { concurrency: 1 });
    const fn = vi.fn().mockResolvedValue('ok');
    await q.enqueue(fn);
    const stats = q.getStats();
    expect(stats.completed).toBe(1);
    expect(stats.enqueued).toBe(1);
  });

  it('processes jobs by priority (higher first)', async () => {
    const q = new JobQueue('test', { concurrency: 1 });
    const order = [];
    const makeJob = (name) => () => {
      order.push(name);
      return Promise.resolve();
    };
    const p1 = q.enqueue(makeJob('low'), { name: 'low', priority: 0 });
    const p2 = q.enqueue(makeJob('high'), { name: 'high', priority: 10 });
    await Promise.all([p1, p2]);
    expect(order[0]).toBe('high');
    expect(order[1]).toBe('low');
  });
});

describe('Pre-configured queues', () => {
  it('exports email, image, analytics, cacheWarm queues', () => {
    expect(queues.emailQueue.name).toBe('email');
    expect(queues.imageQueue.name).toBe('image-processing');
    expect(queues.analyticsQueue.name).toBe('analytics');
    expect(queues.cacheWarmQueue.name).toBe('cache-warming');
  });

  it('exports jobQueues registry', () => {
    expect(queues.jobQueues.email).toBe(queues.emailQueue);
    expect(queues.jobQueues.cacheWarm).toBe(queues.cacheWarmQueue);
  });
});
