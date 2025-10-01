// Mock notification service for React Native without Expo
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

const Notifications = MockNotifications;
const Device = { isDevice: true };
import errorHandler from './errorLogger';

// Configure default notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
      // Store callback functions
      this.onNotificationReceived = onNotificationReceived;
      this.onNotificationResponseReceived = onNotificationResponseReceived;

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
   * Clean up notification listeners
   */
  async cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    this.isInitialized = false;
  }

  /**
   * Request notification permissions
   * @returns {Promise<Object>} Permission request result
   */
  async requestPermissions() {
    // Check if running on a physical device
    if (!Device.isDevice) {
      return { success: true, isDevice: false };
    }

    // Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Verify permissions
    if (finalStatus !== 'granted') {
      return {
        success: false,
        message: 'Notificatiepermissies niet verleend',
      };
    }

    // Configure Android notification channel (assume Android for mobile app)
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (error) {
      if (__DEV__) console.warn('Could not set notification channel:', error.message);
    }

    return { success: true };
  }

  /**
   * Register notification listeners
   */
  registerListeners() {
    // Listener for received notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (this.onNotificationReceived) {
          this.onNotificationReceived(notification);
        }
      }
    );

    // Listener for notification responses
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (this.onNotificationResponseReceived) {
          this.onNotificationResponseReceived(response);
        }
      }
    );
  }

  /**
   * Schedule a notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} [data] - Additional data
   * @param {Object} [trigger] - Trigger conditions
   * @returns {Promise<Object>} Scheduling result
   */
  async scheduleNotification(title, body, data = {}, trigger = null) {
    try {
      // Prepare notification content
      const notificationContent = {
        title,
        body,
        data,
        sound: true,
      };

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
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
    return this.scheduleNotification(title, body, data);
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
    const trigger = {
      hour,
      minute,
      repeats: true,
    };

    return this.scheduleNotification(title, body, data, trigger);
  }

  /**
   * Cancel a specific scheduled notification
   * @param {string} notificationId - ID of the notification to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
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
      await Notifications.cancelAllScheduledNotificationsAsync();
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
   * Send a milestone notification when approaching or reaching a goal
   * @param {number} currentValue - Current progress value
   * @param {number} targetValue - Target value
   * @param {string} metricName - Name of the metric
   * @param {number} [threshold] - Percentage threshold for notification (default 0.9)
   * @returns {Promise<boolean>} Whether a notification was sent
   */
  async scheduleMilestoneNotification(currentValue, targetValue, metricName, threshold = 0.9) {
    const percentage = currentValue / targetValue;

    if (percentage >= threshold && percentage < 1) {
      // Almost reached the goal
      const remainingValue = targetValue - currentValue;
      await this.sendNotification(
        `Bijna je ${metricName}-doel bereikt!`,
        `Nog ${remainingValue} ${metricName} te gaan om je dagelijkse doel te bereiken.`,
        { metricName, currentValue, targetValue }
      );
      return true;
    } else if (percentage >= 1) {
      // Goal reached
      await this.sendNotification(
        `${metricName}-doel bereikt!`,
        `Gefeliciteerd, je hebt je dagelijkse doel van ${targetValue} ${metricName} bereikt!`,
        { metricName, currentValue, targetValue }
      );
      return true;
    }

    return false;
  }

  /**
   * Schedule a weekly summary notification
   * @returns {Promise<Object>} Scheduling result
   */
  async scheduleWeeklySummary() {
    // Schedule for Sunday at 20:00
    return this.scheduleNotification(
      'Je wekelijkse activiteitenoverzicht',
      'Bekijk je activiteiten en trends van afgelopen week',
      { type: 'weekly_summary' },
      {
        weekday: 7, // Sunday
        hour: 20,
        minute: 0,
        repeats: true,
      }
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
      type: 'key_rotation',
      keyType,
      timestamp: new Date().toISOString(),
      ...rotationDetails
    });
  }

  /**
   * Show warning notification for approaching rotation deadline
   * @param {string} keyType - Type of API key
   * @param {number} daysUntilRotation - Days until required rotation
   */
  async showRotationWarning(keyType, daysUntilRotation) {
    const keyDisplayName = this.getKeyDisplayName(keyType);
    
    return this.sendNotification(
      '🔐 Security Reminder',
      `Your ${keyDisplayName} API key will require rotation in ${daysUntilRotation} days for security purposes.`,
      {
        type: 'rotation_warning',
        keyType,
        daysUntilRotation,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Show notification for successful key storage
   * @param {string} keyType - Type of API key stored
   */
  async showKeyStoredNotification(keyType) {
    const keyDisplayName = this.getKeyDisplayName(keyType);
    
    return this.sendNotification(
      '✅ Security Update',
      `Your ${keyDisplayName} API key has been securely stored with encryption.`,
      {
        type: 'key_stored',
        keyType,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Get display-friendly name for API key type
   * @param {string} keyType - Internal key type
   */
  getKeyDisplayName(keyType) {
    const displayNames = {
      'openai_api_key': 'OpenAI',
      'claude_api_key': 'Claude',
      'encryption_key': 'Encryption',
      'oauth_tokens': 'OAuth'
    };
    return displayNames[keyType] || keyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

// Singleton instance
const notificationService = new NotificationService();
export default notificationService;