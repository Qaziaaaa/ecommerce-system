import logger from '../utils/logger.js';

export const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // 1. Log the Error with Winston
    logger.error('💥 Error caught by Global Handler:', {
        status: err.status,
        message: err.message,
        path: req.originalUrl,
        method: req.method,
        stack: err.stack,
        body: req.method !== 'GET' ? req.body : undefined
    });

    // 2. Send Response
    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        // Production: Don't leak error details
        const message = err.isOperational ? err.message : 'Something went very wrong!';
        res.status(err.statusCode).json({
            status: err.status,
            message
        });
    }
};
