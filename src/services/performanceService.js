// src/services/performanceService.js
import errorHandler from './errorLogger';

class PerformanceService {
  constructor() {
    this.metrics = {
      queries: [],
      services: [],
      memory: [],
      app: {
        startTime: Date.now(),
        initialized: false
      }
    };
    this.isMonitoring = false;
    this.slowQueryThreshold = 1000; // 1 second
    this.maxStoredMetrics = 100; // Keep last 100 measurements
  }

  // Initialize performance monitoring
  async initialize() {
    if (this.isMonitoring) return;
    
    try {
      this.isMonitoring = true;
      this.metrics.app.initialized = true;
      this.metrics.app.startTime = Date.now();
      
      // Start memory monitoring (every 30 seconds)
      this.startMemoryMonitoring();
      
      await errorHandler.info('Performance monitoring initialized', {
        startTime: this.metrics.app.startTime,
        monitoring: this.isMonitoring
      });
      
      return { success: true };
    } catch (error) {
      await errorHandler.error('Failed to initialize performance monitoring', error, 'performanceService');
      return { success: false, error };
    }
  }

  // Start memory usage monitoring
  startMemoryMonitoring() {
    if (this.memoryInterval) return;
    
    this.memoryInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, 30000); // Every 30 seconds
  }

  // Record current memory usage
  recordMemoryUsage() {
    try {
      const memoryInfo = {
        timestamp: Date.now(),
        jsHeapSize: performance.memory?.usedJSHeapSize || 0,
        totalHeapSize: performance.memory?.totalJSHeapSize || 0,
        heapLimit: performance.memory?.jsHeapSizeLimit || 0
      };
      
      this.addMetric('memory', memoryInfo);
      
      // Warn if memory usage is high (>80% of limit)
      if (memoryInfo.jsHeapSize > memoryInfo.heapLimit * 0.8) {
        errorHandler.warn('High memory usage detected', {
          usage: `${(memoryInfo.jsHeapSize / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(memoryInfo.heapLimit / 1024 / 1024).toFixed(2)}MB`,
          percentage: `${((memoryInfo.jsHeapSize / memoryInfo.heapLimit) * 100).toFixed(1)}%`
        }, 'performanceService');
      }
    } catch (error) {
      // Memory API might not be available in all environments
      if (__DEV__) console.debug('Memory monitoring not available:', error.message);
    }
  }

  // Track database query performance
  async trackQuery(queryName, queryFunction, params = []) {
    const startTime = performance.now();
    const timestamp = Date.now();
    
    try {
      const result = await queryFunction();
      const duration = performance.now() - startTime;
      
      const queryMetric = {
        name: queryName,
        duration: Math.round(duration),
        timestamp,
        params: params.length,
        success: true,
        resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0)
      };
      
      this.addMetric('queries', queryMetric);
      
      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        await errorHandler.warn('Slow database query detected', {
          query: queryName,
          duration: `${Math.round(duration)}ms`,
          threshold: `${this.slowQueryThreshold}ms`,
          params: params.length
        }, 'performanceService');
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      const queryMetric = {
        name: queryName,
        duration: Math.round(duration),
        timestamp,
        params: params.length,
        success: false,
        error: error.message
      };
      
      this.addMetric('queries', queryMetric);
      throw error; // Re-throw the error
    }
  }

  // Track service operation performance
  async trackService(serviceName, operation, serviceFunction) {
    const startTime = performance.now();
    const timestamp = Date.now();
    
    try {
      const result = await serviceFunction();
      const duration = performance.now() - startTime;
      
      const serviceMetric = {
        service: serviceName,
        operation,
        duration: Math.round(duration),
        timestamp,
        success: true
      };
      
      this.addMetric('services', serviceMetric);
      
      // Log slow service operations (>2 seconds)
      if (duration > 2000) {
        await errorHandler.warn('Slow service operation detected', {
          service: serviceName,
          operation,
          duration: `${Math.round(duration)}ms`
        }, 'performanceService');
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      const serviceMetric = {
        service: serviceName,
        operation,
        duration: Math.round(duration),
        timestamp,
        success: false,
        error: error.message
      };
      
      this.addMetric('services', serviceMetric);
      throw error;
    }
  }

  // Add metric to storage with size management
  addMetric(type, metric) {
    if (!this.metrics[type]) {
      this.metrics[type] = [];
    }
    
    this.metrics[type].push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics[type].length > this.maxStoredMetrics) {
      this.metrics[type] = this.metrics[type].slice(-this.maxStoredMetrics);
    }
  }

  // Get performance statistics
  getStats(timeRange = 300000) { // Default: last 5 minutes
    const now = Date.now();
    const since = now - timeRange;
    
    try {
      // Filter recent metrics
      const recentQueries = this.metrics.queries.filter(q => q.timestamp > since);
      const recentServices = this.metrics.services.filter(s => s.timestamp > since);
      const recentMemory = this.metrics.memory.filter(m => m.timestamp > since);
      
      // Calculate query statistics
      const queryStats = this.calculateQueryStats(recentQueries);
      const serviceStats = this.calculateServiceStats(recentServices);
      const memoryStats = this.calculateMemoryStats(recentMemory);
      
      return {
        timeRange: `${timeRange / 1000}s`,
        app: {
          uptime: now - this.metrics.app.startTime,
          initialized: this.metrics.app.initialized
        },
        queries: queryStats,
        services: serviceStats,
        memory: memoryStats,
        summary: {
          totalQueries: recentQueries.length,
          slowQueries: recentQueries.filter(q => q.duration > this.slowQueryThreshold).length,
          failedQueries: recentQueries.filter(q => !q.success).length,
          avgQueryTime: queryStats.avgDuration || 0,
          totalServices: recentServices.length,
          slowServices: recentServices.filter(s => s.duration > 2000).length,
          memoryUsage: memoryStats.current || 'N/A'
        }
      };
    } catch (error) {
      errorHandler.error('Error calculating performance stats', error, 'performanceService');
      return { error: error.message };
    }
  }

  // Calculate query performance statistics
  calculateQueryStats(queries) {
    if (queries.length === 0) {
      return { count: 0, avgDuration: 0, slowQueries: 0, failedQueries: 0 };
    }
    
    const totalDuration = queries.reduce((sum, q) => sum + q.duration, 0);
    const slowQueries = queries.filter(q => q.duration > this.slowQueryThreshold);
    const failedQueries = queries.filter(q => !q.success);
    
    // Group by query name
    const byName = queries.reduce((acc, query) => {
      if (!acc[query.name]) {
        acc[query.name] = { count: 0, totalDuration: 0, failures: 0 };
      }
      acc[query.name].count++;
      acc[query.name].totalDuration += query.duration;
      if (!query.success) acc[query.name].failures++;
      return acc;
    }, {});
    
    return {
      count: queries.length,
      avgDuration: Math.round(totalDuration / queries.length),
      slowQueries: slowQueries.length,
      failedQueries: failedQueries.length,
      byName: Object.entries(byName).map(([name, stats]) => ({
        name,
        count: stats.count,
        avgDuration: Math.round(stats.totalDuration / stats.count),
        failures: stats.failures
      })).sort((a, b) => b.avgDuration - a.avgDuration)
    };
  }

  // Calculate service performance statistics
  calculateServiceStats(services) {
    if (services.length === 0) {
      return { count: 0, avgDuration: 0, slowOperations: 0, failures: 0 };
    }
    
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const slowOperations = services.filter(s => s.duration > 2000);
    const failures = services.filter(s => !s.success);
    
    return {
      count: services.length,
      avgDuration: Math.round(totalDuration / services.length),
      slowOperations: slowOperations.length,
      failures: failures.length
    };
  }

  // Calculate memory statistics
  calculateMemoryStats(memoryData) {
    if (memoryData.length === 0) {
      return { current: null, trend: 'unknown' };
    }
    
    const latest = memoryData[memoryData.length - 1];
    const earliest = memoryData[0];
    
    const currentMB = Math.round(latest.jsHeapSize / 1024 / 1024);
    const limitMB = Math.round(latest.heapLimit / 1024 / 1024);
    const usagePercentage = Math.round((latest.jsHeapSize / latest.heapLimit) * 100);
    
    // Calculate trend
    let trend = 'stable';
    if (memoryData.length > 1) {
      const change = latest.jsHeapSize - earliest.jsHeapSize;
      const changePercentage = (change / earliest.jsHeapSize) * 100;
      
      if (changePercentage > 10) trend = 'increasing';
      else if (changePercentage < -10) trend = 'decreasing';
    }
    
    return {
      current: `${currentMB}MB (${usagePercentage}%)`,
      limit: `${limitMB}MB`,
      trend,
      usage: usagePercentage
    };
  }

  // Get simple dashboard metrics
  getDashboardMetrics() {
    const stats = this.getStats(600000); // Last 10 minutes
    
    return {
      uptime: this.formatUptime(stats.app?.uptime || 0),
      queries: {
        total: stats.summary?.totalQueries || 0,
        slow: stats.summary?.slowQueries || 0,
        avgTime: `${stats.summary?.avgQueryTime || 0}ms`
      },
      memory: stats.summary?.memoryUsage || 'N/A',
      status: this.getOverallStatus(stats)
    };
  }

  // Format uptime for display
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Get overall performance status
  getOverallStatus(stats) {
    const slowQueries = stats.summary?.slowQueries || 0;
    const failedQueries = stats.summary?.failedQueries || 0;
    const memoryUsage = stats.memory?.usage || 0;
    
    if (failedQueries > 0 || memoryUsage > 90) {
      return 'warning';
    } else if (slowQueries > 3 || memoryUsage > 80) {
      return 'caution';
    } else {
      return 'good';
    }
  }

  // Clean up resources
  cleanup() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    
    this.isMonitoring = false;
    
    const queries = this.metrics.queries || [];
    const services = this.metrics.services || [];
    
    errorHandler.info('Performance monitoring cleaned up', {
      uptime: Date.now() - this.metrics.app.startTime,
      totalQueries: queries.length,
      totalServices: services.length
    });
  }

  // Reset all metrics
  reset() {
    this.metrics = {
      queries: [],
      services: [],
      memory: [],
      app: {
        startTime: Date.now(),
        initialized: this.metrics.app.initialized
      }
    };
    
    errorHandler.info('Performance metrics reset', { timestamp: Date.now() });
  }
}

// Singleton instance
const performanceService = new PerformanceService();
export default performanceService;