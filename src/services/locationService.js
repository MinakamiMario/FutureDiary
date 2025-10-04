/**
 * LEGACY LOCATION SERVICE - DEPRECATED
 * 
 * This service has been consolidated into ActivityTrackingService.
 * The new service is located in /src/services/data/ActivityTrackingService.js
 * 
 * This file now acts as a proxy to maintain backwards compatibility.
 * For new code, import directly from './data/ActivityTrackingService'
 * 
 * ✅ BEFORE: locationService.js (404 lines)
 * ✅ AFTER: Clean ActivityTrackingService with unified tracking
 */

import ActivityTrackingService from './data/ActivityTrackingService';

// Create wrapper for legacy API
class LegacyLocationService {
  constructor() {
    this.trackingService = ActivityTrackingService;
  }

  async trackLocation(location) {
    return this.trackingService.trackLocation(location);
  }

  async getLocations(startTimestamp, endTimestamp) {
    return this.trackingService.getLocations(startTimestamp, endTimestamp);
  }

  async getVisitedPlaces(startTimestamp, endTimestamp) {
    return this.trackingService.getVisitedPlaces(startTimestamp, endTimestamp);
  }

  async getRecentLocations(limit = 10) {
    return this.trackingService.getRecentLocations(limit);
  }

  async batchTrackLocations(locations) {
    return this.trackingService.batchTrackLocations(locations);
  }

  // Legacy methods that might not exist in new service
  async initializePlatform() {
    // Initialize platform detection through new service
    return this.trackingService.initializePlatform();
  }

  async getCurrentPositionAsync(options = {}) {
    // Get current position through new service
    return this.trackingService.location.getCurrentPositionAsync(options);
  }

  async hasServicesEnabledAsync() {
    // Check if location services are enabled
    try {
      await this.getCurrentPositionAsync();
      return true;
    } catch (error) {
      return false;
    }
  }

  async requestForegroundPermissionsAsync() {
    // Request location permissions
    try {
      await this.getCurrentPositionAsync();
      return { status: 'granted' };
    } catch (error) {
      return { status: 'denied' };
    }
  }

  async requestBackgroundPermissionsAsync() {
    // Request background location permissions
    try {
      await this.getCurrentPositionAsync({ enableHighAccuracy: true });
      return { status: 'granted' };
    } catch (error) {
      return { status: 'denied' };
    }
  }

  async startLocationUpdatesAsync(taskName, options = {}) {
    // Start location tracking through new service
    return this.trackingService.location.startLocationTracking(options);
  }

  async stopLocationUpdatesAsync(taskName) {
    // Stop location tracking through new service
    return this.trackingService.location.stopLocationTracking();
  }

  async getCurrentLocation() {
    // Get current location through new service
    return this.getCurrentPositionAsync();
  }

  async requestLocationPermissions() {
    // Request all location permissions
    const foreground = await this.requestForegroundPermissionsAsync();
    const background = await this.requestBackgroundPermissionsAsync();
    
    return {
      foreground: foreground.status,
      background: background.status,
      all: foreground.status === 'granted' && background.status === 'granted'
    };
  }

  async checkLocationServicesAvailability() {
    // Check if location services are available
    try {
      await this.getCurrentPositionAsync();
      return { available: true, message: 'Location services available' };
    } catch (error) {
      return { available: false, message: error.message };
    }
  }

  async getPlaceName(coords) {
    // Get place name through new service
    const placeInfo = await this.trackingService.location.getPlaceInfo(coords);
    return placeInfo.name;
  }

  // Internal state management for backwards compatibility
  getLastLocation() {
    return this.trackingService.location.lastLocation;
  }

  isTracking() {
    return this.trackingService.location.isTracking;
  }

  getPlatformInfo() {
    return this.trackingService.platformInfo;
  }
}

// Export singleton instance for backwards compatibility
export default new LegacyLocationService();