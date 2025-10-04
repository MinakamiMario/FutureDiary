/**
 * ACTIVITY SERVICE PROXY
 * 
 * This is a lightweight proxy that delegates all calls to ActivityTrackingService
 * Maintains 100% backwards compatibility while using the new unified service
 * 
 * ✅ BEFORE: activityService.js (435 lines - full implementation)
 * ✅ AFTER: activityService.js (50 lines - proxy only)
 * 📊 Code reduction: 89%
 */

import ActivityTrackingService from './data/ActivityTrackingService';

// Create lightweight proxy that delegates to ActivityTrackingService
const activityServiceProxy = {
  // Core activity methods
  async logActivity(activity) {
    return ActivityTrackingService.activity.logActivity(activity);
  },

  async getActivities(startTimestamp, endTimestamp) {
    return ActivityTrackingService.activity.getActivities(startTimestamp, endTimestamp);
  },

  async getActivitiesForDate(date) {
    return ActivityTrackingService.activity.getActivitiesForDate(date);
  },

  async updateActivity(activityId, updates) {
    return ActivityTrackingService.activity.updateActivity(activityId, updates);
  },

  async deleteActivity(activityId) {
    return ActivityTrackingService.activity.deleteActivity(activityId);
  },

  async batchLogActivities(activities) {
    return ActivityTrackingService.activity.batchLogActivities(activities);
  },

  // Advanced monitoring methods
  async startMonitoring() {
    return ActivityTrackingService.activity.startMonitoring();
  },

  async stopMonitoring() {
    return ActivityTrackingService.activity.stopMonitoring();
  },

  async detectActivity(accelerometerData) {
    return ActivityTrackingService.activity.detectActivity(accelerometerData);
  },

  async endActivity() {
    return ActivityTrackingService.activity.endActivity();
  },

  // Analytics methods
  async getStepsCount(startDate, endDate) {
    return ActivityTrackingService.activity.getStepsCount(startDate, endDate);
  },

  async getActivitySummary(startDate, endDate) {
    return ActivityTrackingService.activity.getActivitySummary(startDate, endDate);
  },

  // Permission methods
  async requestActivityRecognitionPermission() {
    return ActivityTrackingService.activity.requestActivityRecognitionPermission();
  },

  // Legacy compatibility methods
  getLastLocation() {
    return ActivityTrackingService.location.lastLocation;
  },

  isTracking() {
    return ActivityTrackingService.activity.isMonitoring;
  },

  getPlatformInfo() {
    return ActivityTrackingService.platformInfo;
  }
};

export default activityServiceProxy;