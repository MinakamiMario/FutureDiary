/**
 * LEGACY TOAST NOTIFICATION SERVICE - DEPRECATED
 * 
 * This service has been consolidated into the unified NotificationService.
 * The new service is located in /src/services/ui/NotificationService.js
 * 
 * This file now acts as a simple proxy to maintain backwards compatibility.
 */

import notificationService from './ui/NotificationService';

// Export the unified notification service as the default
export default notificationService;