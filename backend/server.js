import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';
import { validateEnv } from './config/env.js';
import logger from './utils/logger.js';
import dns from 'dns';

// 1. Load environment variables
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

// 4. Validate Environment Variables
validateEnv();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

/**
 * 🚀 SERVER STARTUP
 */
let server;

mongoose.connect(MONGO_URI, { family: 4 })
    .then(() => {
        logger.info('✅ MongoDB connected successfully');
        server = app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        logger.error('❌ MongoDB connection error:', { message: err.message });
        // Start server anyway for health checks/debugging
        server = app.listen(PORT, () => {
            logger.warn(`⚠️ Server running with DB ERROR on port ${PORT}`);
        });
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
