import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';
import { validateEnv } from './config/env.js';
import logger from './utils/logger.js';
import dns from 'dns';

// 1. Load environment variables FIRST — before anything else
dotenv.config();

// 2. DNS Fix: Force IPv4 & Use Stable DNS (Essential for Atlas SRV on some Windows setups)
dns.setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS for SRV Lookups
dns.setDefaultResultOrder('ipv4first');

// 3. Initialize Models
import './models/User.js';
import './models/OTP.js';
import './models/Category.js';
import './models/Product.js';
import './models/Order.js';
import './models/AuditLog.js';

// 4. Initialize Performance Monitoring
import './utils/database-performance.js';
import performanceService from './services/performance.service.js';
import alertingService from './services/alerting.service.js';
import cacheService from './services/cache.service.js';
import deploymentService from './services/deployment.service.js';

// 5. Validate Environment Variables — fail fast before attempting DB connection
validateEnv();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ─── DB reconnection with exponential backoff (Requirements: 5.4) ─────────────
const DB_RETRY_CONFIG = {
  maxRetries: 10,
  baseDelay: 1000,      // 1s
  maxDelay: 30_000,     // 30s cap
  multiplier: 2,
};

let dbRetryCount = 0;

const connectWithRetry = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      family: 4,
      minPoolSize: 5,
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
    });
    dbRetryCount = 0; // Reset on success
  } catch (err) {
    dbRetryCount++;
    if (dbRetryCount > DB_RETRY_CONFIG.maxRetries) {
      logger.error('❌ MongoDB max retries exceeded. Shutting down.', { message: err.message });
      process.exit(1);
    }
    const delay = Math.min(
      DB_RETRY_CONFIG.baseDelay * Math.pow(DB_RETRY_CONFIG.multiplier, dbRetryCount - 1),
      DB_RETRY_CONFIG.maxDelay
    );
    logger.warn(`MongoDB connection failed. Retry ${dbRetryCount}/${DB_RETRY_CONFIG.maxRetries} in ${delay}ms`, {
      message: err.message,
    });
    await new Promise((r) => setTimeout(r, delay));
    return connectWithRetry();
  }
};

// Re-connect on unexpected disconnection
mongoose.connection.on('disconnected', () => {
  if (dbRetryCount <= DB_RETRY_CONFIG.maxRetries) {
    logger.warn('MongoDB disconnected — attempting reconnect with backoff...');
    connectWithRetry().catch(() => {});
  }
});

/**
 * 🚀 SERVER STARTUP
 */
let server;

connectWithRetry()
    .then(async () => {
        logger.info('✅ MongoDB connected successfully');
        
        // Initialize performance monitoring after database connection
        logger.info('🔍 Performance monitoring initialized');

        // Warm cache with critical data (Requirements: 4.7)
        try {
          const Category = (await import('./models/Category.js')).default;
          const Product = (await import('./models/Product.js')).default;

          await cacheService.warmCache([
            {
              key: 'categories:all',
              loader: () => Category.find({ isActive: { $ne: false } }).lean(),
              ttl: 3600,
            },
            // Cache warming for the cache middleware key format: METHOD:/path:queryJSON
            // This matches the apiCache middleware's getCacheKey() exactly
            {
              key: 'GET:/products:{"limit":"8"}',
              loader: () => Product.find({ isActive: true }).sort('-createdAt').limit(8).populate('category', 'name slug').lean(),
              ttl: 300,
            },
            {
              key: 'GET:/products:{"limit":"12"}',
              loader: () => Product.find({ isActive: true }).sort('-createdAt').limit(12).populate('category', 'name slug').lean(),
              ttl: 300,
            },
          ]);
        } catch (err) {
          // Non-fatal — cache warming failure should not prevent startup
          logger.warn('Cache warming failed', { error: err.message });
        }
        
        server = app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info('📊 Performance metrics collection started');
        });
    })
    .catch((err) => {
        logger.error('❌ MongoDB initial connection failed.', { message: err.message });
        process.exit(1);
    });

/**
 * 🛡️ GRACEFUL SHUTDOWN LOGIC
 */
const shutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    if (server) {
        server.close(() => {
            logger.info('🛑 HTTP server closed.');
            mongoose.connection.close(false, () => {
                logger.info('📦 MongoDB connection closed.');
                process.exit(0);
            });
        });
    } else {
        process.exit(0);
    }
};

// Handle termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unexpected failures
process.on('unhandledRejection', (err) => {
    logger.error('💥 UNHANDLED REJECTION! Shutting down...', { 
        name: err.name, 
        message: err.message, 
        stack: err.stack 
    });
    shutdown('UNHANDLED REJECTION');
});

process.on('uncaughtException', (err) => {
    logger.error('💥 UNCAUGHT EXCEPTION! Shutting down...', { 
        name: err.name, 
        message: err.message, 
        stack: err.stack 
    });
    process.exit(1);
});
