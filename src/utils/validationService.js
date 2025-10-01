// validationService.js - Enhanced comprehensive input validation for MinakamiApp

import validator from 'validator';
import errorLogger from '../services/errorLogger';

/**
 * Enhanced validation service for comprehensive input sanitization and validation
 * Provides type-safe validation with performance monitoring and caching
 */
class ValidationService {
  constructor() {
    this.maxStringLength = 1000;
    this.maxArrayLength = 10000;
    this.validationCache = new Map();
    this.cacheMaxSize = 1000;
    this.validationStats = {
      totalValidations: 0,
      failedValidations: 0,
      cacheHits: 0
    };
    
    this.sanitizationOptions = {
      allowedTags: [],
      allowedAttributes: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script'],
    };
    
    // Pre-compiled regex patterns for better performance
    this.patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      apiKey: /^[a-zA-Z0-9_-]+$/,
      activityType: /^[a-zA-Z\s]+$/,
      phoneNumber: /^[\+]?[0-9\s\-\(\)]+$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      numeric: /^[0-9]+$/
    };
  }

  /**
   * Validate and sanitize string input
   * @param {string} input - Input string
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  validateString(input, options = {}) {
    const {
      minLength = 1,
      maxLength = this.maxStringLength,
      allowEmpty = false,
      pattern = null,
      sanitize = true,
    } = options;

    const result = {
      valid: false,
      value: null,
      errors: [],
    };

    if (input === null || input === undefined) {
      result.errors.push('Input is required');
      return result;
    }

    if (typeof input !== 'string') {
      result.errors.push('Input must be a string');
      return result;
    }

    if (!allowEmpty && input.trim().length === 0) {
      result.errors.push('Input cannot be empty');
      return result;
    }

    if (input.length < minLength) {
      result.errors.push(`Input must be at least ${minLength} characters`);
    }

    if (input.length > maxLength) {
      result.errors.push(`Input must be no more than ${maxLength} characters`);
    }

    if (pattern && !pattern.test(input)) {
      result.errors.push('Input format is invalid');
    }

    if (sanitize) {
      result.value = this.sanitizeString(input);
    } else {
      result.value = input;
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Sanitize string input
   * @param {string} input - Input string
   * @returns {string} - Sanitized string
   */
  sanitizeString(input) {
    if (typeof input !== 'string') return '';

    return validator.escape(input.trim());
  }

  /**
   * Validate email address
   * @param {string} email - Email address
   * @returns {Object} - Validation result
   */
  validateEmail(email) {
    const result = this.validateString(email, {
      minLength: 5,
      maxLength: 254,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    });

    if (result.valid) {
      result.valid = validator.isEmail(result.value);
      if (!result.valid) {
        result.errors.push('Invalid email format');
      }
    }

    return result;
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key
   * @returns {Object} - Validation result
   */
  validateApiKey(apiKey) {
    const result = this.validateString(apiKey, {
      minLength: 10,
      maxLength: 256,
      pattern: /^[a-zA-Z0-9_-]+$/,
    });

    if (result.valid) {
      // Check for common API key patterns
      const apiKeyPatterns = [
        /^sk-proj-[a-zA-Z0-9_-]{80,200}$/, // OpenAI Project keys (new format)
        /^sk-[a-zA-Z0-9]{48,100}$/, // OpenAI standard keys
        /^sk-[a-zA-Z0-9]{32}$/, // OpenAI alternate
        /^sk-ant-[a-zA-Z0-9_-]{95,120}$/, // Claude/Anthropic
        /^hf_[a-zA-Z0-9]{37}$/, // Hugging Face
        /^[a-zA-Z0-9]{32}$/, // Generic 32-char
        /^[a-zA-Z0-9]{40}$/, // Generic 40-char
        /^[a-zA-Z0-9]{64}$/, // Generic 64-char
      ];

      const matchesPattern = apiKeyPatterns.some(pattern =>
        pattern.test(result.value),
      );
      if (!matchesPattern) {
        result.errors.push('API key format appears invalid');
        result.valid = false;
      }
    }

    return result;
  }

  /**
   * Validate location coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Object} - Validation result
   */
  validateCoordinates(latitude, longitude) {
    const result = {
      valid: false,
      value: {latitude, longitude},
      errors: [],
    };

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      result.errors.push('Latitude and longitude must be numbers');
      return result;
    }

    if (lat < -90 || lat > 90) {
      result.errors.push('Latitude must be between -90 and 90');
    }

    if (lng < -180 || lng > 180) {
      result.errors.push('Longitude must be between -180 and 180');
    }

    result.valid = result.errors.length === 0;
    if (result.valid) {
      result.value = {latitude: lat, longitude: lng};
    }

    return result;
  }

  /**
   * Validate activity data
   * @param {Object} activity - Activity data
   * @returns {Object} - Validation result
   */
  validateActivity(activity) {
    const result = {
      valid: false,
      value: null,
      errors: [],
    };

    if (!activity || typeof activity !== 'object') {
      result.errors.push('Activity must be an object');
      return result;
    }

    // Validate required fields
    const requiredFields = ['type', 'timestamp'];
    for (const field of requiredFields) {
      if (!activity[field]) {
        result.errors.push(`Activity ${field} is required`);
      }
    }

    // Validate type
    if (activity.type) {
      const typeValidation = this.validateString(activity.type, {
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-Z\s]+$/,
      });
      if (!typeValidation.valid) {
        result.errors.push(
          `Invalid activity type: ${typeValidation.errors.join(', ')}`,
        );
      }
    }

    // Validate timestamp
    if (activity.timestamp) {
      const timestampValidation = this.validateTimestamp(activity.timestamp);
      if (!timestampValidation.valid) {
        result.errors.push(
          `Invalid timestamp: ${timestampValidation.errors.join(', ')}`,
        );
      }
    }

    // Validate steps (optional)
    if (activity.steps !== undefined) {
      const stepsValidation = this.validateNumber(activity.steps, {
        min: 0,
        max: 100000,
        integer: true,
      });
      if (!stepsValidation.valid) {
        result.errors.push(
          `Invalid steps: ${stepsValidation.errors.join(', ')}`,
        );
      }
    }

    // Validate duration (optional)
    if (activity.duration !== undefined) {
      const durationValidation = this.validateNumber(activity.duration, {
        min: 0,
        max: 86400000, // 24 hours in milliseconds
        integer: true,
      });
      if (!durationValidation.valid) {
        result.errors.push(
          `Invalid duration: ${durationValidation.errors.join(', ')}`,
        );
      }
    }

    result.valid = result.errors.length === 0;
    if (result.valid) {
      result.value = {
        type: this.sanitizeString(activity.type),
        timestamp: new Date(activity.timestamp).toISOString(),
        steps: activity.steps ? Math.floor(activity.steps) : null,
        duration: activity.duration ? Math.floor(activity.duration) : null,
        ...activity,
      };
    }

    return result;
  }

  /**
   * Validate number input
   * @param {number} input - Number input
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  validateNumber(input, options = {}) {
    const {min = null, max = null, integer = false} = options;

    const result = {
      valid: false,
      value: null,
      errors: [],
    };

    const num = parseFloat(input);

    if (isNaN(num)) {
      result.errors.push('Must be a valid number');
      return result;
    }

    if (integer && !Number.isInteger(num)) {
      result.errors.push('Must be an integer');
    }

    if (min !== null && num < min) {
      result.errors.push(`Must be at least ${min}`);
    }

    if (max !== null && num > max) {
      result.errors.push(`Must be no more than ${max}`);
    }

    result.valid = result.errors.length === 0;
    result.value = integer ? Math.floor(num) : num;

    return result;
  }

  /**
   * Validate timestamp
   * @param {string|number|Date} timestamp - Timestamp
   * @returns {Object} - Validation result
   */
  validateTimestamp(timestamp) {
    const result = {
      valid: false,
      value: null,
      errors: [],
    };

    let date;

    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      result.errors.push('Invalid timestamp format');
      return result;
    }

    if (isNaN(date.getTime())) {
      result.errors.push('Invalid date');
      return result;
    }

    // Check if date is reasonable (not too far in past/future)
    const now = new Date();
    const daysDiff = Math.abs((now - date) / (1000 * 60 * 60 * 24));

    if (daysDiff > 365) {
      result.errors.push('Date is too far from current time');
    }

    result.valid = result.errors.length === 0;
    result.value = date.toISOString();

    return result;
  }

  /**
   * Validate array input
   * @param {Array} input - Array input
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  validateArray(input, options = {}) {
    const {
      maxLength = this.maxArrayLength,
      itemValidator = null,
      allowEmpty = true,
    } = options;

    const result = {
      valid: false,
      value: null,
      errors: [],
    };

    if (!Array.isArray(input)) {
      result.errors.push('Input must be an array');
      return result;
    }

    if (!allowEmpty && input.length === 0) {
      result.errors.push('Array cannot be empty');
    }

    if (input.length > maxLength) {
      result.errors.push(`Array length must be no more than ${maxLength}`);
    }

    if (itemValidator && result.errors.length === 0) {
      const validatedItems = [];
      for (let i = 0; i < input.length; i++) {
        const itemResult = itemValidator(input[i]);
        if (!itemResult.valid) {
          result.errors.push(`Item ${i}: ${itemResult.errors.join(', ')}`);
        } else {
          validatedItems.push(itemResult.value);
        }
      }
      result.value = validatedItems;
    } else {
      result.value = input;
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate phone number
   * @param {string} phoneNumber - Phone number
   * @returns {Object} - Validation result
   */
  validatePhoneNumber(phoneNumber) {
    const result = this.validateString(phoneNumber, {
      minLength: 8,
      maxLength: 20,
      pattern: /^[\+]?[0-9\s\-\(\)]+$/,
    });

    if (result.valid) {
      // Remove all non-numeric characters except +
      const cleaned = result.value.replace(/[^\d+]/g, '');
      result.value = cleaned;
    }

    return result;
  }

  /**
   * Sanitize object recursively
   * @param {Object} obj - Object to sanitize
   * @returns {Object} - Sanitized object
   */
  sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Validate app usage data
   * @param {Object} appUsage - App usage data
   * @returns {Object} - Validation result
   */
  validateAppUsage(appUsage) {
    const result = {
      valid: false,
      value: null,
      errors: [],
    };

    if (!appUsage || typeof appUsage !== 'object') {
      result.errors.push('App usage must be an object');
      return result;
    }

    // Validate totalScreenTime
    if (appUsage.totalScreenTime !== undefined) {
      const screenTimeValidation = this.validateNumber(
        appUsage.totalScreenTime,
        {
          min: 0,
          max: 86400000, // 24 hours in milliseconds
        },
      );
      if (!screenTimeValidation.valid) {
        result.errors.push(
          `Invalid totalScreenTime: ${screenTimeValidation.errors.join(', ')}`,
        );
      }
    }

    // Validate appCount
    if (appUsage.appCount !== undefined) {
      const appCountValidation = this.validateNumber(appUsage.appCount, {
        min: 0,
        max: 1000,
        integer: true,
      });
      if (!appCountValidation.valid) {
        result.errors.push(
          `Invalid appCount: ${appCountValidation.errors.join(', ')}`,
        );
      }
    }

    // Validate topApps array
    if (appUsage.topApps) {
      const topAppsValidation = this.validateArray(appUsage.topApps, {
        maxLength: 50,
        itemValidator: app => this.validateAppInfo(app),
      });
      if (!topAppsValidation.valid) {
        result.errors.push(
          `Invalid topApps: ${topAppsValidation.errors.join(', ')}`,
        );
      }
    }

    result.valid = result.errors.length === 0;
    if (result.valid) {
      result.value = this.sanitizeObject(appUsage);
    }

    return result;
  }

  /**
   * Validate individual app information
   * @param {Object} appInfo - App information
   * @returns {Object} - Validation result
   */
  validateAppInfo(appInfo) {
    const result = {
      valid: false,
      value: null,
      errors: [],
    };

    if (!appInfo || typeof appInfo !== 'object') {
      result.errors.push('App info must be an object');
      return result;
    }

    // Validate appName
    if (appInfo.appName || appInfo.app_name) {
      const name = appInfo.appName || appInfo.app_name;
      const nameValidation = this.validateString(name, {
        minLength: 1,
        maxLength: 100,
      });
      if (!nameValidation.valid) {
        result.errors.push(
          `Invalid app name: ${nameValidation.errors.join(', ')}`,
        );
      }
    }

    // Validate totalTime
    if (appInfo.totalTime || appInfo.duration) {
      const time = appInfo.totalTime || appInfo.duration;
      const timeValidation = this.validateNumber(time, {
        min: 0,
        max: 86400000,
      });
      if (!timeValidation.valid) {
        result.errors.push(
          `Invalid totalTime: ${timeValidation.errors.join(', ')}`,
        );
      }
    }

    result.valid = result.errors.length === 0;
    if (result.valid) {
      result.value = {
        appName: this.sanitizeString(appInfo.appName || appInfo.app_name || ''),
        totalTime: appInfo.totalTime || appInfo.duration || 0,
        ...appInfo,
      };
    }

    return result;
  }
}

// Create and export singleton instance
const validationService = new ValidationService();

// Add performance monitoring if available
if (typeof global !== 'undefined' && global.performanceMonitor) {
  validationService.performanceMonitor = global.performanceMonitor;
}

export default validationService;
export { ValidationService };
