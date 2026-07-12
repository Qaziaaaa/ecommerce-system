import logger from '../utils/logger.js';

/**
 * Map known Mongoose/JWT/Stripe error types to structured AppErrors.
 * Requirements: 2.8 — structured error responses within 100ms
 */
const handleCastError = (err) => ({
  statusCode: 400,
  status: 'fail',
  message: process.env.NODE_ENV === 'production'
    ? 'Invalid resource identifier'
    : `Invalid ${err.path}: ${err.value}`,
  code: 'INVALID_ID',
});

const handleDuplicateFields = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field];
  return {
    statusCode: 409,
    status: 'fail',
    message: process.env.NODE_ENV === 'production'
      ? 'A resource with that value already exists'
      : `Duplicate value for ${field}: "${value}". Please use a different value.`,
    code: 'DUPLICATE_FIELD',
  };
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors || {}).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return {
    statusCode: 422,
    status: 'fail',
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    errors,
  };
};

const handleJWTError = () => ({
  statusCode: 401,
  status: 'fail',
  message: 'Invalid token. Please log in again.',
  code: 'INVALID_TOKEN',
});

const handleJWTExpiredError = () => ({
  statusCode: 401,
  status: 'fail',
  message: 'Your session has expired. Please log in again.',
  code: 'TOKEN_EXPIRED',
});

const handleMulterError = (err) => ({
  statusCode: 400,
  status: 'fail',
  message: err.message || 'File upload error',
  code: 'UPLOAD_ERROR',
});

/**
 * Build a standardized error response body.
 * Always includes: status, message, code, timestamp, requestId.
 */
const buildErrorResponse = (statusCode, status, message, code, extras = {}) => ({
  status,
  message,
  code: code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
  timestamp: new Date().toISOString(),
  requestId: extras.requestId || null,
  ...extras,
});

/**
 * Global error handling middleware.
 * Converts all errors to a consistent JSON structure.
 * Requirements: 2.8
 */
export const globalErrorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Something went wrong';
  let code = err.code || null;
  let extras = {};

  // ── Map known error types ──────────────────────────────────────────────────
  if (err.name === 'CastError') {
    ({ statusCode, status, message, code } = handleCastError(err));
  } else if (err.code === 11000) {
    ({ statusCode, status, message, code } = handleDuplicateFields(err));
  } else if (err.name === 'ValidationError') {
    const mapped = handleValidationError(err);
    statusCode = mapped.statusCode;
    status = mapped.status;
    message = mapped.message;
    code = mapped.code;
    extras = { errors: mapped.errors };
  } else if (err.name === 'JsonWebTokenError') {
    ({ statusCode, status, message, code } = handleJWTError());
  } else if (err.name === 'TokenExpiredError') {
    ({ statusCode, status, message, code } = handleJWTExpiredError());
  } else if (err.name === 'MulterError') {
    ({ statusCode, status, message, code } = handleMulterError(err));
  }

  // ── Attach requestId ───────────────────────────────────────────────────────
  extras.requestId = req.requestId;

  // ── Log ───────────────────────────────────────────────────────────────────
  const logData = {
    statusCode,
    status,
    message,
    requestId: req.requestId,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  if (statusCode >= 500) {
    logger.error(`💥 Error caught by Global Handler: ${message}`, { ...logData, stack: err.stack });
  } else {
    logger.warn('Client error', logData);
  }

  // ── Send response ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      ...buildErrorResponse(statusCode, status, message, code, extras),
      stack: err.stack,
    });
  }

  // Production: hide internal details for 5xx errors
  if (statusCode >= 500 && !err.isOperational) {
    return res.status(500).json(
      buildErrorResponse(500, 'error', 'Something went wrong. Please try again later.', 'INTERNAL_ERROR')
    );
  }

  return res.status(statusCode).json(
    buildErrorResponse(statusCode, status, message, code, extras)
  );
};
