// logger.js - Production-safe logging utility
class Logger {
  static log(...args) {
    if (__DEV__) {
      console.log(...args);
    }
  }

  static warn(...args) {
    if (__DEV__) {
      console.warn(...args);
    }
  }

  static info(...args) {
    if (__DEV__) {
      console.info(...args);
    }
  }

  static debug(...args) {
    if (__DEV__) {
      console.debug(...args);
    }
  }

  // Error logging always enabled for crash reporting
  static error(...args) {
    console.error(...args);
  }

  // Production-safe logging with sensitive data filtering
  static safeLog(message, data = null) {
    if (__DEV__) {
      if (data && typeof data === 'object') {
        // Filter sensitive keys
        const filtered = this.filterSensitiveData(data);
        console.log(message, filtered);
      } else {
        console.log(message, data);
      }
    }
  }

  static filterSensitiveData(obj) {
    const sensitiveKeys = [
      'password',
      'key',
      'token',
      'secret',
      'auth',
      'credential',
    ];
    const filtered = {...obj};

    Object.keys(filtered).forEach(key => {
      if (
        sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))
      ) {
        filtered[key] = '[FILTERED]';
      }
    });

    return filtered;
  }
}

export default Logger;
