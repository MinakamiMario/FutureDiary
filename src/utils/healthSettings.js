// utils/healthSettings.js
// User settings for health data integration in AI narratives

import AsyncStorage from '@react-native-async-storage/async-storage';

// Default health settings
export const DEFAULT_HEALTH_SETTINGS = {
  includeHealthData: true,
  includeHeartRate: true,
  includeSleep: true,
  includeSteps: true,
  includeWorkouts: true,
  
  // Privacy settings
  showDetailedMetrics: true,
  enableHealthContext: true,
  
  // Thresholds for alerts (optional)
  heartRateThresholds: {
    enabled: false,
    restingMax: 100,
    activeMin: 120
  },
  
  sleepThresholds: {
    enabled: false,
    minimumHours: 6,
    maximumHours: 10
  },
  
  stepsThresholds: {
    enabled: false,
    dailyGoal: 10000,
    minimumDaily: 5000
  }
};

/**
 * Get user's health data settings
 */
export async function getHealthSettings() {
  try {
    const settingsString = await AsyncStorage.getItem('healthDataSettings');
    if (settingsString) {
      const settings = JSON.parse(settingsString);
      // Merge with defaults to ensure all settings exist
      return { ...DEFAULT_HEALTH_SETTINGS, ...settings };
    }
    return DEFAULT_HEALTH_SETTINGS;
  } catch (error) {
    console.error('Error getting health settings:', error);
    return DEFAULT_HEALTH_SETTINGS;
  }
}

/**
 * Save user's health data settings
 */
export async function saveHealthSettings(settings) {
  try {
    const settingsString = JSON.stringify(settings);
    await AsyncStorage.setItem('healthDataSettings', settingsString);
    return true;
  } catch (error) {
    console.error('Error saving health settings:', error);
    return false;
  }
}

/**
 * Update specific health setting
 */
export async function updateHealthSetting(key, value) {
  try {
    const currentSettings = await getHealthSettings();
    const updatedSettings = { ...currentSettings, [key]: value };
    return await saveHealthSettings(updatedSettings);
  } catch (error) {
    console.error('Error updating health setting:', error);
    return false;
  }
}

/**
 * Check if health data should be included in narratives
 */
export async function shouldIncludeHealthData() {
  try {
    const settings = await getHealthSettings();
    return settings.includeHealthData;
  } catch (error) {
    console.error('Error checking health data inclusion:', error);
    return false; // Default to false for privacy
  }
}

/**
 * Get enabled health data types
 */
export async function getEnabledHealthDataTypes() {
  try {
    const settings = await getHealthSettings();
    const enabledTypes = [];
    
    if (settings.includeHeartRate) enabledTypes.push('heart_rate');
    if (settings.includeSleep) enabledTypes.push('sleep');
    if (settings.includeSteps) enabledTypes.push('steps');
    if (settings.includeWorkouts) enabledTypes.push('workouts');
    
    return enabledTypes;
  } catch (error) {
    console.error('Error getting enabled health data types:', error);
    return [];
  }
}

/**
 * Check if detailed health metrics should be shown
 */
export async function shouldShowDetailedMetrics() {
  try {
    const settings = await getHealthSettings();
    return settings.showDetailedMetrics;
  } catch (error) {
    console.error('Error checking detailed metrics setting:', error);
    return true; // Default to true
  }
}

/**
 * Check if health context should be enabled in AI
 */
export async function shouldEnableHealthContext() {
  try {
    const settings = await getHealthSettings();
    return settings.enableHealthContext && settings.includeHealthData;
  } catch (error) {
    console.error('Error checking health context setting:', error);
    return false; // Default to false for privacy
  }
}

export default {
  getHealthSettings,
  saveHealthSettings,
  updateHealthSetting,
  shouldIncludeHealthData,
  getEnabledHealthDataTypes,
  shouldShowDetailedMetrics,
  shouldEnableHealthContext,
  DEFAULT_HEALTH_SETTINGS
};