// src/utils/performanceMonitor.js - Performance monitoring utility

/**
 * Performance monitoring utility for tracking method execution times,
 * memory usage, and identifying performance bottlenecks
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      slow: 1000,    // 1 second
      warning: 500,  // 500ms
      memory: 50     // 50MB
    };
    this.isEnabled = __DEV__ || false;
  }

  /**
   * Start timing a specific operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} context - Additional context information
   */
  startTiming(operationId, context = {}) {
    if (!this.isEnabled) return;

    const metric = {
      startTime: Date.now(),
      startMemory: this._getMemoryUsage(),
      context,
      operationId
    };

    this.metrics.set(operationId, metric);
    
    if (__DEV__) {
      console.log(`🚀 Starting: ${operationId}`, context);
    }
  }

  /**
   * End timing and record results
   * @param {string} operationId - Operation identifier
   * @param {Object} additionalContext - Extra context to add
   */
  endTiming(operationId, additionalContext = {}) {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(operationId);
    if (!metric) {
      console.warn(`Performance metric not found: ${operationId}`);
      return;
    }

    const endTime = Date.now();
    const endMemory = this._getMemoryUsage();
    const duration = endTime - metric.startTime;
    const memoryDelta = endMemory ? endMemory.used - (metric.startMemory?.used || 0) : 0;

    const result = {
      operationId,
      duration,
      memoryDelta,
      startTime: metric.startTime,
      endTime,
      context: { ...metric.context, ...additionalContext }
    };

    // Log performance results
    this._logPerformanceResult(result);

    // Clean up
    this.metrics.delete(operationId);

    return result;
  }

  /**
   * Measure async function execution
   * @param {string} operationId - Operation identifier
   * @param {Function} asyncFn - Async function to measure
   * @param {Object} context - Context information
   */
  async measureAsync(operationId, asyncFn, context = {}) {
    if (!this.isEnabled) {
      return await asyncFn();
    }

    this.startTiming(operationId, context);
    
    try {
      const result = await asyncFn();
      this.endTiming(operationId, { success: true });
      return result;
    } catch (error) {
      this.endTiming(operationId, { 
        success: false, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Decorator for measuring method performance
   * @param {string} operationName - Name for the operation
   */
  measureMethod(operationName) {
    return (target, propertyKey, descriptor) => {
      if (!this.isEnabled) return descriptor;

      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        const operationId = `${target.constructor.name}.${propertyKey}_${Date.now()}`;
        const monitor = this.performanceMonitor || global.performanceMonitor;
        
        if (monitor) {
          return await monitor.measureAsync(
            operationId,
            () => originalMethod.apply(this, args),
            { 
              class: target.constructor.name,
              method: propertyKey,
              operationName 
            }
          );
        }
        
        return await originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }

  /**
   * Get current memory usage
   */
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

  /**
   * Log performance results with appropriate severity
   */
  _logPerformanceResult(result) {
    const { operationId, duration, memoryDelta, context } = result;
    
    let emoji = '✅';
    let level = 'log';
    
    if (duration > this.thresholds.slow) {
      emoji = '🐌';
      level = 'warn';
    } else if (duration > this.thresholds.warning) {
      emoji = '⚠️';
      level = 'warn';
    }
    
    if (memoryDelta > this.thresholds.memory) {
      emoji = '🧠';
      level = 'warn';
    }

    const message = `${emoji} ${operationId}: ${duration}ms`;
    const details = {
      duration: `${duration}ms`,
      memory: memoryDelta ? `${memoryDelta}MB` : 'N/A',
      context
    };

    if (__DEV__) {
      console[level](message, details);
    }

    // Store for reporting
    this._storeMetric(result);
  }

  /**
   * Store metric for later analysis
   */
  _storeMetric(result) {
    // In a real app, you might want to send this to analytics
    // For now, we'll just keep the last 100 metrics
    if (!this.storedMetrics) {
      this.storedMetrics = [];
    }
    
    this.storedMetrics.unshift(result);
    
    if (this.storedMetrics.length > 100) {
      this.storedMetrics = this.storedMetrics.slice(0, 100);
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    if (!this.storedMetrics || this.storedMetrics.length === 0) {
      return { message: 'No performance data available' };
    }

    const metrics = this.storedMetrics;
    const durations = metrics.map(m => m.duration);
    const memoryDeltas = metrics.map(m => m.memoryDelta).filter(m => m !== null);

    return {
      totalOperations: metrics.length,
      averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      slowestOperation: Math.max(...durations),
      fastestOperation: Math.min(...durations),
      averageMemoryDelta: memoryDeltas.length > 0 
        ? Math.round(memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length)
        : 0,
      slowOperations: metrics.filter(m => m.duration > this.thresholds.warning).length,
      memoryIntensiveOperations: metrics.filter(m => m.memoryDelta > this.thresholds.memory).length
    };
  }

  /**
   * Enable/disable performance monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics() {
    this.metrics.clear();
    this.storedMetrics = [];
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Make it globally available for decorators
if (typeof global !== 'undefined') {
  global.performanceMonitor = performanceMonitor;
}

export default performanceMonitor;