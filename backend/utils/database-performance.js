import mongoose from 'mongoose';
import performanceService from '../services/performance.service.js';
import logger from './logger.js';

/**
 * Database performance tracking utility for MongoDB/Mongoose operations
 */
class DatabasePerformanceTracker {
  constructor() {
    this.setupMongooseMiddleware();
    this.setupConnectionMonitoring();
  }

  /**
   * Set up Mongoose middleware to track query performance
   */
  setupMongooseMiddleware() {
    // Pre-hook to start timing
    mongoose.plugin(function(schema) {
      schema.pre(/^find/, function() {
        this._startTime = Date.now();
        this._operation = this.op || 'find';
        this._collection = this.model?.collection?.name || 'unknown';
      });

      schema.pre('aggregate', function() {
        this._startTime = Date.now();
        this._operation = 'aggregate';
        this._collection = this.model?.collection?.name || 'unknown';
      });

      schema.pre('save', function() {
        this._startTime = Date.now();
        this._operation = 'save';
        this._collection = this.constructor.collection?.name || 'unknown';
      });

      schema.pre('updateOne', function() {
        this._startTime = Date.now();
        this._operation = 'updateOne';
        this._collection = this.model?.collection?.name || 'unknown';
      });

      schema.pre('updateMany', function() {
        this._startTime = Date.now();
        this._operation = 'updateMany';
        this._collection = this.model?.collection?.name || 'unknown';
      });

      schema.pre('deleteOne', function() {
        this._startTime = Date.now();
        this._operation = 'deleteOne';
        this._collection = this.model?.collection?.name || 'unknown';
      });

      schema.pre('deleteMany', function() {
        this._startTime = Date.now();
        this._operation = 'deleteMany';
        this._collection = this.model?.collection?.name || 'unknown';
      });

      // Post-hook to calculate and track performance
      schema.post(/^find/, function(result) {
        if (this._startTime) {
          const duration = Date.now() - this._startTime;
          const documentsReturned = Array.isArray(result) ? result.length : result ? 1 : 0;
          
          performanceService.trackDatabaseQueryTime(
            this._operation,
            this._collection,
            duration,
            0, // documentsExamined - not easily available in Mongoose
            documentsReturned,
            true // Assume index used - Mongoose typically uses indexes
          );
        }
      });

      schema.post('aggregate', function(result) {
        if (this._startTime) {
          const duration = Date.now() - this._startTime;
          const documentsReturned = Array.isArray(result) ? result.length : result ? 1 : 0;
          
          performanceService.trackDatabaseQueryTime(
            this._operation,
            this._collection,
            duration,
            0,
            documentsReturned,
            false // Aggregation may or may not use indexes efficiently
          );
        }
      });

      schema.post('save', function() {
        if (this._startTime) {
          const duration = Date.now() - this._startTime;
          
          performanceService.trackDatabaseQueryTime(
            this._operation,
            this._collection,
            duration,
            1,
            1,
            true
          );
        }
      });

      schema.post(['updateOne', 'updateMany', 'deleteOne', 'deleteMany'], function(result) {
        if (this._startTime) {
          const duration = Date.now() - this._startTime;
          const documentsAffected = result?.modifiedCount || result?.deletedCount || 0;
          
          performanceService.trackDatabaseQueryTime(
            this._operation,
            this._collection,
            duration,
            documentsAffected,
            documentsAffected,
            true
          );
        }
      });
    });
  }

  /**
   * Set up MongoDB connection monitoring
   */
  setupConnectionMonitoring() {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
      this.logPoolConfig();
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — will attempt reconnect');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Log pool metrics every 60 seconds (Requirements: 3.5, 7.4)
    setInterval(() => {
      this.logPoolMetrics();
    }, 60_000);
  }

  /**
   * Log connection pool configuration on startup
   */
  logPoolConfig() {
    const opts = mongoose.connection.options || {};
    logger.info('MongoDB connection pool configured', {
      minPoolSize: opts.minPoolSize ?? 5,
      maxPoolSize: opts.maxPoolSize ?? 20,
      socketTimeoutMS: opts.socketTimeoutMS,
      serverSelectionTimeoutMS: opts.serverSelectionTimeoutMS,
    });
  }

  /**
   * Log current connection pool metrics
   */
  logPoolMetrics() {
    try {
      const state = mongoose.connection.readyState;
      const stateNames = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
      logger.debug('MongoDB pool metrics', {
        connectionState: stateNames[state] || 'unknown',
        poolSize: mongoose.connection.pool?.totalConnectionCount ?? 'N/A',
        availableConnections: mongoose.connection.pool?.availableConnectionCount ?? 'N/A',
      });
    } catch {
      // Non-fatal — pool metrics may not be available in all driver versions
    }
  }

  /**
   * Manually track a database operation
   * @param {string} operation - Operation name
   * @param {string} collection - Collection name
   * @param {Function} operationFn - Function that performs the database operation
   * @returns {Promise} Result of the operation
   */
  async trackOperation(operation, collection, operationFn) {
    const startTime = Date.now();
    
    try {
      const result = await operationFn();
      const duration = Date.now() - startTime;
      
      const documentsReturned = Array.isArray(result) ? result.length : result ? 1 : 0;
      
      performanceService.trackDatabaseQueryTime(
        operation,
        collection,
        duration,
        0, // documentsExamined
        documentsReturned,
        true // Assume index used
      );
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track failed operation
      performanceService.trackDatabaseQueryTime(
        `${operation}_error`,
        collection,
        duration,
        0,
        0,
        false
      );
      
      throw error;
    }
  }

  /**
   * Get database performance statistics
   * @returns {Object} Database performance statistics
   */
  getPerformanceStats() {
    const performanceSummary = performanceService.getPerformanceSummary();
    const connectionState = mongoose.connection.readyState;
    
    const stateNames = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      connectionState: stateNames[connectionState] || 'unknown',
      databaseMetrics: performanceSummary.database,
      connectionPool: {
        // These would be available with more detailed MongoDB driver setup
        maxPoolSize: mongoose.connection.options?.maxPoolSize || 'unknown',
        minPoolSize: mongoose.connection.options?.minPoolSize || 'unknown',
      }
    };
  }

  /**
   * Create an index performance analyzer
   * @param {string} collection - Collection name
   * @returns {Object} Index analysis functions
   */
  createIndexAnalyzer(collection) {
    return {
      /**
       * Analyze query performance and suggest indexes
       * @param {Object} query - MongoDB query object
       * @param {Object} options - Query options
       */
      analyzeQuery: async (query, options = {}) => {
        const model = mongoose.model(collection);
        const startTime = Date.now();
        
        try {
          // Execute explain to get query execution stats
          const explanation = await model.find(query, null, options).explain('executionStats');
          const duration = Date.now() - startTime;
          
          const stats = explanation.executionStats;
          const indexUsed = stats.totalDocsExamined < stats.totalDocsExamined * 2; // Simple heuristic
          
          performanceService.trackDatabaseQueryTime(
            'analyze_query',
            collection,
            duration,
            stats.totalDocsExamined,
            stats.totalDocsReturned,
            indexUsed
          );
          
          return {
            duration,
            documentsExamined: stats.totalDocsExamined,
            documentsReturned: stats.totalDocsReturned,
            indexUsed,
            executionTimeMillis: stats.executionTimeMillis,
            suggestion: this.generateIndexSuggestion(query, stats)
          };
        } catch (error) {
          logger.error('Query analysis failed', { error: error.message, collection, query });
          throw error;
        }
      },

      /**
       * Generate index suggestions based on query and execution stats
       * @param {Object} query - MongoDB query object
       * @param {Object} stats - Execution statistics
       * @returns {string} Index suggestion
       */
      generateIndexSuggestion: (query, stats) => {
        if (stats.totalDocsExamined > stats.totalDocsReturned * 10) {
          const queryFields = Object.keys(query);
          if (queryFields.length > 0) {
            return `Consider creating an index on: ${queryFields.join(', ')}`;
          }
        }
        return 'Query performance is acceptable';
      }
    };
  }
}

// Create singleton instance
const dbPerformanceTracker = new DatabasePerformanceTracker();

export default dbPerformanceTracker;