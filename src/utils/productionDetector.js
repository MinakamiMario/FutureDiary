// src/utils/productionDetector.js
// Production device and build detection utility

import { Platform } from 'react-native';

/**
 * Determine if this is a production build
 * @returns {boolean} True if production build
 */
export const isProductionBuild = () => {
  return typeof __DEV__ === 'undefined' || __DEV__ === false;
};

/**
 * Determine if running on a real device (not emulator)
 * @returns {boolean} True if real device
 */
export const isRealDevice = () => {
  try {
    // Try to import device info
    const DeviceInfo = require('react-native-device-info');
    return !DeviceInfo.isEmulatorSync();
  } catch (error) {
    // Fallback detection methods
    if (Platform.OS === 'android') {
      // Android emulator detection heuristics
      return !Platform.isPad && Platform.Version >= 23;
    } else if (Platform.OS === 'ios') {
      // iOS simulator detection
      return Platform.isPad || Platform.isTVOS;
    }
    
    // Default to real device if can't determine
    return true;
  }
};

/**
 * Determine if should use native packages vs demo mode
 * @returns {boolean} True if should use demo mode
 */
export const shouldUseDemoMode = () => {
  const prodBuild = isProductionBuild();
  const realDevice = isRealDevice();
  
  // Use demo mode only in development or if on emulator
  return !prodBuild || !realDevice;
};

/**
 * Get device and build environment info
 * @returns {Object} Environment information
 */
export const getEnvironmentInfo = () => {
  return {
    isProduction: isProductionBuild(),
    isRealDevice: isRealDevice(),
    shouldUseDemoMode: shouldUseDemoMode(),
    platform: Platform.OS,
    platformVersion: Platform.Version,
    timestamp: new Date().toISOString()
  };
};

/**
 * Log environment information for debugging
 */
export const logEnvironmentInfo = () => {
  const info = getEnvironmentInfo();
  console.log('🔍 Environment Detection:', info);
  
  if (info.isProduction && info.isRealDevice) {
    console.log('✅ Production mode: Using native packages where available');
  } else if (info.isProduction && !info.isRealDevice) {
    console.log('⚠️ Production on emulator: Limited native functionality');
  } else {
    console.log('🧪 Development mode: Using demo data and fallbacks');
  }
  
  return info;
};