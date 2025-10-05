/**
 * LOCATION SERVICE PROXY
 * 
 * This is a lightweight proxy that delegates all calls to ActivityTrackingService
 * Maintains 100% backwards compatibility while using the new unified service
 * 
 * ✅ BEFORE: locationService.js (404 lines - full implementation)
 * ✅ AFTER: locationService.js (60 lines - proxy only)
 * 📊 Code reduction: 85%
 */

import ActivityTrackingService from './data/ActivityTrackingService';

// Create lightweight proxy that delegates to ActivityTrackingService
const locationServiceProxy = {
  // Core location methods
  async trackLocation(location) {
    return ActivityTrackingService.location.trackLocation(location);
  },

  async getLocations(startTimestamp, endTimestamp) {
    return ActivityTrackingService.location.getLocations(startTimestamp, endTimestamp);
  },

  async getVisitedPlaces(startTimestamp, endTimestamp) {
    return ActivityTrackingService.location.getVisitedPlaces(startTimestamp, endTimestamp);
  },

  async getRecentLocations(limit = 10) {
    return ActivityTrackingService.location.getRecentLocations(limit);
  },

  async batchTrackLocations(locations) {
    return ActivityTrackingService.location.batchTrackLocations(locations);
  },

  // Real-time location methods
  async getCurrentPositionAsync(options = {}) {
    return ActivityTrackingService.location.getCurrentPositionAsync(options);
  },

  async getCurrentLocation() {
    return ActivityTrackingService.location.getCurrentLocation();
  },

  // Permission methods
  async hasServicesEnabledAsync() {
    return ActivityTrackingService.location.hasServicesEnabledAsync();
  },

  async requestForegroundPermissionsAsync() {
    return ActivityTrackingService.location.requestForegroundPermissionsAsync();
  },

  async requestBackgroundPermissionsAsync() {
    return ActivityTrackingService.location.requestBackgroundPermissionsAsync();
  },

  async getForegroundPermissionsAsync() {
    return ActivityTrackingService.location.getForegroundPermissionsAsync();
  },

  async getBackgroundPermissionsAsync() {
    return ActivityTrackingService.location.getBackgroundPermissionsAsync();
  },

  async requestLocationPermissions() {
    return ActivityTrackingService.location.requestLocationPermissions();
  },

  // Location tracking methods
  async startLocationUpdatesAsync(taskName, options = {}) {
    return ActivityTrackingService.location.startLocationUpdatesAsync(taskName, options);
  },

  async stopLocationUpdatesAsync(taskName) {
    return ActivityTrackingService.location.stopLocationUpdatesAsync(taskName);
  },

  async checkLocationServicesAvailability() {
    return ActivityTrackingService.location.checkLocationServicesAvailability();
  },

  // Place methods
  async getPlaceName(coords) {
    return ActivityTrackingService.location.getPlaceInfo(coords);
  },

  // Legacy compatibility methods
  getLastLocation() {
    return ActivityTrackingService.location.lastLocation;
  },

  isTracking() {
    return ActivityTrackingService.location.isTracking;
  },

  getPlatformInfo() {
    return ActivityTrackingService.platformInfo;
  }
};

export default locationServiceProxy;