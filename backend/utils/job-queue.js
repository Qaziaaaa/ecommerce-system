import logger from './logger.js';

/**
 * Lightweight in-process job queue.
 * Prevents background tasks from blocking the main event loop by
 * scheduling them via setImmediate/setTimeout with concurrency control.
 *
 * Requirements: 8.8 — Property 35: Background Task Job Queue Usage
 */

export class JobQueue {
  /**
   * @param {string} name - Queue name for logging
   * @param {Object} options
   * @param {number} options.concurrency - Max concurrent jobs (default: 3)
   * @param {number} options.retries - Max retries per job (default: 2)
   * @param {number} options.retryDelay - Base retry delay in ms (default: 1000)
   */
  constructor(name, options = {}) {
    this.name = name;
    this.concurrency = options.concurrency ?? 3;
    this.maxRetries = options.retries ?? 2;
    this.retryDelay = options.retryDelay ?? 1000;

    this.queue = [];
    this.running = 0;
    this.stats = { enqueued: 0, completed: 0, failed: 0, retried: 0 };
  }

  /**
   * Add a job to the queue.
   * @param {Function} fn - Async function to execute
   * @param {Object} options
   * @param {string} options.name - Job name for logging
   * @param {number} options.priority - Higher = runs sooner (default: 0)
   * @returns {Promise<any>} Resolves when job completes
   */
  enqueue(fn, options = {}) {
    return new Promise((resolve, reject) => {
      const job = {
        fn,
        name: options.name || 'anonymous',
        priority: options.priority ?? 0,
        retries: 0,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      };

      // Insert by priority (higher priority first)
      const insertIndex = this.queue.findIndex((j) => j.priority < job.priority);
      if (insertIndex === -1) {
        this.queue.push(job);
      } else {
        this.queue.splice(insertIndex, 0, job);
      }

      this.stats.enqueued++;
      logger.debug('Job enqueued', { queue: this.name, job: job.name, queueLength: this.queue.length });

      // Schedule processing without blocking current execution
      setImmediate(() => this._process());
    });
  }

  /**
   * Process the next job(s) in the queue.
   */
  _process() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      this.running++;
      this._executeJob(job);
    }
  }

  /**
   * Execute a single job with retry logic.
   */
  async _executeJob(job) {
    const startTime = Date.now();

    try {
      const result = await job.fn();
      const duration = Date.now() - startTime;

      this.stats.completed++;
      logger.debug('Job completed', {
        queue: this.name,
        job: job.name,
        duration: `${duration}ms`,
        waitTime: `${startTime - job.enqueuedAt}ms`,
      });

      job.resolve(result);
    } catch (err) {
      if (job.retries < this.maxRetries) {
        job.retries++;
        this.stats.retried++;
        const delay = this.retryDelay * Math.pow(2, job.retries - 1);

        logger.warn('Job failed, retrying', {
          queue: this.name,
          job: job.name,
          attempt: job.retries,
          maxRetries: this.maxRetries,
          retryIn: `${delay}ms`,
          error: err.message,
        });

        // Re-queue with delay
        setTimeout(() => {
          this.queue.unshift(job); // Put back at front
          this._process();
        }, delay);
      } else {
        this.stats.failed++;
        logger.error('Job failed permanently', {
          queue: this.name,
          job: job.name,
          attempts: job.retries + 1,
          error: err.message,
        });
        job.reject(err);
      }
    } finally {
      this.running--;
      // Process next job
      setImmediate(() => this._process());
    }
  }

  /**
   * Get queue statistics.
   */
  getStats() {
    return {
      name: this.name,
      pending: this.queue.length,
      running: this.running,
      ...this.stats,
    };
  }

  /**
   * Wait for all currently queued jobs to complete.
   */
  drain() {
    if (this.queue.length === 0 && this.running === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (this.queue.length === 0 && this.running === 0) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }
}

// ─── Pre-configured queues for different task types ───────────────────────────

/**
 * Email queue — low concurrency to avoid rate limits
 */
export const emailQueue = new JobQueue('email', {
  concurrency: 2,
  retries: 3,
  retryDelay: 2000,
});

/**
 * Image processing queue — CPU-bound tasks
 */
export const imageQueue = new JobQueue('image-processing', {
  concurrency: 2,
  retries: 2,
  retryDelay: 1000,
});

/**
 * Analytics queue — fire-and-forget background tasks
 */
export const analyticsQueue = new JobQueue('analytics', {
  concurrency: 5,
  retries: 1,
  retryDelay: 500,
});

/**
 * Cache warming queue — background cache population
 */
export const cacheWarmQueue = new JobQueue('cache-warming', {
  concurrency: 3,
  retries: 2,
  retryDelay: 1000,
});

// Registry for monitoring
export const jobQueues = {
  email: emailQueue,
  image: imageQueue,
  analytics: analyticsQueue,
  cacheWarm: cacheWarmQueue,
};

export default JobQueue;
