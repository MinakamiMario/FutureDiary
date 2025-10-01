// src/services/appUsageService.js
import { AppState, Platform } from 'react-native';
import { BaseService } from './BaseService';
import databaseService from './database';
import errorHandler from './errorLogger';
// Mock constants for React Native without Expo
const MockConstants = {
  executionEnvironment: 'standalone',
  manifest: {
    name: 'MinakamiApp',
    version: '1.0.0'
  }
};

const Constants = MockConstants;
import AsyncStorage from '@react-native-async-storage/async-storage';

// Native packages for production APK builds
let UsageStats = null, DeviceActivity = null;

// Enable native packages for production builds
if (Platform.OS === 'android') {
  try {
    UsageStats = require('react-native-usage-stats');
    console.info('✅ React Native Usage Stats loaded successfully');
  } catch (error) {
    console.warn('⚠️ Usage Stats not available:', error.message);
    if (__DEV__) console.info('Using demo app usage data in development');
  }
}

if (Platform.OS === 'ios') {
  try {
    DeviceActivity = require('react-native-device-activity');
    console.info('✅ React Native Device Activity loaded successfully');
  } catch (error) {
    console.warn('⚠️ Device Activity not available:', error.message);
    if (__DEV__) console.info('Using demo app usage data in development');
  }
}

// Utility function to detect if running in Expo Go
const isExpoGo = () => {
  return Constants.executionEnvironment === 'storeClient';
};

class AppUsageService extends BaseService {
  constructor() {
    super('AppUsageService');
    this.isTrackingAvailable = this.checkTrackingAvailability();
    this.currentSession = null;
    this.sessionStartTime = null;
    this.appStateSubscription = null;
    this.dailyUsageCache = new Map();
    
    // Production detection for native package usage
    const isProductionBuild = typeof __DEV__ === 'undefined' || __DEV__ === false;
    this.isDemoMode = !this.hasNativePackages() && !isProductionBuild ? false : !isProductionBuild;
    
    if (isProductionBuild && this.hasNativePackages()) {
      console.log('AppUsageService: Using native usage tracking');
    } else if (isProductionBuild) {
      console.warn('AppUsageService: Native packages not available, will use fallback tracking');
    } else {
      console.log('AppUsageService: Using demo mode in development');
    }
  }

  hasNativePackages() {
    return (Platform.OS === 'android' && UsageStats) || (Platform.OS === 'ios' && DeviceActivity);
  }

  checkTrackingAvailability() {
    if (isExpoGo()) {
      return __DEV__; // Available in development for demo purposes
    }
    
    // Assume Android mobile app
    if (UsageStats) {
      return true;
    }
    
    return false;
  }

  async onInitialize() {
    if (!this.isTrackingAvailable) {
      await this.info('App usage tracking niet beschikbaar in huidige omgeving');
      return;
    }

    try {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        await this.info('App usage service running in demo mode (development emulator)');
        await this.initializeDemoMode();
      } else {
        // Real device - use real usage stats
        await this.initializeAndroidUsageStats();
      }
      
      // Start session tracking
      await this.startSessionTracking();
      
      await this.info('App usage service succesvol geïnitialiseerd');
    } catch (error) {
      await this.error('Fout bij initialiseren app usage service', error);
    }
  }

  async initializeDemoMode() {
    // Generate some demo usage data for testing
    await this.generateDemoUsageData();
  }

  async initializeAndroidUsageStats() {
    try {
      // Request usage access permission
      const hasPermission = await UsageStats.isUsageAccessPermissionGranted();
      if (!hasPermission) {
        // Open settings to grant permission
        await UsageStats.openUsageAccessSettings();
        return { success: false, message: 'Usage access permission vereist' };
      }
      
      return { success: true, message: 'Android Usage Stats geïnitialiseerd' };
    } catch (error) {
      throw new Error('Android Usage Stats initialisatie mislukt: ' + error.message);
    }
  }

  async initializeIOSDeviceActivity() {
    try {
      // iOS Screen Time API requires special entitlements
      // This would need to be configured in a production build
      return { success: true, message: 'iOS Device Activity geïnitialiseerd' };
    } catch (error) {
      throw new Error('iOS Device Activity initialisatie mislukt: ' + error.message);
    }
  }

  async startSessionTracking() {
    // Track app sessions (when app goes to foreground/background)
    this.sessionStartTime = Date.now();
    
    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground
        this.sessionStartTime = Date.now();
        await this.info('App session gestart');
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background
        if (this.sessionStartTime) {
          const sessionDuration = Date.now() - this.sessionStartTime;
          await this.recordAppSession('Minakami', sessionDuration);
          await this.info(`App session beëindigd: ${Math.round(sessionDuration / 1000)}s`);
        }
      }
    });
  }

  async recordAppSession(appName, duration) {
    try {
      const sessionData = {
        app_name: appName,
        package_name: 'com.minakami.app',
        duration: duration,
        timestamp: Date.now(),
        session_date: new Date().toISOString().split('T')[0]
      };

      await databaseService.saveAppUsage(sessionData);
      await this.updateDailyUsageCache(appName, duration);
      
    } catch (error) {
      await this.error('Fout bij opslaan app sessie', error);
    }
  }

  async updateDailyUsageCache(appName, duration) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${today}-${appName}`;
    
    const currentUsage = this.dailyUsageCache.get(cacheKey) || 0;
    this.dailyUsageCache.set(cacheKey, currentUsage + duration);
  }

  // Import historical app usage data
  async importHistoricalUsageData(daysBack = 30) {
    if (!this.isTrackingAvailable) {
      return { success: false, message: 'App usage tracking niet beschikbaar' };
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      let usageData = [];

      if (isExpoGo() && __DEV__) {
        // Generate demo usage data
        usageData = await this.generateHistoricalDemoData(daysBack);
      } else {
        // Assume Android mobile app
        usageData = await this.getAndroidUsageStats(startDate, endDate);
      }

      // Save to database
      let importedCount = 0;
      for (const appData of usageData) {
        await databaseService.saveAppUsage({
          app_name: appData.appName,
          package_name: appData.packageName,
          category: appData.category,
          duration: appData.totalTime,
          timestamp: appData.date,
          session_date: new Date(appData.date).toISOString().split('T')[0],
          source: isExpoGo() ? 'demo_usage' : 'android_usage_stats'
        });
        importedCount++;
      }

      await this.info(`${importedCount} dagen aan app usage data geïmporteerd`);
      return {
        success: true,
        imported: importedCount,
        message: `${importedCount} dagen aan app usage data geïmporteerd${isExpoGo() ? ' (demo mode)' : ''}`
      };

    } catch (error) {
      await this.error('Fout bij importeren historische app usage data', error);
      return { success: false, message: error.message };
    }
  }

  async generateHistoricalDemoData(daysBack = 30) {
    const demoApps = [
      { name: 'WhatsApp', package: 'com.whatsapp', category: 'Social', avgMinutes: 45 },
      { name: 'Instagram', package: 'com.instagram.android', category: 'Social', avgMinutes: 35 },
      { name: 'Chrome', package: 'com.android.chrome', category: 'Browser', avgMinutes: 60 },
      { name: 'YouTube', package: 'com.google.android.youtube', category: 'Entertainment', avgMinutes: 40 },
      { name: 'Gmail', package: 'com.google.android.gm', category: 'Productivity', avgMinutes: 15 },
      { name: 'Maps', package: 'com.google.android.apps.maps', category: 'Navigation', avgMinutes: 12 },
      { name: 'Spotify', package: 'com.spotify.music', category: 'Music', avgMinutes: 50 },
      { name: 'Settings', package: 'com.android.settings', category: 'System', avgMinutes: 8 },
      { name: 'Camera', package: 'com.android.camera2', category: 'Photography', avgMinutes: 10 },
      { name: 'Messages', package: 'com.google.android.apps.messaging', category: 'Communication', avgMinutes: 20 }
    ];

    const usageData = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (let day = 0; day < daysBack; day++) {
      const dayTimestamp = now - (day * oneDay);
      const isWeekend = new Date(dayTimestamp).getDay() === 0 || new Date(dayTimestamp).getDay() === 6;
      
      for (const app of demoApps) {
        // Weekend usage patterns (more entertainment, less productivity)
        let usageMultiplier = 1;
        if (isWeekend) {
          if (app.category === 'Entertainment' || app.category === 'Social') {
            usageMultiplier = 1.5;
          } else if (app.category === 'Productivity') {
            usageMultiplier = 0.3;
          }
        }
        
        // Add some randomness
        const randomFactor = 0.5 + Math.random(); // 0.5 to 1.5
        const totalMinutes = Math.floor(app.avgMinutes * usageMultiplier * randomFactor);
        const totalTime = totalMinutes * 60 * 1000; // Convert to milliseconds
        
        if (totalTime > 0) {
          usageData.push({
            appName: app.name,
            packageName: app.package,
            category: app.category,
            totalTime: totalTime,
            date: dayTimestamp
          });
        }
      }
    }

    return usageData;
  }

  async getAndroidUsageStats(startDate, endDate) {
    try {
      const usageStats = await UsageStats.queryUsageStats(
        startDate.getTime(),
        endDate.getTime()
      );
      
      return usageStats.map(stat => ({
        appName: stat.packageName.split('.').pop() || stat.packageName,
        packageName: stat.packageName,
        totalTime: stat.totalTimeInForeground,
        date: stat.firstTimeStamp
      }));
    } catch (error) {
      console.error('Error getting Android usage stats:', error);
      return [];
    }
  }

  async getIOSUsageStats(startDate, endDate) {
    try {
      // iOS Screen Time API would be used here
      // This requires special entitlements and is more restricted
      const usageStats = await DeviceActivity.queryUsageStats(
        startDate.getTime(),
        endDate.getTime()
      );
      
      return usageStats;
    } catch (error) {
      console.error('Error getting iOS usage stats:', error);
      return [];
    }
  }

  // Get today's app usage for immediate display
  async getTodayUsage() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (isExpoGo() && __DEV__) {
        // Generate demo today usage
        return await this.generateTodayDemoUsage();
      }
      
      // Get from database
      const todayUsage = await databaseService.getAppUsageByDate(today);
      return todayUsage;
      
    } catch (error) {
      await this.error('Fout bij ophalen vandaag app usage', error);
      return [];
    }
  }

  async generateTodayDemoUsage() {
    const currentHour = new Date().getHours();
    const usageProgression = Math.min(currentHour / 24, 1); // 0 to 1 based on time of day
    
    const demoUsage = [
      { appName: 'WhatsApp', totalTime: Math.floor(45 * 60 * 1000 * usageProgression), category: 'Social' },
      { appName: 'Chrome', totalTime: Math.floor(60 * 60 * 1000 * usageProgression), category: 'Browser' },
      { appName: 'Instagram', totalTime: Math.floor(35 * 60 * 1000 * usageProgression), category: 'Social' },
      { appName: 'YouTube', totalTime: Math.floor(40 * 60 * 1000 * usageProgression), category: 'Entertainment' },
      { appName: 'Spotify', totalTime: Math.floor(50 * 60 * 1000 * usageProgression), category: 'Music' }
    ];
    
    return demoUsage.filter(app => app.totalTime > 0);
  }

  // Get app usage trends and analytics
  async getUsageTrends(daysBack = 7) {
    try {
      // Add null safety and prevent recursion
      let trends = [];
      try {
        trends = await databaseService.getAppUsageTrends(daysBack);
        if (!trends || !Array.isArray(trends)) {
          trends = [];
        }
      } catch (dbError) {
        if (__DEV__) console.warn('Database error getting usage trends, returning empty result:', dbError.message);
        trends = [];
      }
      
      // Calculate analytics with safe defaults
      const analytics = {
        totalScreenTime: 0,
        topApps: [],
        categories: new Map(),
        averageDailyUsage: 0,
        weekendVsWeekday: { weekend: 0, weekday: 0 },
        trends: trends
      };
      
      // Process trends data safely
      if (trends && Array.isArray(trends)) {
        trends.forEach(day => {
          if (day && typeof day === 'object') {
            analytics.totalScreenTime += day.totalTime || day.total_duration || 0;
            
            // Categorize by weekend/weekday
            const dayOfWeek = new Date(day.date || day.session_date).getDay();
            const dayUsage = day.totalTime || day.total_duration || 0;
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              analytics.weekendVsWeekday.weekend += dayUsage;
            } else {
              analytics.weekendVsWeekday.weekday += dayUsage;
            }
          }
        });
      }
      
      analytics.averageDailyUsage = daysBack > 0 ? analytics.totalScreenTime / daysBack : 0;
      
      return analytics;
      
    } catch (error) {
      // Prevent recursive error calls by using console instead of this.error
      console.error('Error getting usage trends:', error.message || error);
      return {
        totalScreenTime: 0,
        topApps: [],
        categories: new Map(),
        averageDailyUsage: 0,
        weekendVsWeekday: { weekend: 0, weekday: 0 },
        trends: []
      };
    }
  }

  // Get available data sources info
  async getAvailableDataSources() {
    return {
      platform: 'android', // Assume Android mobile app
      trackingAvailable: this.isTrackingAvailable,
      canImportHistorical: this.isTrackingAvailable,
      dataTypes: ['screen_time', 'app_sessions', 'usage_patterns'],
      source: isExpoGo() && __DEV__ ? 'Demo App Usage (Expo Go)' : 'Android Usage Stats',
      reason: !this.isTrackingAvailable ? (
        isExpoGo() ? 'Install APK for real usage data' : 'Usage tracking not available'
      ) : null
    };
  }

  // Generate demo usage data for initial testing
  async generateDemoUsageData() {
    try {
      const demoData = await this.generateHistoricalDemoData(7);
      
      for (const appData of demoData) {
        await databaseService.saveAppUsage({
          app_name: appData.appName,
          package_name: appData.packageName,
          category: appData.category,
          duration: appData.totalTime,
          timestamp: appData.date,
          session_date: new Date(appData.date).toISOString().split('T')[0],
          source: 'demo_usage'
        });
      }
      
      await this.info('Demo app usage data gegenereerd');
    } catch (error) {
      await this.error('Fout bij genereren demo usage data', error);
    }
  }

  async cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.dailyUsageCache.clear();
  }
}

// Singleton instance
const appUsageService = new AppUsageService();
export default appUsageService;