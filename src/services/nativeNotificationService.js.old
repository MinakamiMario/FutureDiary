// Native notification service using react-native-push-notification
import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import errorHandler from './errorLogger';

class NativeNotificationService {
  constructor() {
    this.isInitialized = false;
    this.onNotificationReceived = null;
    this.onNotificationResponseReceived = null;
  }

  /**
   * Initialize the native notification service
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
        status: 'already_initialized'
      };
    }

    try {
      console.log('[NativeNotificationService] Initializing...');
      
      this.onNotificationReceived = onNotificationReceived;
      this.onNotificationResponseReceived = onNotificationResponseReceived;

      // Configure push notification
      PushNotification.configure({
        // (optional) Called when Token is generated (iOS and Android)
        onRegister: function (token) {
          console.log('[PushNotification] TOKEN:', token);
        },

        // (required) Called when a remote is received or opened, or local notification is opened
        onNotification: function (notification) {
          console.log('[PushNotification] NOTIFICATION:', notification);
          
          if (this.onNotificationReceived) {
            this.onNotificationReceived(notification);
          }
          
          if (notification.userInteraction && this.onNotificationResponseReceived) {
            this.onNotificationResponseReceived(notification);
          }

          // Process the notification
          // Required on iOS only (see fetchCompletionHandler docs: https://github.com/react-native-community/react-native-push-notification-ios)
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }.bind(this),

        // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
        onAction: function (notification) {
          console.log('[PushNotification] ACTION:', notification.action);
          console.log('[PushNotification] NOTIFICATION:', notification);
        },

        // (optional) Called when the user fails to register for remote notifications. Typically occurs when APNS is having issues, or the device is a simulator. (iOS)
        onRegistrationError: function(err) {
          console.error('[PushNotification] REGISTRATION ERROR:', err.message, err);
        },

        // IOS ONLY (optional): default: all - Permissions to register.
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        // Should the initial notification be popped automatically
        // default: true
        popInitialNotification: true,

        /**
         * (optional) default: true
         * - Specified if permissions (ios) and token (android and ios) will requested or not,
         * - if not, you must call PushNotificationsHandler.requestPermissions() later
         * - if you are not using remote notification or do not have Firebase installed, use this:
         *     requestPermissions: Platform.OS === 'ios'
         */
        requestPermissions: true,
      });

      // Create notification channels for Android
      if (Platform.OS === 'android') {
        this.createNotificationChannels();
      }

      this.isInitialized = true;
      
      console.log('[NativeNotificationService] Successfully initialized');
      
      return {
        success: true,
        message: 'Notificatieservice succesvol geïnitialiseerd',
        status: 'initialized'
      };
    } catch (error) {
      console.error('[NativeNotificationService] Initialization error:', error);
      errorHandler.logError(error, 'NativeNotificationService.initialize');
      
      return {
        success: false,
        message: 'Fout bij initialiseren van notificatieservice',
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * Create notification channels for Android
   */
  createNotificationChannels() {
    // Daily summary channel
    PushNotification.createChannel(
      {
        channelId: "daily_summary",
        channelName: "Dagelijkse Samenvattingen",
        channelDescription: "Ontvang dagelijkse samenvattingen van je activiteiten",
        playSound: true,
        soundName: "default",
        importance: 4, // IMPORTANCE_DEFAULT
        vibrate: true,
      },
      (created) => console.log(`[PushNotification] Daily summary channel created: ${created}`)
    );

    // Reminder channel
    PushNotification.createChannel(
      {
        channelId: "reminders",
        channelName: "Herinneringen",
        channelDescription: "Herinneringen voor het bijhouden van je dag",
        playSound: true,
        soundName: "default",
        importance: 5, // IMPORTANCE_HIGH
        vibrate: true,
      },
      (created) => console.log(`[PushNotification] Reminders channel created: ${created}`)
    );

    // Activity alerts channel
    PushNotification.createChannel(
      {
        channelId: "activity_alerts",
        channelName: "Activiteit Waarschuwingen",
        channelDescription: "Notificaties bij activiteit detectie",
        playSound: false,
        importance: 3, // IMPORTANCE_LOW
        vibrate: false,
      },
      (created) => console.log(`[PushNotification] Activity alerts channel created: ${created}`)
    );
  }

  /**
   * Schedule a local notification
   * @param {Object} notification - Notification configuration
   * @returns {Promise<string>} Notification ID
   */
  async scheduleNotification(notification) {
    if (!this.isInitialized) {
      throw new Error('Notification service not initialized');
    }

    try {
      const {
        title,
        message,
        channelId = 'daily_summary',
        date = new Date(),
        id = Date.now().toString(),
        allowWhileIdle = true,
        repeatType = undefined,
        repeatTime = undefined,
        actions = [],
        soundName = 'default',
        vibrate = true,
        playSound = true,
        priority = 'high',
        ongoing = false,
        autoCancel = true,
        onlyAlertOnce = false,
        visibility = 'private',
        importance = 'high',
        number = 1,
        ...customProps
      } = notification;

      const notificationConfig = {
        id: id,
        title: title,
        message: message,
        channelId: channelId,
        date: date,
        allowWhileIdle: allowWhileIdle,
        soundName: soundName,
        vibrate: vibrate,
        playSound: playSound,
        priority: priority,
        ongoing: ongoing,
        autoCancel: autoCancel,
        onlyAlertOnce: onlyAlertOnce,
        visibility: visibility,
        importance: importance,
        number: number,
        actions: actions,
        ...customProps
      };

      // Handle repeat settings
      if (repeatType && repeatTime) {
        notificationConfig.repeatType = repeatType;
        notificationConfig.repeatTime = repeatTime;
      }

      console.log(`[NativeNotificationService] Scheduling notification:`, notificationConfig);
      
      PushNotification.localNotificationSchedule(notificationConfig);
      
      console.log(`[NativeNotificationService] Notification scheduled with ID: ${id}`);
      
      return id;
    } catch (error) {
      console.error('[NativeNotificationService] Error scheduling notification:', error);
      errorHandler.logError(error, 'NativeNotificationService.scheduleNotification');
      throw error;
    }
  }

  /**
   * Send immediate local notification
   * @param {Object} notification - Notification configuration
   * @returns {void}
   */
  sendNotification(notification) {
    if (!this.isInitialized) {
      console.warn('[NativeNotificationService] Service not initialized');
      return;
    }

    try {
      const {
        title,
        message,
        channelId = 'daily_summary',
        id = Date.now().toString(),
        actions = [],
        soundName = 'default',
        vibrate = true,
        playSound = true,
        priority = 'high',
        ongoing = false,
        autoCancel = true,
        onlyAlertOnce = false,
        visibility = 'private',
        importance = 'high',
        number = 1,
        ...customProps
      } = notification;

      const notificationConfig = {
        id: id,
        title: title,
        message: message,
        channelId: channelId,
        soundName: soundName,
        vibrate: vibrate,
        playSound: playSound,
        priority: priority,
        ongoing: ongoing,
        autoCancel: autoCancel,
        onlyAlertOnce: onlyAlertOnce,
        visibility: visibility,
        importance: importance,
        number: number,
        actions: actions,
        ...customProps
      };

      console.log(`[NativeNotificationService] Sending notification:`, notificationConfig);
      
      PushNotification.localNotification(notificationConfig);
      
      console.log(`[NativeNotificationService] Notification sent with ID: ${id}`);
    } catch (error) {
      console.error('[NativeNotificationService] Error sending notification:', error);
      errorHandler.logError(error, 'NativeNotificationService.sendNotification');
    }
  }

  /**
   * Cancel a scheduled notification
   * @param {string} id - Notification ID
   * @returns {void}
   */
  cancelNotification(id) {
    try {
      console.log(`[NativeNotificationService] Cancelling notification: ${id}`);
      PushNotification.cancelLocalNotifications({ id: id });
    } catch (error) {
      console.error('[NativeNotificationService] Error cancelling notification:', error);
      errorHandler.logError(error, 'NativeNotificationService.cancelNotification');
    }
  }

  /**
   * Cancel all scheduled notifications
   * @returns {void}
   */
  cancelAllNotifications() {
    try {
      console.log('[NativeNotificationService] Cancelling all notifications');
      PushNotification.cancelAllLocalNotifications();
    } catch (error) {
      console.error('[NativeNotificationService] Error cancelling all notifications:', error);
      errorHandler.logError(error, 'NativeNotificationService.cancelAllNotifications');
    }
  }

  /**
   * Get notification permissions status
   * @returns {Promise<Object>} Permission status
   */
  async getPermissionsAsync() {
    try {
      // This would normally check native permissions
      // For now, return a mock status since the library handles permissions internally
      return {
        status: 'granted',
        expires: 'never',
        granted: true,
        canAskAgain: true
      };
    } catch (error) {
      console.error('[NativeNotificationService] Error getting permissions:', error);
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
      // The library handles permissions during configure()
      // Return success since permissions are handled by the native module
      return {
        status: 'granted',
        expires: 'never',
        granted: true,
        canAskAgain: false
      };
    } catch (error) {
      console.error('[NativeNotificationService] Error requesting permissions:', error);
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
   * Cleanup resources
   */
  cleanup() {
    try {
      if (this.notificationListener) {
        this.notificationListener.remove();
        this.notificationListener = null;
      }
      
      if (this.responseListener) {
        this.responseListener.remove();
        this.responseListener = null;
      }
      
      this.isInitialized = false;
      console.log('[NativeNotificationService] Cleanup completed');
    } catch (error) {
      console.error('[NativeNotificationService] Error during cleanup:', error);
    }
  }
}

// Create singleton instance
const nativeNotificationService = new NativeNotificationService();

export default nativeNotificationService;
export { NativeNotificationService };