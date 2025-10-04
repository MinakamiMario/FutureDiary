// Smart notification service that automatically chooses between native and mock
import errorHandler from './errorLogger';

// Try to import native notifications, fallback to mock if not available
let nativeNotificationService;

// Import native notification service
try {
  nativeNotificationService = require('./nativeNotificationService').default;
  console.log('[NotificationService] Native notification service available');
} catch (error) {
  console.log('[NotificationService] Native notification service not available:', error.message);
  nativeNotificationService = null;
}

// Mock notifications as fallback
const MockNotifications = {
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ status: 'granted' }),
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  scheduleNotificationAsync: async ({ content, trigger }) => ({ notificationId: Date.now().toString() }),
  cancelScheduledNotificationAsync: async () => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  setNotificationChannelAsync: async () => {},
  AndroidImportance: { MAX: 'max' }
};

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
    this.onNotificationReceived = null;
    this.onNotificationResponseReceived = null;
  }

  /**
   * Initialize the notification service
   * @param {Function} [onNotificationReceived] - Callback for received notifications
   * @param {Function} [onNotificationResponseReceived] - Callback for notification responses
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(
    onNotificationReceived = null,
    onNotificationResponseReceived = null
  ) {
    if (this.isInitialized) {
      return {
        success: true,
        message: 'Notificatieservice is al geïnitialiseerd',
      };
    }

    try {
      console.log('[NotificationService] Initializing...');
      
      // Store callback functions
      this.onNotificationReceived = onNotificationReceived;
      this.onNotificationResponseReceived = onNotificationResponseReceived;

      // Use native notification service if available
      if (nativeNotificationService) {
        console.log('[NotificationService] Using native notification service');
        const result = await nativeNotificationService.initialize(
          onNotificationReceived,
          onNotificationResponseReceived
        );
        
        if (result.success) {
          this.isInitialized = true;
        }
        
        return result;
      }

      // Fallback to mock notifications
      console.log('[NotificationService] Using mock notification service');
      
      // Configure mock notifications
      MockNotifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      const permissionResult = await this.requestPermissions();
      if (!permissionResult.success) {
        return permissionResult;
      }

      // Register notification listeners
      this.registerListeners();

      this.isInitialized = true;
      return { 
        success: true, 
        message: 'Notificatieservice geïnitialiseerd' 
      };
    } catch (error) {
      await errorHandler.error('Error initializing notification service', error, 'notificationService.js');
      return {
        success: false,
        message: 'Fout bij initialiseren van notificatieservice: ' + error.message,
      };
    }
  }

  /**
   * Request notification permissions
   * @returns {Promise<Object>} Permission request result
   */
  async requestPermissions() {
    // Use native service if available
    if (nativeNotificationService) {
      return await nativeNotificationService.requestPermissionsAsync();
    }

    // Fallback to mock permissions
    try {
      const { status: existingStatus } = await MockNotifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await MockNotifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Verify permissions
      if (finalStatus !== 'granted') {
        return {
          success: false,
          message: 'Notificatiepermissies niet verleend',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return {
        success: false,
        message: 'Fout bij het aanvragen van permissies',
      };
    }
  }

  /**
   * Register notification listeners
   */
  registerListeners() {
    if (nativeNotificationService) {
      // Native service handles its own listeners
      return;
    }

    // Mock notification listeners
    this.notificationListener = MockNotifications.addNotificationReceivedListener(this.handleNotificationReceived);
    this.responseListener = MockNotifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);
  }

  /**
   * Handle received notification
   */
  handleNotificationReceived = (notification) => {
    if (this.onNotificationReceived) {
      this.onNotificationReceived(notification);
    }
  };

  /**
   * Handle notification response
   */
  handleNotificationResponse = (response) => {
    if (this.onNotificationResponseReceived) {
      this.onNotificationResponseReceived(response);
    }
  };

  /**
   * Schedule a notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} [data] - Additional data
   * @param {Object} [trigger] - Trigger configuration
   * @returns {Promise<Object>} Scheduling result
   */
  async scheduleNotification(title, body, data = {}, trigger = null) {
    try {
      // Use native service if available
      if (nativeNotificationService) {
        const date = trigger ? new Date(Date.now() + (trigger.seconds || 0) * 1000) : new Date();
        const notificationId = await nativeNotificationService.scheduleNotification({
          title,
          message: body,
          data,
          date,
          channelId: 'daily_summary'
        });
        return { success: true, notificationId };
      }

      // Fallback to mock
      const notificationContent = {
        title,
        body,
        data,
        sound: true,
      };

      const notificationId = await MockNotifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: trigger || null,
      });

      return { success: true, notificationId };
    } catch (error) {
      await errorHandler.error('Error scheduling notification', error, 'notificationService.js');
      return {
        success: false,
        message: 'Fout bij het plannen van notificatie: ' + error.message,
      };
    }
  }

  /**
   * Send an immediate notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} [data] - Additional data
   * @returns {Promise<Object>} Sending result
   */
  async sendNotification(title, body, data = {}) {
    try {
      // Use native service if available
      if (nativeNotificationService) {
        nativeNotificationService.sendNotification({
          title,
          message: body,
          data,
          channelId: 'daily_summary'
        });
        return { success: true };
      }

      // Fallback to schedule immediate notification
      return this.scheduleNotification(title, body, data);
    } catch (error) {
      await errorHandler.error('Error sending notification', error, 'notificationService.js');
      return {
        success: false,
        message: 'Fout bij het versturen van notificatie: ' + error.message,
      };
    }
  }

  /**
   * Schedule a daily notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {number} hour - Hour to schedule (0-23)
   * @param {number} minute - Minute to schedule (0-59)
   * @param {Object} [data] - Additional data
   * @returns {Promise<Object>} Scheduling result
   */
  async scheduleDaily(title, body, hour, minute, data = {}) {
    try {
      // Use native service if available
      if (nativeNotificationService) {
        const now = new Date();
        const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
        
        // If time has passed today, schedule for tomorrow
        if (scheduledDate <= now) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        const notificationId = await nativeNotificationService.scheduleNotification({
          title,
          message: body,
          data,
          date: scheduledDate,
          channelId: 'daily_summary'
        });
        return { success: true, notificationId };
      }

      // Fallback to mock with daily repeat
      const trigger = {
        hour,
        minute,
        repeats: true,
      };
      return this.scheduleNotification(title, body, data, trigger);
    } catch (error) {
      await errorHandler.error('Error scheduling daily notification', error, 'notificationService.js');
      return {
        success: false,
        message: 'Fout bij het plannen van dagelijkse notificatie: ' + error.message,
      };
    }
  }

  /**
   * Cancel a specific scheduled notification
   * @param {string} notificationId - ID of the notification to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelNotification(notificationId) {
    try {
      // Use native service if available
      if (nativeNotificationService) {
        nativeNotificationService.cancelNotification(notificationId);
        return { success: true };
      }

      // Fallback to mock
      await MockNotifications.cancelScheduledNotificationAsync(notificationId);
      return { success: true };
    } catch (error) {
      await errorHandler.error('Error canceling notification', error, 'notificationService.js');
      return {
        success: false,
        message: 'Fout bij het annuleren van notificatie: ' + error.message,
      };
    }
  }

  /**
   * Cancel all scheduled notifications
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelAllNotifications() {
    try {
      // Use native service if available
      if (nativeNotificationService) {
        nativeNotificationService.cancelAllNotifications();
        return { success: true };
      }

      // Fallback to mock
      await MockNotifications.cancelAllScheduledNotificationsAsync();
      return { success: true };
    } catch (error) {
      await errorHandler.error('Error canceling all notifications', error, 'notificationService.js');
      return {
        success: false,
        message: 'Fout bij het annuleren van alle notificaties: ' + error.message,
      };
    }
  }

  /**
   * Get notification permissions status
   * @returns {Promise<Object>} Permission status
   */
  async getPermissionsAsync() {
    try {
      // Use native service if available
      if (nativeNotificationService) {
        return await nativeNotificationService.getPermissionsAsync();
      }

      // Fallback to mock
      return await MockNotifications.getPermissionsAsync();
    } catch (error) {
      console.error('Error getting permissions:', error);
      return {
        status: 'undetermined',
        error: error.message
      };
    }
  }

  /**
   * Request notification permissions
   * @returns {Promise<Object>} Permission request result
   */
  async requestPermissionsAsync() {
    try {
      // Use native service if available
      if (nativeNotificationService) {
        return await nativeNotificationService.requestPermissionsAsync();
      }

      // Fallback to mock
      return await MockNotifications.requestPermissionsAsync();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return {
        status: 'denied',
        error: error.message
      };
    }
  }

  /**
   * Check if service is initialized
   * @returns {boolean} Initialization status
   */
  isServiceInitialized() {
    return this.isInitialized;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      if (nativeNotificationService) {
        nativeNotificationService.cleanup();
      } else {
        // Cleanup mock listeners
        if (this.notificationListener) {
          this.notificationListener.remove();
          this.notificationListener = null;
        }
        
        if (this.responseListener) {
          this.responseListener.remove();
          this.responseListener = null;
        }
      }
      
      this.isInitialized = false;
      console.log('[NotificationService] Cleanup completed');
    } catch (error) {
      console.error('[NotificationService] Error during cleanup:', error);
    }
  }

  // Utility methods

  /**
   * Schedule a weekly notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} [data] - Additional data
   * @returns {Promise<Object>} Scheduling result
   */
  async scheduleWeeklySummary(data = {}) {
    return this.scheduleDaily(
      'Je wekelijkse activiteitenoverzicht',
      'Bekijk je activiteiten en trends van afgelopen week',
      { type: 'weekly_summary', ...data },
      20, // 8 PM
      0   // 0 minutes
    );
  }

  /**
   * Show notification for API key rotation
   * @param {string} keyType - Type of API key (OpenAI, Claude, etc.)
   * @param {Object} rotationDetails - Details about the rotation
   */
  async showRotationNotification(keyType, rotationDetails = {}) {
    const keyDisplayName = this.getKeyDisplayName(keyType);
    
    let title = '🔐 Security Update';
    let body = `Your ${keyDisplayName} API key has been rotated for security purposes.`;
    
    if (rotationDetails.isEmergency) {
      title = '🚨 Security Alert';
      body = `Emergency rotation completed for ${keyDisplayName} API key. New key is now active.`;
    } else if (rotationDetails.isScheduled) {
      title = '🔄 Scheduled Security Update';
      body = `Scheduled rotation completed for ${keyDisplayName} API key. Security maintained.`;
    }

    return this.sendNotification(title, body, {
      type: 'security_rotation',
      keyType,
      ...rotationDetails
    });
  }

  /**
   * Get display name for API key type
   * @param {string} keyType - API key type
   * @returns {string} Display name
   */
  getKeyDisplayName(keyType) {
    const displayNames = {
      'openai': 'OpenAI',
      'claude': 'Claude',
      'gemini': 'Gemini',
      'default': 'AI Model'
    };
    return displayNames[keyType] || displayNames.default;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
export { NotificationService };