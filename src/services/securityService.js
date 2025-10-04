/**
 * LEGACY SECURITY SERVICE - DEPRECATED
 * 
 * This service has been moved to the core services directory.
 * The new service is located in /src/services/core/SecurityService.js
 * 
 * This file now acts as a simple proxy to maintain backwards compatibility.
 * For new code, import directly from './core/SecurityService'
 */

import securityService from './core/SecurityService';

// Export the core security service as the default
export default securityService;