/**
 * LEGACY NOTIFICATION SERVICE - DEPRECATED
 * 
 * This file has been consolidated into the unified NotificationService.
 * The new service is located in /src/services/ui/NotificationService.js
 * 
 * This file now acts as a simple proxy to maintain backwards compatibility.
 * For new code, import directly from './ui/NotificationService'
 * 
 * ✅ BEFORE: 3 separate notification services (33KB total)
 * ✅ AFTER: 1 unified service with full compatibility
 */

import notificationService from './ui/NotificationService';

// Export the unified notification service as the default
export default notificationService;