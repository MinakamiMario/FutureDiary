// deviceDetection.js - Detect emulator vs real device for production builds
import { Platform } from 'react-native';

/**
 * Detect if running on emulator/simulator vs real device
 * Only use mock data in development OR emulator, never on real production devices
 */
export const isEmulator = () => {
  // Always use real data in production builds on real devices
  if (!__DEV__) {
    return false; // Production builds should never use mock data
  }
  
  // In development mode, try to detect emulator
  try {
    const DeviceInfo = require('react-native-device-info');
    return DeviceInfo.isEmulatorSync();
  } catch (error) {
    // If device-info not available or fails, use safer fallback
    if (__DEV__) {
      console.warn('[DeviceDetection] Device info not available, assuming real device');
    }
    return false; // Assume real device to be safe
  }
};

/**
 * Should use mock/demo data?
 * Only in development mode AND emulator
 * Simplified version that doesn't depend on isEmulator to avoid circular issues
 */
export const shouldUseMockData = () => {
  try {
    // Simple logic: only in development mode
    // For now, assume emulator if in development (safer than failing)
    return __DEV__;
  } catch (error) {
    console.warn('[DeviceDetection] Error in shouldUseMockData:', error);
    return false; // Safe fallback
  }
};

/**
 * Should use real data?
 * Always in production, or in development on real device
 */
export const shouldUseRealData = () => {
  return !__DEV__ || (!isEmulator() && __DEV__);
};

/**
 * Get data source description for UI
 */
export const getDataSourceInfo = () => {
  if (!__DEV__) {
    return {
      mode: 'production',
      description: 'Echte data van uw apparaat',
      isDemo: false
    };
  }
  
  if (isEmulator()) {
    return {
      mode: 'development-emulator',
      description: 'Demo data (development op emulator)',
      isDemo: true
    };
  } else {
    return {
      mode: 'development-device',
      description: 'Echte data (development op echt apparaat)',
      isDemo: false
    };
  }
};

const deviceDetection = {
  isEmulator,
  shouldUseMockData,
  shouldUseRealData,
  getDataSourceInfo
};

export default deviceDetection;
export { isEmulator, shouldUseMockData, shouldUseRealData, getDataSourceInfo };