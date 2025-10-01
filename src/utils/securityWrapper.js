// securityWrapper.js - Security wrapper for input validation and sanitization

import AsyncStorage from '@react-native-async-storage/async-storage';
import validationService from './validationService';
import securityService from '../services/securityService';

/**
 * Security wrapper for all service methods
 */
class SecurityWrapper {
  /**
   * Wrap a service method with validation
   * @param {Function} method - Method to wrap
   * @param {Object} validators - Validation rules
   * @returns {Function} - Wrapped method
   */
  wrap(method, validators = {}) {
    return async (...args) => {
      try {
        // Validate arguments based on validators
        const validatedArgs = [];

        for (let i = 0; i < args.length; i++) {
          const validator = validators[i];
          if (validator) {
            const result = validator(args[i]);
            if (!result.valid) {
              throw new Error(
                `Validation failed for argument ${i}: ${result.errors.join(
                  ', ',
                )}`,
              );
            }
            validatedArgs.push(result.value);
          } else {
            validatedArgs.push(args[i]);
          }
        }

        // Execute original method with validated arguments
        return await method(...validatedArgs);
      } catch (error) {
        console.error('Security wrapper error:', error);
        throw error;
      }
    };
  }

  /**
   * Create validation rules for common data types
   */
  static getValidators() {
    return {
      // Activity validation
      activity: activity => validationService.validateActivity(activity),

      // Location validation
      location: location => {
        if (!location || typeof location !== 'object') {
          return {valid: false, errors: ['Location must be an object']};
        }

        const errors = [];
        let validLocation = {...location};

        if (
          location.latitude !== undefined &&
          location.longitude !== undefined
        ) {
          const coords = validationService.validateCoordinates(
            location.latitude,
            location.longitude,
          );
          if (!coords.valid) {
            errors.push(...coords.errors);
          } else {
            validLocation.latitude = coords.value.latitude;
            validLocation.longitude = coords.value.longitude;
          }
        }

        if (location.name) {
          const name = validationService.validateString(location.name, {
            maxLength: 200,
          });
          if (!name.valid) {
            errors.push(...name.errors);
          } else {
            validLocation.name = name.value;
          }
        }

        return {
          valid: errors.length === 0,
          value: validLocation,
          errors,
        };
      },

      // API key validation
      apiKey: apiKey => validationService.validateApiKey(apiKey),

      // Phone number validation
      phoneNumber: phoneNumber =>
        validationService.validatePhoneNumber(phoneNumber),

      // Email validation
      email: email => validationService.validateEmail(email),

      // Timestamp validation
      timestamp: timestamp => validationService.validateTimestamp(timestamp),

      // App usage validation
      appUsage: appUsage => validationService.validateAppUsage(appUsage),

      // Call data validation
      callData: call => {
        if (!call || typeof call !== 'object') {
          return {valid: false, errors: ['Call must be an object']};
        }

        const errors = [];
        let validCall = {...call};

        if (call.type) {
          const type = validationService.validateString(call.type, {
            pattern: /^(incoming|outgoing|missed)$/,
          });
          if (!type.valid) {
            errors.push('Call type must be incoming, outgoing, or missed');
          } else {
            validCall.type = type.value;
          }
        }

        if (call.timestamp) {
          const timestamp = validationService.validateTimestamp(call.timestamp);
          if (!timestamp.valid) {
            errors.push(...timestamp.errors);
          } else {
            validCall.timestamp = timestamp.value;
          }
        }

        if (call.duration !== undefined) {
          const duration = validationService.validateNumber(call.duration, {
            min: 0,
            max: 3600000, // 1 hour in milliseconds
            integer: true,
          });
          if (!duration.valid) {
            errors.push(...duration.errors);
          } else {
            validCall.duration = duration.value;
          }
        }

        return {
          valid: errors.length === 0,
          value: validCall,
          errors,
        };
      },
    };
  }

  /**
   * Rate limiting for API calls
   * @param {string} key - Rate limit key
   * @param {number} maxRequests - Maximum requests
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Promise<boolean>} - Whether request is allowed
   */
  async checkRateLimit(key, maxRequests = 100, windowMs = 3600000) {
    // 1 hour default
    try {
      const now = Date.now();
      const windowKey = `rate_limit_${key}_${Math.floor(now / windowMs)}`;

      const current = await AsyncStorage.getItem(windowKey);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        return false;
      }

      await AsyncStorage.setItem(windowKey, (count + 1).toString());

      // Set expiration (cleanup after 2 windows)
      setTimeout(async () => {
        await AsyncStorage.removeItem(windowKey);
      }, windowMs * 2);

      return true;
    } catch (error) {
      console.error('Rate limiting error:', error);
      return true; // Allow in case of error
    }
  }

  /**
   * Sanitize sensitive data
   * @param {Object} data - Data to sanitize
   * @param {Array} sensitiveFields - Fields to mask
   * @returns {Object} - Sanitized data
   */
  sanitizeSensitiveData(
    data,
    sensitiveFields = ['apiKey', 'password', 'token'],
  ) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = {...data};

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        const value = sanitized[field];
        if (typeof value === 'string' && value.length > 8) {
          sanitized[field] = `${value.substring(0, 4)}...${value.substring(
            value.length - 4,
          )}`;
        } else {
          sanitized[field] = '***';
        }
      }
    }

    return sanitized;
  }

  /**
   * Validate file upload
   * @param {Object} file - File object
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  validateFile(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = [
        'text/plain',
        'application/json',
        'image/jpeg',
        'image/png',
      ],
      allowedExtensions = ['.txt', '.json', '.jpg', '.jpeg', '.png'],
    } = options;

    const result = {
      valid: false,
      value: null,
      errors: [],
    };

    if (!file) {
      result.errors.push('File is required');
      return result;
    }

    if (file.size > maxSize) {
      result.errors.push(
        `File size must be less than ${maxSize / (1024 * 1024)}MB`,
      );
    }

    if (!allowedTypes.includes(file.type)) {
      result.errors.push(`File type ${file.type} is not allowed`);
    }

    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      result.errors.push(`File extension ${fileExtension} is not allowed`);
    }

    // Check for suspicious patterns in filename
    const suspiciousPatterns = [
      '../',
      '..\\',
      '<script',
      'javascript:',
      'data:',
    ];
    for (const pattern of suspiciousPatterns) {
      if (file.name.toLowerCase().includes(pattern)) {
        result.errors.push('Filename contains suspicious patterns');
        break;
      }
    }

    result.valid = result.errors.length === 0;
    if (result.valid) {
      result.value = file;
    }

    return result;
  }

  /**
   * Create secure hash for data integrity
   * @param {string} data - Data to hash
   * @returns {Promise<string>} - Hash string
   */
  async createHash(data) {
    if (!data) return '';

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify data integrity
   * @param {string} data - Original data
   * @param {string} hash - Expected hash
   * @returns {Promise<boolean>} - Whether data is intact
   */
  async verifyHash(data, hash) {
    if (!data || !hash) return false;

    const computedHash = await this.createHash(data);
    return computedHash === hash;
  }
}

export default new SecurityWrapper();
