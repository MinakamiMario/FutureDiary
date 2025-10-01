// src/utils/platformDetector.js
// Platform detection utility to distinguish between emulator and real device

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

class PlatformDetector {
  constructor() {
    this.isEmulator = null;
    this.deviceType = null;
  }

  /**
   * Detect if running on emulator vs real device
   */
  async detectPlatform() {
    if (this.isEmulator !== null) {
      return {
        isEmulator: this.isEmulator,
        deviceType: this.deviceType,
        shouldUseMockData: this.isEmulator
      };
    }

    try {
      // Check if running on emulator
      this.isEmulator = await DeviceInfo.isEmulator();
      
      // Get device type info
      const deviceType = await DeviceInfo.getDeviceType();
      const brand = await DeviceInfo.getBrand();
      const model = await DeviceInfo.getModel();
      
      this.deviceType = {
        type: deviceType,
        brand: brand,
        model: model,
        platform: Platform.OS
      };

      const shouldUseMockData = this.isEmulator;

      if (__DEV__) {
        console.log('Platform Detection:', {
          isEmulator: this.isEmulator,
          deviceType: this.deviceType,
          shouldUseMockData: shouldUseMockData
        });
      }

      return {
        isEmulator: this.isEmulator,
        deviceType: this.deviceType,
        shouldUseMockData: shouldUseMockData
      };
    } catch (error) {
      console.warn('Platform detection failed, defaulting to real device:', error);
      
      // Default to real device if detection fails
      this.isEmulator = false;
      this.deviceType = {
        type: 'unknown',
        brand: 'unknown',
        model: 'unknown',
        platform: Platform.OS
      };

      return {
        isEmulator: false,
        deviceType: this.deviceType,
        shouldUseMockData: false
      };
    }
  }

  /**
   * Get current platform info (cached)
   */
  getCurrentPlatform() {
    return {
      isEmulator: this.isEmulator,
      deviceType: this.deviceType,
      shouldUseMockData: this.isEmulator
    };
  }

  /**
   * Force real device mode (for testing)
   */
  forceRealDeviceMode() {
    this.isEmulator = false;
    console.log('Forced real device mode - no mock data will be used');
  }

  /**
   * Force emulator mode (for testing)
   */
  forceEmulatorMode() {
    this.isEmulator = true;
    console.log('Forced emulator mode - mock data will be used');
  }
}

export default new PlatformDetector();