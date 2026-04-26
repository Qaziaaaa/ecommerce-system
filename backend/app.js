import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import routes from './routes/index.js';
import webhookRoutes from './routes/webhook.routes.js';
import { csrfProtection, setTokenCookie } from './middlewares/csrf.middleware.js';

const app = express();

// Trust Proxy (Essential for session/cookie security behind Render/Heroku)
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
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
    const existingToken = req.cookies['XSRF-TOKEN'];
    if (existingToken && /^[a-f0-9]{32,}$/i.test(existingToken)) {
        return res.json({ status: 'success', message: 'Token already present' });
    }
    setTokenCookie(res);
    res.json({ status: 'success' });
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
app.use(globalErrorHandler);

export default app;
