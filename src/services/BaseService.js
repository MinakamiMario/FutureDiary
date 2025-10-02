import errorLogger from './errorLogger';
import { request, RESULTS } from 'react-native-permissions';

/**
 * Base service class providing common functionality for all services
 * Includes initialization, error handling, database operations, and validation
 */
class BaseService {
  constructor(serviceName) {
    if (!serviceName || typeof serviceName !== 'string') {
      throw new Error('Service name is required');
    }
    
    this.serviceName = serviceName;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.db = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async initialize() {
    // Return existing initialization promise if already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    if (this.isInitialized) {
      return true;
    }

    // Create initialization promise to prevent concurrent initializations
    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }
  
  async _performInitialization() {
    try {
      await this.onInitialize();
      this.isInitialized = true;
      this.retryCount = 0;
      await this.log(`${this.serviceName} initialized successfully`);
      return true;
    } catch (error) {
      this.retryCount++;
      await this.handleError(`Initialization failed (attempt ${this.retryCount}/${this.maxRetries})`, error);
      
      // Reset promise to allow retry
      this.initializationPromise = null;
      
      if (this.retryCount < this.maxRetries) {
        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.initialize();
      }
      
      return false;
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      return await this.initialize();
    }
    return true;
  }

  async handleError(message, error, context = {}) {
    const errorContext = {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      initialized: this.isInitialized,
      retryCount: this.retryCount,
      ...context
    };
    
    // Enhanced error logging with stack trace filtering
    const enhancedError = error instanceof Error ? error : new Error(String(error));
    await errorLogger.error(message, enhancedError, errorContext);
    
    // Call service-specific error handler if available
    if (typeof this.onError === 'function') {
      try {
        await this.onError(enhancedError, errorContext);
      } catch (handlerError) {
        await errorLogger.error('Error handler failed', handlerError, {
          service: this.serviceName,
          originalError: message
        });
      }
    }
  }

  async handleDatabaseOperation(operation, context = {}) {
    if (typeof operation !== 'function') {
      throw new Error('Database operation must be a function');
    }
    
    try {
      const initialized = await this.ensureInitialized();
      if (!initialized) {
        throw new Error('Failed to initialize service');
      }
      
      if (!this.db) {
        throw new Error('Database connection not available');
      }
      
      const startTime = Date.now();
      const result = await operation(this.db);
      const duration = Date.now() - startTime;
      
      // Log slow operations for performance monitoring
      if (duration > 1000) {
        await this.warn(`Slow database operation detected`, {
          operation: context.operation || 'unknown',
          duration: `${duration}ms`,
          ...context
        });
      }
      
      return result;
    } catch (error) {
      await this.handleError('Database operation failed', error, {
        operation: context.operation || 'unknown',
        hasDb: !!this.db,
        initialized: this.isInitialized,
        ...context
      });
      
      // Return appropriate fallback based on expected result type
      const expectedType = context.expectedType || 'null';
      switch (expectedType) {
        case 'array': return [];
        case 'object': return {};
        case 'number': return 0;
        case 'string': return '';
        case 'boolean': return false;
        default: return null;
      }
    }
  }

  async requestPermissions(permissions) {
    try {
      const results = {};
      
      for (const [permissionType, permission] of Object.entries(permissions)) {
        // Assume Android for simplicity (most common case for this app)
        try {
          const result = await request(permission);
          results[permissionType] = result === RESULTS.GRANTED;
        } catch (error) {
          // Fallback: grant permission if request fails
          results[permissionType] = true;
        }
      }
      
      return results;
    } catch (error) {
      await this.handleError('Permission request failed', error, { permissions });
      return {};
    }
  }

  validateInput(data, schema) {
    if (!schema || typeof schema !== 'object') {
      return true;
    }
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid input: data must be an object');
    }
    
    const errors = [];
    const warnings = [];
    
    // Check for required fields and type validation
    for (const [key, validation] of Object.entries(schema)) {
      const value = data[key];
      let expectedType, required = true, customValidator;
      
      // Support both simple string type and complex validation object
      if (typeof validation === 'string') {
        expectedType = validation;
      } else if (typeof validation === 'object') {
        expectedType = validation.type;
        required = validation.required !== false;
        customValidator = validation.validator;
      }
      
      // Check if required field is missing
      if (required && (value === undefined || value === null)) {
        errors.push(`Field '${key}' is required`);
        continue;
      }
      
      // Skip validation for optional missing fields
      if (!required && (value === undefined || value === null)) {
        continue;
      }
      
      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== expectedType) {
        errors.push(`Field '${key}' must be of type ${expectedType}, got ${actualType}`);
        continue;
      }
      
      // Additional built-in validations
      if (expectedType === 'string' && typeof value === 'string') {
        if (required && value.trim() === '') {
          errors.push(`Field '${key}' cannot be empty`);
        }
        if (value.length > 10000) {
          warnings.push(`Field '${key}' is very long (${value.length} characters)`);
        }
      }
      
      if (expectedType === 'number' && typeof value === 'number') {
        if (!isFinite(value)) {
          errors.push(`Field '${key}' must be a valid finite number`);
        }
      }
      
      if (expectedType === 'array' && Array.isArray(value)) {
        if (value.length > 1000) {
          warnings.push(`Field '${key}' has many items (${value.length})`);
        }
      }
      
      // Custom validator function
      if (typeof customValidator === 'function') {
        try {
          const customResult = customValidator(value, data);
          if (customResult !== true && typeof customResult === 'string') {
            errors.push(`Field '${key}': ${customResult}`);
          }
        } catch (validatorError) {
          errors.push(`Field '${key}' custom validation failed: ${validatorError.message}`);
        }
      }
    }
    
    // Log warnings for monitoring
    if (warnings.length > 0) {
      this.warn('Input validation warnings', { warnings, service: this.serviceName });
    }
    
    if (errors.length > 0) {
      const validationError = new Error(`Validation failed: ${errors.join(', ')}`);
      validationError.validationErrors = errors;
      validationError.field = 'validation';
      throw validationError;
    }
    
    return true;
  }

  async log(message, level = 'info', context = {}) {
    await errorLogger[level](message, {
      service: this.serviceName,
      ...context
    });
  }

  async info(message, data = null) {
    await this.log(message, 'info', data ? { data } : {});
  }

  async warn(message, data = null) {
    await this.log(message, 'warn', data ? { data } : {});
  }

  async error(message, error = null) {
    await this.log(message, 'error', error ? { error: error.message || error } : {});
  }

  async onInitialize() {
    throw new Error('onInitialize must be implemented by subclass');
  }

  async onError(error, context) {
    // Override in subclass if needed
  }
}

// Default export for compatibility
export default BaseService;
export { BaseService };