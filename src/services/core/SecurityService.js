// securityService.js - Security management service for MinakamiApp

import AsyncStorage from '@react-native-async-storage/async-storage';
import encryptionService from '../utils/encryptionService';
import notificationService from './ui/NotificationService';

/**
 * Security service for managing secrets, rotation, and validation
 */
class SecurityService {
  constructor() {
    this.rotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    this.warningThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days warning
  }

  /**
   * Check if a secret needs rotation
   * @param {string} keyName - Name of the secret
   * @returns {Promise<Object>} - Rotation status
   */
  async checkRotationStatus(keyName) {
    try {
      const metadata = await AsyncStorage.getItem(`secret_meta_${keyName}`);
      if (!metadata) {
        return {
          needsRotation: true,
          lastRotation: null,
          daysUntilRotation: 0,
          warning: false
        };
      }

      const meta = JSON.parse(metadata);
      const lastRotation = new Date(meta.lastRotation);
      const now = new Date();
      const age = now - lastRotation;
      const daysUntilRotation = Math.max(0, Math.ceil((this.rotationInterval - age) / (24 * 60 * 60 * 1000)));

      return {
        needsRotation: age >= this.rotationInterval,
        lastRotation: lastRotation,
        daysUntilRotation: daysUntilRotation,
        warning: age >= (this.rotationInterval - this.warningThreshold)
      };
    } catch (error) {
      console.error('Error checking rotation status:', error);
      return {
        needsRotation: true,
        lastRotation: null,
        daysUntilRotation: 0,
        warning: false
      };
    }
  }

  /**
   * Rotate a secret with new value
   * @param {string} keyName - Name of the secret
   * @param {string} newValue - New secret value
   * @param {Object} options - Rotation options
   * @returns {Promise<boolean>} - Success status
   */
  async rotateSecret(keyName, newValue, options = {}) {
    try {
      const { isEmergency = false, isScheduled = false, silent = false } = options;

      // Store new encrypted secret
      await encryptionService.initialize();
      const encryptedData = await encryptionService.encryptData(newValue);
      
      if (!encryptedData) {
        throw new Error('Failed to encrypt secret');
      }

      // Store encrypted secret
      await AsyncStorage.setItem(`secure_${keyName}`, encryptedData);

      // Update rotation metadata
      const metadata = {
        lastRotation: new Date().toISOString(),
        version: (await this.getSecretVersion(keyName)) + 1,
        rotatedBy: isEmergency ? 'security_alert' : isScheduled ? 'auto' : 'user_action'
      };

      await AsyncStorage.setItem(`secret_meta_${keyName}`, JSON.stringify(metadata));

      // Clean up old versions if they exist
      await this.cleanupOldVersions(keyName);

      // Send notification unless silent mode
      if (!silent) {
        await notificationService.showRotationNotification(keyName, {
          isEmergency,
          isScheduled,
          timestamp: new Date().toISOString()
        });
      }

      if (__DEV__) console.log(`✅ Secret rotated successfully: ${keyName}`);
      return true;
    } catch (error) {
      console.error('Error rotating secret:', error);
      return false;
    }
  }

  /**
   * Get current version number for a secret
   * @param {string} keyName - Name of the secret
   * @returns {Promise<number>} - Current version
   */
  async getSecretVersion(keyName) {
    try {
      const metadata = await AsyncStorage.getItem(`secret_meta_${keyName}`);
      if (!metadata) return 0;
      
      const meta = JSON.parse(metadata);
      return meta.version || 0;
    } catch (error) {
      console.error('Error getting secret version:', error);
      return 0;
    }
  }

  /**
   * Schedule automatic rotation reminders
   * @returns {Promise<Array>} - List of secrets needing rotation
   */
  async getRotationReminders() {
    const secrets = [
      'claude_api_key',
      'openai_api_key',
      'encryption_key',
      'oauth_tokens'
    ];

    const reminders = [];
    
    for (const secret of secrets) {
      const status = await this.checkRotationStatus(secret);
      if (status.needsRotation || status.warning) {
        reminders.push({
          secret: secret,
          status: status,
          priority: status.needsRotation ? 'high' : 'medium'
        });

        // Send warning notification if close to rotation
        if (status.warning && status.daysUntilRotation <= 7) {
          await notificationService.showRotationWarning(secret, status.daysUntilRotation);
        }
      }
    }

    return reminders;
  }

  /**
   * Clean up old versions of secrets (keep last 2 versions)
   * @param {string} keyName - Name of the secret
   */
  async cleanupOldVersions(keyName) {
    try {
      // Remove any fallback storage in production
      if (!__DEV__) {
        await AsyncStorage.removeItem(`fallback_${keyName}`);
      }
      
      // Remove legacy plain storage
      await AsyncStorage.removeItem(keyName);
    } catch (error) {
      console.error('Error cleaning up old versions:', error);
    }
  }

  /**
   * Validate secret format and strength
   * @param {string} secret - Secret to validate
   * @param {string} type - Type of secret (api_key, password, etc.)
   * @returns {Object} - Validation result
   */
  validateSecret(secret, type = 'api_key') {
    const validation = {
      valid: false,
      strength: 'weak',
      errors: []
    };

    if (!secret || typeof secret !== 'string') {
      validation.errors.push('Secret must be a non-empty string');
      return validation;
    }

    switch (type) {
      case 'api_key':
        if (secret.length < 20) {
          validation.errors.push('API key too short');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(secret)) {
          validation.errors.push('API key contains invalid characters');
        }
        break;
      
      case 'password':
        if (secret.length < 8) {
          validation.errors.push('Password must be at least 8 characters');
        }
        if (!/[A-Z]/.test(secret)) {
          validation.errors.push('Password must contain uppercase letters');
        }
        if (!/[a-z]/.test(secret)) {
          validation.errors.push('Password must contain lowercase letters');
        }
        if (!/[0-9]/.test(secret)) {
          validation.errors.push('Password must contain numbers');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret)) {
          validation.errors.push('Password must contain special characters');
        }
        break;
    }

    validation.valid = validation.errors.length === 0;
    
    if (validation.valid) {
      validation.strength = 'strong';
    } else if (type === 'password' && secret.length >= 8) {
      validation.strength = 'medium';
    }

    return validation;
  }

  /**
   * Get security audit report
   * @returns {Promise<Object>} - Security audit results
   */
  async getSecurityAudit() {
    const secrets = ['claude_api_key', 'openai_api_key', 'encryption_key'];
    const audit = {
      timestamp: new Date().toISOString(),
      secrets: [],
      recommendations: []
    };

    for (const secret of secrets) {
      const status = await this.checkRotationStatus(secret);
      audit.secrets.push({
        name: secret,
        status: status,
        risk: status.needsRotation ? 'high' : status.warning ? 'medium' : 'low'
      });

      if (status.needsRotation) {
        audit.recommendations.push(`Rotate ${secret} immediately`);
      } else if (status.warning) {
        audit.recommendations.push(`Schedule rotation for ${secret} within ${status.daysUntilRotation} days`);
      }
    }

    return audit;
  }

  /**
   * Emergency wipe all secrets
   * @returns {Promise<boolean>} - Success status
   */
  async emergencyWipe() {
    try {
      const secrets = ['claude_api_key', 'openai_api_key', 'encryption_key'];
      
      for (const secret of secrets) {
        await AsyncStorage.removeItem(`secure_${secret}`);
        await AsyncStorage.removeItem(`secret_meta_${secret}`);
        await AsyncStorage.removeItem(`fallback_${secret}`);
        await AsyncStorage.removeItem(secret);
      }

      if (__DEV__) console.log('🚨 Emergency wipe completed');
      return true;
    } catch (error) {
      console.error('Error during emergency wipe:', error);
      return false;
    }
  }
}

export default new SecurityService();