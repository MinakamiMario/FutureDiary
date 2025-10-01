// src/services/errorLogger.js - Enhanced centralized error logging service

/**
 * Enhanced error logging service with performance monitoring and structured logging
 */
class ErrorLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Increased for better debugging
    this.validLevels = ['error', 'warn', 'info', 'debug'];
    this.logStats = {
      error: 0,
      warn: 0,
      info: 0,
      debug: 0
    };
    this.startTime = Date.now();
  }

  _sanitizeMessage(message) {
    if (typeof message !== 'string') {
      return String(message);
    }
    // Remove potentially sensitive information
    return message.replace(/(password|token|key|secret)=\S+/gi, '$1=***');
  }

  _sanitizeContext(context) {
    if (!context || typeof context !== 'object') {
      return {};
    }
    
    const sanitized = { ...context };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '***';
      }
    }
    
    return sanitized;
  }

  async log(level, message, error = null, context = {}) {
    // Validate level
    const validLevel = this.validLevels.includes(level) ? level : 'info';
    
    // Sanitize inputs
    const sanitizedMessage = this._sanitizeMessage(message);
    const sanitizedContext = this._sanitizeContext(context);
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: validLevel,
      message: sanitizedMessage,
      error: error ? {
        name: error.name || 'Unknown Error',
        message: this._sanitizeMessage(error.message || 'No error message'),
        stack: __DEV__ ? error.stack : undefined // Only include stack in development
      } : null,
      context: sanitizedContext
    };

    this.logs.unshift(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console logging for development
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const consoleMethod = console[validLevel] || console.log;
      consoleMethod(`[${validLevel.toUpperCase()}] ${sanitizedMessage}`, error || '', sanitizedContext);
    }
  }

  async error(message, error, context = {}) {
    return this.log('error', message, error, context);
  }

  async warn(message, error = null, context = {}) {
    return this.log('warn', message, error, context);
  }

  async info(message, context = {}) {
    return this.log('info', message, null, context);
  }

  async debug(message, context = {}) {
    return this.log('debug', message, null, context);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.logStats = {
      error: 0,
      warn: 0,
      info: 0,
      debug: 0
    };
  }
  
  // Generate unique log ID
  _generateLogId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Enhanced error processing
  _processError(error) {
    const processedError = {
      name: error.name || 'Unknown Error',
      message: this._sanitizeMessage(error.message || 'No error message'),
      code: error.code || null,
      stack: __DEV__ ? this._sanitizeStackTrace(error.stack) : undefined
    };
    
    // Add additional error properties if available
    if (error.validationErrors) {
      processedError.validation = error.validationErrors;
    }
    
    if (error.field) {
      processedError.field = error.field;
    }
    
    return processedError;
  }
  
  // Sanitize stack traces to remove sensitive paths
  _sanitizeStackTrace(stack) {
    if (!stack) return undefined;
    
    return stack
      .split('\n')
      .map(line => line.replace(/\/Users\/[^/]+/g, '/Users/***'))
      .map(line => line.replace(/\/home\/[^/]+/g, '/home/***'))
      .join('\n');
  }
  
  // Get performance metrics
  _getPerformanceMetrics() {
    const now = Date.now();
    return {
      timestamp: now,
      memory: this._getMemoryUsage(),
      uptime: now - this.startTime
    };
  }
  
  // Get memory usage (if available)
  _getMemoryUsage() {
    try {
      if (typeof performance !== 'undefined' && performance.memory) {
        return {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
      }
    } catch (e) {
      // Memory metrics not available
    }
    return null;
  }
  
  // Enhanced console logging
  _consoleLog(level, message, error, context) {
    const consoleMethod = console[level] || console.log;
    const prefix = `[${level.toUpperCase()}] ${new Date().toLocaleTimeString()}`;
    
    if (error) {
      consoleMethod(`${prefix} ${message}`, error, context);
    } else {
      consoleMethod(`${prefix} ${message}`, context);
    }
  }
  
  // Handle critical errors
  _handleCriticalError(logEntry) {
    // Count consecutive errors
    const recentErrors = this.logs
      .slice(0, 10)
      .filter(log => log.level === 'error');
      
    if (recentErrors.length >= 5) {
      console.warn('Multiple consecutive errors detected - possible system instability');
    }
  }
  
  // Get logging statistics
  getStats() {
    return {
      ...this.logStats,
      totalLogs: this.logs.length,
      oldestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
      newestLog: this.logs.length > 0 ? this.logs[0].timestamp : null,
      uptime: Date.now() - this.startTime
    };
  }
  
  // Get logs with filtering
  getFilteredLogs(level = null, limit = null) {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }
    
    return filteredLogs;
  }
}

// Singleton instance
const errorLogger = new ErrorLogger();
export default errorLogger;