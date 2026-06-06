import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import requestIdMiddleware from './middlewares/requestId.middleware.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import { 
  performanceMiddleware, 
  resourceMonitoringMiddleware, 
  healthCheckMiddleware,
  cacheHeadersMiddleware
} from './middlewares/performance.middleware.js';
import { errorRateMiddleware } from './middlewares/resilience.middleware.js';
import routes from './routes/index.js';
import webhookRoutes from './routes/webhook.routes.js';
import { csrfProtection, setTokenCookie } from './middlewares/csrf.middleware.js';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  });
}

const app = express();

// Trust Proxy (Essential for session/cookie security behind Render/Heroku)
app.set('trust proxy', 1);

// Response Compression — gzip for all compressible responses > 1KB (Requirements: 2.3)
app.use(compression({
  // Only compress responses above 1KB threshold
  threshold: 1024,
  // Compression level 6 — good balance of speed vs ratio
  level: 6,
  // Only compress these content types
  filter: (req, res) => {
    // Don't compress if client explicitly opts out
    if (req.headers['x-no-compression']) return false;
    // Use default compression filter for everything else
    return compression.filter(req, res);
  }
}));

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", 'https://js.stripe.com', 'https://m.stripe.network'],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://m.stripe.network'],
      upgradeInsecureRequests: [],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Don't leak the origin value in the error message in production
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-Token', 'X-XSRF-TOKEN']
}));

// Explicitly handle OPTIONS preflight so CORS headers are always present
app.options('*', cors());

// Cookie Parser
app.use(cookieParser());

// Webhooks (Must be registered BEFORE express.json() for raw body access)
app.use('/api/v1/webhooks', webhookRoutes);

// Request Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request ID Middleware (must be before all route handlers)
app.use(requestIdMiddleware);

// API Documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Nova E-Commerce API Docs',
  customfavIcon: '',
}));

// Redirect /api-docs to /api/v1/docs
app.get('/api-docs', (req, res) => res.redirect('/api/v1/docs'));

// Performance Monitoring Middleware
app.use(performanceMiddleware);
app.use(resourceMonitoringMiddleware);
app.use(healthCheckMiddleware);
// Error rate tracking for alerting (Requirements: 5.7)
app.use(errorRateMiddleware);

// 1. CSRF Bootstrap (MUST be before protection middleware)
app.get('/api/v1/csrf-token', (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    res.json({ 
        status: 'success', 
        token: token,
        message: 'CSRF token generated'
    });
});

// 2. CSRF Protection (Applied to all routes EXCEPT auth — auth is protected by OTP + JWT)
app.use('/api/v1', (req, res, next) => {
    // Skip CSRF for auth endpoints — they use OTP + JWT, not session cookies
    if (req.path.startsWith('/auth/')) return next();
    return csrfProtection(req, res, next);
});

// Route logging and analytics

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.get('/', (req, res) => res.status(200).send('Nova E-Commerce API is running!'));
app.get('/api/v1/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/v1', routes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.all('*', (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = 'fail';
  err.statusCode = 404;
  next(err);
});

// Global Error Middleware
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(globalErrorHandler);

export default app;
