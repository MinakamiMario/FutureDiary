/**
 * UNIFIED CONFIG SERVICE
 * 
 * Centralized configuration management for MinakamiApp
 * Handles app settings, user preferences, and environment configuration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import errorHandler from '../errorLogger';

class ConfigService {
  constructor() {
    this.config = {};
    this.defaultConfig = {
      // App Configuration
      app: {
        version: '2.0.0',
        environment: __DEV__ ? 'development' : 'production',
        platform: Platform.OS,
        language: 'nl',
        theme: 'light'
      },
      
      // Health Data Configuration
      health: {
        enableHealthConnect: true,
        autoSyncHealth: true,
        healthSyncInterval: 300000, // 5 minutes
        stepGoal: 10000,
        calorieGoal: 2000,
        activeMinutesGoal: 30
      },
      
      // AI Configuration
      ai: {
        preferredModel: 'chatgpt',
        enableNarratives: true,
        narrativeStyle: 'casual',
        narrativeLength: 'medium',
        autoGenerateNarratives: true
      },
      
      // Strava Configuration
      strava: {
        enableSync: false,
        autoSync: true,
        syncInterval: 3600000, // 1 hour
        includePrivateActivities: false
      },
      
      // Notification Configuration
      notifications: {
        enablePush: true,
        enableToast: true,
        healthReminders: true,
        activityNotifications: true,
        aiNarrativeNotifications: true,
        stravaNotifications: true
      },
      
      // Performance Configuration
      performance: {
        enableCaching: true,
        cacheExpiry: 300000, // 5 minutes
        enableAnalytics: true,
        logLevel: __DEV__ ? 'debug' : 'error'
      },
      
      // Security Configuration
      security: {
        enableEncryption: true,
        keyRotationInterval: 2592000000, // 30 days
        enableBiometric: false,
        sessionTimeout: 1800000 // 30 minutes
      }
    };
    
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('app_config');
      
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        this.config = this.mergeConfig(this.defaultConfig, parsedConfig);
      } else {
        this.config = { ...this.defaultConfig };
      }

      this.isInitialized = true;
    } catch (error) {
      errorHandler.logError('Failed to initialize config service', error);
      this.config = { ...this.defaultConfig };
      this.isInitialized = true;
    }
  }

  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };
    
    for (const key in userConfig) {
      if (typeof userConfig[key] === 'object' && userConfig[key] !== null) {
        merged[key] = { ...defaultConfig[key], ...userConfig[key] };
      } else {
        merged[key] = userConfig[key];
      }
    }
    
    return merged;
  }

  async get(path, defaultValue = null) {
    await this.initialize();
    
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  async set(path, value) {
    await this.initialize();
    
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = this.config;
    
    // Navigate to the parent object
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Set the value
    current[lastKey] = value;
    
    // Save to storage
    await this.save();
  }

  async save() {
    try {
      await AsyncStorage.setItem('app_config', JSON.stringify(this.config));
    } catch (error) {
      errorHandler.logError('Failed to save configuration', error);
      throw error;
    }
  }

  async reset(section = null) {
    await this.initialize();
    
    if (section) {
      this.config[section] = { ...this.defaultConfig[section] };
    } else {
      this.config = { ...this.defaultConfig };
    }
    
    await this.save();
  }

  // Convenience methods for common configurations
  async getAppConfig() {
    return this.get('app');
  }

  async getHealthConfig() {
    return this.get('health');
  }

  async getAIConfig() {
    return this.get('ai');
  }

  async getStravaConfig() {
    return this.get('strava');
  }

  async getNotificationConfig() {
    return this.get('notifications');
  }

  async getPerformanceConfig() {
    return this.get('performance');
  }

  async getSecurityConfig() {
    return this.get('security');
  }

  // Theme and appearance
  async getTheme() {
    return this.get('app.theme', 'light');
  }

  async setTheme(theme) {
    return this.set('app.theme', theme);
  }

  async getLanguage() {
    return this.get('app.language', 'nl');
  }

  async setLanguage(language) {
    return this.set('app.language', language);
  }

  // Health goals
  async getStepGoal() {
    return this.get('health.stepGoal', 10000);
  }

  async setStepGoal(goal) {
    return this.set('health.stepGoal', goal);
  }

  async getCalorieGoal() {
    return this.get('health.calorieGoal', 2000);
  }

  async setCalorieGoal(goal) {
    return this.set('health.calorieGoal', goal);
  }

  // AI preferences
  async getPreferredAIModel() {
    return this.get('ai.preferredModel', 'chatgpt');
  }

  async setPreferredAIModel(model) {
    return this.set('ai.preferredModel', model);
  }

  async getNarrativeStyle() {
    return this.get('ai.narrativeStyle', 'casual');
  }

  async setNarrativeStyle(style) {
    return this.set('ai.narrativeStyle', style);
  }

  // Notification preferences
  async areNotificationsEnabled() {
    return this.get('notifications.enablePush', true);
  }

  async setNotificationsEnabled(enabled) {
    return this.set('notifications.enablePush', enabled);
  }

  // Development and debugging
  async isDevMode() {
    return __DEV__;
  }

  async getLogLevel() {
    return this.get('performance.logLevel', __DEV__ ? 'debug' : 'error');
  }

  // Feature flags
  async isFeatureEnabled(feature) {
    const featureFlags = await this.get('featureFlags', {});
    return featureFlags[feature] ?? true; // Default to enabled
  }

  async setFeatureFlag(feature, enabled) {
    const currentFlags = await this.get('featureFlags', {});
    currentFlags[feature] = enabled;
    return this.set('featureFlags', currentFlags);
  }

  // Export/Import configuration
  async exportConfig() {
    await this.initialize();
    return { ...this.config };
  }

  async importConfig(newConfig) {
    this.config = this.mergeConfig(this.defaultConfig, newConfig);
    await this.save();
  }

  // Configuration validation
  isValidConfig(config) {
    try {
      // Basic validation - ensure required sections exist
      const requiredSections = ['app', 'health', 'ai', 'notifications'];
      
      for (const section of requiredSections) {
        if (!config[section] || typeof config[section] !== 'object') {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }

  // Get full configuration for debugging
  async getFullConfig() {
    await this.initialize();
    return {
      config: this.config,
      defaultConfig: this.defaultConfig,
      isInitialized: this.isInitialized
    };
  }
}

// Export singleton instance
const configService = new ConfigService();
export default configService;