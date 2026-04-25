import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import routes from './routes/index.js';
import webhookRoutes from './routes/webhook.routes.js';
import { csrfProtection } from './middlewares/csrf.middleware.js';

const app = express();

// Trust Proxy (Essential for session/cookie security behind Render/Heroku)
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-Token', 'X-XSRF-TOKEN']
}));

// Cookie Parser
app.use(cookieParser());

// Webhooks (Must be registered BEFORE express.json() for raw body access)
app.use('/api/v1/webhooks', webhookRoutes);

// Request Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 1. CSRF Bootstrap (MUST be before protection middleware)
app.get('/api/v1/csrf-token', (req, res) => {
    // If token already exists, don't rotate it (prevents React Double-Render bugs)
    const existingToken = req.cookies['XSRF-TOKEN'];
    if (existingToken && /^[a-f0-9]{32,}$/i.test(existingToken)) {
        return res.json({ status: 'success', message: 'Token already present' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', token, {
        httpOnly: false, // Required for Axios to read
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/'
    });

    res.json({ status: 'success' });
});

// 2. CSRF Protection (Applied to everything under /api/v1 AFTER bootstrap)
app.use('/api/v1', csrfProtection);

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
app.use(globalErrorHandler);

export default app;
