import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';

// Load env vars
dotenv.config({ path: new URL('../.env', import.meta.url) });

// DNS Fix for Atlas SRV
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

// Initialize Models
import '../models/User.js';
import '../models/OTP.js';
import '../models/Category.js';
import '../models/Product.js';
import '../models/Order.js';
import '../models/AuditLog.js';

// Initialize Services
import '../utils/database-performance.js';
import performanceService from '../services/performance.service.js';
import alertingService from '../services/alerting.service.js';
import cacheService from '../services/cache.service.js';
import deploymentService from '../services/deployment.service.js';

// Validate env
import { validateEnv } from '../config/env.js';
validateEnv();

// Import the Express app
import app from '../app.js';

// ─── MongoDB Connection Cache ────────────────────────────────────────────────
// In serverless, module-level vars persist across warm invocations.
// We cache the connection promise so we only connect once.
let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  cachedConnection = mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    minPoolSize: 2,
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  });

  try {
    await cachedConnection;
    return cachedConnection;
  } catch (err) {
    cachedConnection = null;
    throw err;
  }
}

// ─── Warm Cache on First Invocation ──────────────────────────────────────────
let cacheWarmed = false;

async function warmCacheIfNeeded() {
  if (cacheWarmed) return;
  try {
    const Category = (await import('../models/Category.js')).default;
    const Product = (await import('../models/Product.js')).default;

    await cacheService.warmCache([
      {
        key: 'categories:all',
        loader: () => Category.find({ isActive: { $ne: false } }).lean(),
        ttl: 3600,
      },
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
    cacheWarmed = true;
  } catch {
    // Non-fatal
  }
}

// ─── Vercel Serverless Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  // Connect to DB if not already connected
  await connectToDatabase();
  await warmCacheIfNeeded();

  // Pass request to Express
  return app(req, res);
}

// Increase timeout for cold starts (Vercel Pro plan supports up to 300s)
export const config = {
  maxDuration: 30,
};
