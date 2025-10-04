// src/services/notificationToastService.js
// Toast notification service for user-friendly alerts

import { Alert, Platform } from 'react-native';

class NotificationToastService {
  constructor() {
    this.toastQueue = [];
    this.isShowingToast = false;
  }

  /**
   * Show a toast notification with automatic dismiss
   */
  showToast(message, type = 'info', options = {}) {
    const toast = {
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration: options.duration || 4000,
      action: options.action || null,
      timestamp: Date.now()
    };

    // Add to queue
    this.toastQueue.push(toast);
    
    // Process queue if not already showing
    if (!this.isShowingToast) {
      this.processToastQueue();
    }

    return toast;
  }

  /**
   * Process the toast queue
   */
  async processToastQueue() {
    if (this.toastQueue.length === 0) {
      this.isShowingToast = false;
      return;
    }

    this.isShowingToast = true;
    const toast = this.toastQueue.shift();

    // For React Native without external toast library, use Alert with timeout
    if (toast.action && toast.action.label) {
      // Show alert with action button
      Alert.alert(
        this.getToastTitle(toast.type),
        toast.message,
        [
          { 
            text: 'Sluiten', 
            style: 'cancel',
            onPress: () => setTimeout(() => this.processToastQueue(), 500)
          },
          {
            text: toast.action.label,
            onPress: () => {
              if (toast.action.onPress) toast.action.onPress();
              setTimeout(() => this.processToastQueue(), 500);
            }
          }
        ]
      );
    } else {
      // Show simple alert that auto-dismisses
      Alert.alert(
        this.getToastTitle(toast.type),
        toast.message,
        [
          { 
            text: 'OK', 
            onPress: () => setTimeout(() => this.processToastQueue(), 500)
          }
        ]
      );
    }
  }

  /**
   * Get appropriate title for toast type
   */
  getToastTitle(type) {
    switch (type) {
      case 'success':
        return '✅ Gelukt';
      case 'error':
        return '❌ Fout';
      case 'warning':
        return '⚠️ Let Op';
      case 'info':
      default:
        return 'ℹ️ Info';
    }
  }

  /**
   * Show token expiry notification for Strava
   */
  showStravaTokenExpired(onReconnect) {
    return this.showToast(
      'Je Strava-sessie is verlopen. Verbind opnieuw om je trainingsdata te blijven synchroniseren.',
      'warning',
      {
        duration: 6000,
        action: {
          label: 'Verbind Opnieuw',
          onPress: onReconnect
        }
      }
    );
  }

  /**
   * Show successful Strava connection
   */
  showStravaConnected(userName) {
    return this.showToast(
      `Succesvol verbonden met Strava als ${userName}! Je trainingsdata wordt nu gesynchroniseerd.`,
      'success',
      { duration: 3000 }
    );
  }

  /**
   * Show Strava disconnection
   */
  showStravaDisconnected() {
    return this.showToast(
      'Strava verbinding verbroken. Je bestaande trainingsdata blijft bewaard.',
      'info',
      { duration: 3000 }
    );
  }

  /**
   * Show Strava sync success
   */
  showStravaSyncSuccess(count) {
    return this.showToast(
      `${count} nieuwe trainingen geïmporteerd van Strava!`,
      'success',
      { duration: 3000 }
    );
  }

  /**
   * Show Strava sync error
   */
  showStravaSyncError(error) {
    return this.showToast(
      `Synchronisatie mislukt: ${error}`,
      'error',
      { duration: 4000 }
    );
  }

  /**
   * Show AI service token expired notification
   */
  showAITokenExpired(serviceName, onReconnect) {
    return this.showToast(
      `Je ${serviceName} API-sleutel is verlopen of ongeldig. Werk je AI instellingen bij om dagboeken te blijven genereren.`,
      'warning',
      {
        duration: 6000,
        action: {
          label: 'Instellingen',
          onPress: onReconnect
        }
      }
    );
  }

  /**
   * Show AI service connected successfully
   */
  showAIConnected(serviceName) {
    return this.showToast(
      `${serviceName} succesvol gekoppeld! AI dagboek generatie is nu beschikbaar.`,
      'success',
      { duration: 3000 }
    );
  }

  /**
   * Show AI service disconnected
   */
  showAIDisconnected(serviceName) {
    return this.showToast(
      `${serviceName} verbinding verwijderd. Bestaande dagboeken blijven bewaard.`,
      'info',
      { duration: 3000 }
    );
  }

  /**
   * Show AI diary generation success
   */
  showAIDiaryGenerated(serviceName, wordCount) {
    return this.showToast(
      `Nieuw dagboek gegenereerd met ${serviceName}! (${wordCount} woorden)`,
      'success',
      { duration: 3000 }
    );
  }

  /**
   * Show AI diary generation error
   */
  showAIDiaryError(serviceName, error) {
    return this.showToast(
      `Dagboek generatie mislukt (${serviceName}): ${error}`,
      'error',
      { duration: 5000 }
    );
  }

  /**
   * Show AI quota exceeded
   */
  showAIQuotaExceeded(serviceName, onUpgrade) {
    return this.showToast(
      `${serviceName} limiet bereikt voor vandaag. Upgrade je account of probeer morgen opnieuw.`,
      'warning',
      {
        duration: 6000,
        action: onUpgrade ? {
          label: 'Upgrade',
          onPress: onUpgrade
        } : null
      }
    );
  }

  /**
   * Show AI service rate limited
   */
  showAIRateLimited(serviceName, retryAfter) {
    const minutes = Math.ceil(retryAfter / 60);
    return this.showToast(
      `${serviceName} tijdelijk niet beschikbaar. Probeer over ${minutes} minuten opnieuw.`,
      'warning',
      { duration: 4000 }
    );
  }

  /**
   * Show AI configuration required
   */
  showAIConfigRequired(serviceName, onConfigure) {
    return this.showToast(
      `${serviceName} nog niet ingesteld. Configureer je API-sleutel om dagboeken te genereren.`,
      'info',
      {
        duration: 5000,
        action: {
          label: 'Instellen',
          onPress: onConfigure
        }
      }
    );
  }

  /**
   * Show general error notification
   */
  showError(message, options = {}) {
    return this.showToast(message, 'error', options);
  }

  /**
   * Show success notification
   */
  showSuccess(message, options = {}) {
    return this.showToast(message, 'success', options);
  }

  /**
   * Show warning notification
   */
  showWarning(message, options = {}) {
    return this.showToast(message, 'warning', options);
  }

  /**
   * Show info notification
   */
  showInfo(message, options = {}) {
    return this.showToast(message, 'info', options);
  }

  /**
   * Clear all pending toasts
   */
  clearAll() {
    this.toastQueue = [];
    this.isShowingToast = false;
  }
}

// Singleton instance
const notificationToastService = new NotificationToastService();
export default notificationToastService;