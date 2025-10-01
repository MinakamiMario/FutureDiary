// src/utils/serviceRegistry.js - Centralized service registry and dependency injection

import errorLogger from '../services/errorLogger';
import performanceMonitor from './performanceMonitor';

/**
 * Service registry for managing service lifecycle, dependency injection,
 * and preventing circular dependencies
 */
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.initializing = new Set();
    this.dependencies = new Map();
    this.initOrder = [];
  }

  /**
   * Register a service with optional dependencies
   * @param {string} name - Service name
   * @param {Function} serviceClass - Service constructor
   * @param {Array} dependencies - Array of dependency service names
   * @param {Object} options - Registration options
   */
  register(name, serviceClass, dependencies = [], options = {}) {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    const serviceInfo = {
      name,
      serviceClass,
      dependencies,
      instance: null,
      initialized: false,
      singleton: options.singleton !== false, // Default to singleton
      lazy: options.lazy === true,
      config: options.config || {}
    };

    this.services.set(name, serviceInfo);
    this.dependencies.set(name, dependencies);

    if (!serviceInfo.lazy) {
      this._addToInitOrder(name);
    }

    errorLogger.info(`Service registered: ${name}`, {
      dependencies,
      singleton: serviceInfo.singleton,
      lazy: serviceInfo.lazy
    });
  }

  /**
   * Get a service instance (lazy loading)
   * @param {string} name - Service name
   * @returns {Promise<Object>} Service instance
   */
  async get(name) {
    const serviceInfo = this.services.get(name);
    if (!serviceInfo) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Return existing singleton instance
    if (serviceInfo.singleton && serviceInfo.instance) {
      return serviceInfo.instance;
    }

    // Prevent circular initialization
    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected while initializing '${name}'`);
    }

    return await this._initializeService(name);
  }

  /**
   * Initialize a specific service
   * @param {string} name - Service name
   * @returns {Promise<Object>} Service instance
   */
  async _initializeService(name) {
    const serviceInfo = this.services.get(name);
    if (!serviceInfo) {
      throw new Error(`Service '${name}' not found`);
    }

    if (serviceInfo.initialized && serviceInfo.singleton) {
      return serviceInfo.instance;
    }

    this.initializing.add(name);

    try {
      // Initialize dependencies first
      const dependencyInstances = {};
      for (const depName of serviceInfo.dependencies) {
        dependencyInstances[depName] = await this.get(depName);
      }

      // Create service instance
      const operationId = `service_init_${name}`;
      const instance = await performanceMonitor.measureAsync(
        operationId,
        async () => {
          const ServiceClass = serviceInfo.serviceClass;
          const serviceInstance = new ServiceClass(serviceInfo.config);
          
          // Inject dependencies
          this._injectDependencies(serviceInstance, dependencyInstances);
          
          // Initialize if it has an initialize method
          if (typeof serviceInstance.initialize === 'function') {
            await serviceInstance.initialize();
          }
          
          return serviceInstance;
        },
        { serviceName: name, dependencies: serviceInfo.dependencies }
      );

      // Store instance for singletons
      if (serviceInfo.singleton) {
        serviceInfo.instance = instance;
        serviceInfo.initialized = true;
      }

      this.initializing.delete(name);
      
      errorLogger.info(`Service initialized: ${name}`);
      return instance;

    } catch (error) {
      this.initializing.delete(name);
      errorLogger.error(`Failed to initialize service: ${name}`, error);
      throw error;
    }
  }

  /**
   * Initialize all registered services in dependency order
   */
  async initializeAll() {
    const initResults = [];
    
    for (const serviceName of this.initOrder) {
      try {
        const instance = await this.get(serviceName);
        initResults.push({ name: serviceName, status: 'success', instance });
        errorLogger.info(`✅ Service '${serviceName}' initialized successfully`);
      } catch (error) {
        initResults.push({ name: serviceName, status: 'error', error });
        errorLogger.error(`❌ Service '${serviceName}' initialization failed`, error);
      }
    }

    const successful = initResults.filter(r => r.status === 'success').length;
    const failed = initResults.filter(r => r.status === 'error').length;

    errorLogger.info(`Service initialization complete: ${successful} successful, ${failed} failed`);
    
    return initResults;
  }

  /**
   * Inject dependencies into service instance
   * @param {Object} serviceInstance - The service instance
   * @param {Object} dependencies - Dependency instances
   */
  _injectDependencies(serviceInstance, dependencies) {
    // Inject as properties
    Object.keys(dependencies).forEach(depName => {
      serviceInstance[depName] = dependencies[depName];
    });

    // Also inject as a services object for cleaner access
    serviceInstance.services = dependencies;
  }

  /**
   * Add service to initialization order based on dependencies
   * @param {string} name - Service name
   */
  _addToInitOrder(name) {
    if (this.initOrder.includes(name)) {
      return;
    }

    const deps = this.dependencies.get(name) || [];
    
    // Add dependencies first
    deps.forEach(dep => {
      if (this.services.has(dep)) {
        this._addToInitOrder(dep);
      }
    });

    // Add this service
    this.initOrder.push(name);
  }

  /**
   * Get service status information
   * @param {string} name - Service name (optional)
   */
  getStatus(name = null) {
    if (name) {
      const serviceInfo = this.services.get(name);
      if (!serviceInfo) {
        return { error: `Service '${name}' not found` };
      }

      return {
        name,
        initialized: serviceInfo.initialized,
        singleton: serviceInfo.singleton,
        lazy: serviceInfo.lazy,
        dependencies: serviceInfo.dependencies,
        hasInstance: !!serviceInfo.instance
      };
    }

    // Return status for all services
    const statusMap = {};
    this.services.forEach((serviceInfo, serviceName) => {
      statusMap[serviceName] = {
        initialized: serviceInfo.initialized,
        singleton: serviceInfo.singleton,
        lazy: serviceInfo.lazy,
        dependencies: serviceInfo.dependencies,
        hasInstance: !!serviceInfo.instance
      };
    });

    return {
      services: statusMap,
      totalServices: this.services.size,
      initOrder: this.initOrder,
      currentlyInitializing: Array.from(this.initializing)
    };
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown() {
    errorLogger.info('Starting service shutdown');
    
    // Shutdown in reverse order
    const shutdownOrder = [...this.initOrder].reverse();
    
    for (const serviceName of shutdownOrder) {
      try {
        const serviceInfo = this.services.get(serviceName);
        if (serviceInfo && serviceInfo.instance && typeof serviceInfo.instance.shutdown === 'function') {
          await serviceInfo.instance.shutdown();
          errorLogger.info(`Service '${serviceName}' shutdown successfully`);
        }
      } catch (error) {
        errorLogger.error(`Service '${serviceName}' shutdown failed`, error);
      }
    }
    
    // Clear all instances
    this.services.forEach(serviceInfo => {
      serviceInfo.instance = null;
      serviceInfo.initialized = false;
    });
    
    this.initializing.clear();
    errorLogger.info('Service shutdown complete');
  }

  /**
   * Reset the registry (for testing)
   */
  reset() {
    this.services.clear();
    this.dependencies.clear();
    this.initializing.clear();
    this.initOrder = [];
  }

  /**
   * Check for circular dependencies
   */
  checkCircularDependencies() {
    const visiting = new Set();
    const visited = new Set();
    
    const visit = (serviceName) => {
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving '${serviceName}'`);
      }
      
      if (visited.has(serviceName)) {
        return;
      }
      
      visiting.add(serviceName);
      
      const deps = this.dependencies.get(serviceName) || [];
      deps.forEach(dep => {
        if (this.services.has(dep)) {
          visit(dep);
        }
      });
      
      visiting.delete(serviceName);
      visited.add(serviceName);
    };
    
    this.services.forEach((_, serviceName) => {
      visit(serviceName);
    });
    
    return true; // No circular dependencies found
  }
}

// Create singleton instance
const serviceRegistry = new ServiceRegistry();

export default serviceRegistry;
export { ServiceRegistry };