import winston from 'winston';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';

// Format for console (colorized + human readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
);

// Format for file (JSON for easy parsing)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

const logger = winston.createLogger({
    level: isProd ? 'info' : 'debug',
    transports: [
        // 1. Console Transport
        new winston.transports.Console({
            format: consoleFormat
        }),
        // 2. Error File Transport (Only log errors to this file)
        new winston.transports.File({ 
            filename: path.join('logs', 'error.log'), 
            level: 'error',
            format: fileFormat
        }),
        // 3. Combined File Transport (All logs)
        new winston.transports.File({ 
            filename: path.join('logs', 'combined.log'),
            format: fileFormat
        })
    ],
    // Handling Uncaught Exceptions & Rejections within Winston
    exceptionHandlers: [
        new winston.transports.File({ filename: path.join('logs', 'exceptions.log') })
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: path.join('logs', 'rejections.log') })
    ]
});

export default logger;
