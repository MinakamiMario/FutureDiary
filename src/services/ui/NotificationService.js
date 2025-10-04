/**
 * UNIFIED NOTIFICATION SERVICE
 * 
 * Consolidates all notification functionality:
 * - notificationService.js
 * - nativeNotificationService.js  
 * - notificationToastService.js
 * 
 * Provides unified interface for all notification types
 */

import errorHandler from '../errorLogger';

// Try to import native notifications, fallback to mock if not available
let nativeNotificationService;

try {
  nativeNotificationService = require('../nativeNotificationService').default;
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

class UnifiedNotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
    this.onNotificationReceived = null;
    this.onNotificationResponseReceived = null;
    this.toastQueue = [];
    this.activeToasts = new Map();
  }

  /**
   * Initialize the notification service
   */
  async initialize(onNotificationReceived = null, onNotificationResponseReceived = null) {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }

    try {
      this.onNotificationReceived = onNotificationReceived;
      this.onNotificationResponseReceived = onNotificationResponseReceived;

      if (nativeNotificationService) {
        await nativeNotificationService.initialize();
        
        if (onNotificationReceived) {
          this.notificationListener = nativeNotificationService.addNotificationReceivedListener(onNotificationReceived);
        }
        
        if (onNotificationResponseReceived) {
          this.responseListener = nativeNotificationService.addNotificationResponseReceivedListener(onNotificationResponseReceived);
        }
      }

      this.isInitialized = true;
      return { success: true, message: 'Notification service initialized successfully' };
    } catch (error) {
      errorHandler.logError('Failed to initialize notification service', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      if (nativeNotificationService) {
        return await nativeNotificationService.requestPermissionsAsync();
      }
      return MockNotifications.requestPermissionsAsync();
    } catch (error) {
      errorHandler.logError('Failed to request notification permissions', error);
      return { status: 'denied', error: error.message };
    }
  }

  /**
   * Get current notification permissions
   */
  async getPermissions() {
    try {
      if (nativeNotificationService) {
        return await nativeNotificationService.getPermissionsAsync();
      }
      return MockNotifications.getPermissionsAsync();
    } catch (error) {
      errorHandler.logError('Failed to get notification permissions', error);
      return { status: 'undetermined', error: error.message };
    }
  }

  /**
   * Schedule a notification
   */
  async scheduleNotification(content, trigger = null) {
    try {
      const notificationPayload = {
        content: {
          title: content.title,
          body: content.body,
          data: content.data || {},
          sound: content.sound || 'default',
          badge: content.badge,
          ...content
        },
        trigger
      };

      if (nativeNotificationService) {
        return await nativeNotificationService.scheduleNotificationAsync(notificationPayload);
      }
      return MockNotifications.scheduleNotificationAsync(notificationPayload);
    } catch (error) {
      errorHandler.logError('Failed to schedule notification', error);
      throw error;
    }
  }

  /**
   * Show immediate notification
   */
  async showNotification(title, body, data = {}) {
    return this.scheduleNotification({
      title,
      body,
      data
    });
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId) {
    try {
      if (nativeNotificationService) {
        return await nativeNotificationService.cancelScheduledNotificationAsync(notificationId);
      }
      return MockNotifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      errorHandler.logError('Failed to cancel notification', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      if (nativeNotificationService) {
        return await nativeNotificationService.cancelAllScheduledNotificationsAsync();
      }
      return MockNotifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      errorHandler.logError('Failed to cancel all notifications', error);
      throw error;
    }
  }

  /**
   * TOAST NOTIFICATIONS
   * In-app toast/banner notifications
   */

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = 3000, options = {}) {
    const toastId = Date.now().toString();
    const toast = {
      id: toastId,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      timestamp: Date.now(),
      ...options
    };

    this.toastQueue.push(toast);
    this.activeToasts.set(toastId, toast);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toastId);
      }, duration);
    }

    // Notify listeners if any
    this._notifyToastListeners('show', toast);
    
    return toastId;
  }

  /**
   * Remove toast notification
   */
  removeToast(toastId) {
    const toast = this.activeToasts.get(toastId);
    if (toast) {
      this.activeToasts.delete(toastId);
      this._notifyToastListeners('remove', toast);
    }
  }

  /**
   * Clear all toasts
   */
  clearAllToasts() {
    this.activeToasts.clear();
    this.toastQueue = [];
    this._notifyToastListeners('clear');
  }

  /**
   * Get active toasts
   */
  getActiveToasts() {
    return Array.from(this.activeToasts.values());
  }

  /**
   * Convenience methods for different toast types
   */
  showSuccess(message, duration = 3000, options = {}) {
    return this.showToast(message, 'success', duration, options);
  }

  showError(message, duration = 5000, options = {}) {
    return this.showToast(message, 'error', duration, options);
  }

  showWarning(message, duration = 4000, options = {}) {
    return this.showToast(message, 'warning', duration, options);
  }

  showInfo(message, duration = 3000, options = {}) {
    return this.showToast(message, 'info', duration, options);
  }

  /**
   * Toast listeners management
   */
  _toastListeners = new Set();

  addToastListener(listener) {
    this._toastListeners.add(listener);
    return () => this._toastListeners.delete(listener);
  }

  _notifyToastListeners(action, toast = null) {
    this._toastListeners.forEach(listener => {
      try {
        listener({ action, toast, activeToasts: this.getActiveToasts() });
      } catch (error) {
        console.warn('Toast listener error:', error);
      }
    });
  }

  /**
   * Health data specific notifications
   */
  async notifyHealthDataUpdate(type, data) {
    const messages = {
      steps: `🚶‍♂️ ${data.steps} steps today!`,
      heart_rate: `❤️ Heart rate: ${data.heartRate} BPM`,
      calories: `🔥 ${data.calories} calories burned`,
      activity: `🏃‍♂️ New activity: ${data.activity}`
    };

    const message = messages[type] || `Health data updated: ${type}`;
    
    return this.showSuccess(message, 3000, {
      category: 'health',
      data
    });
  }

  /**
   * Strava specific notifications
   */
  async notifyStravaSync(status, data = {}) {
    const messages = {
      success: '✅ Strava data synced successfully',
      error: '❌ Strava sync failed',
      started: '🔄 Syncing Strava data...',
      new_activity: `🏃‍♂️ New Strava activity: ${data.name || 'Unknown'}`
    };

    const message = messages[status] || `Strava: ${status}`;
    const type = status === 'error' ? 'error' : status === 'success' ? 'success' : 'info';
    
    return this.showToast(message, type, 3000, {
      category: 'strava',
      data
    });
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    this.clearAllToasts();
    this._toastListeners.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
const notificationService = new UnifiedNotificationService();
export default notificationService;