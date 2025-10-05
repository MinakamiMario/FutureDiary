/**
 * LEGACY ACTIVITY SERVICE - DEPRECATED
 * 
 * This service has been consolidated into ActivityTrackingService.
 * The new service is located in /src/services/data/ActivityTrackingService.js
 * 
 * This file now acts as a proxy to maintain backwards compatibility.
 * For new code, import directly from './data/ActivityTrackingService'
 * 
 * ✅ BEFORE: activityService.js (435 lines)
 * ✅ AFTER: Clean ActivityTrackingService with unified tracking
 */

import ActivityTrackingService from './data/ActivityTrackingService';

// Create wrapper for legacy API
class LegacyActivityService {
  constructor() {
    this.trackingService = ActivityTrackingService;
  }

  async logActivity(activity) {
    return this.trackingService.logActivity(activity);
  }

  async getActivities(startTimestamp, endTimestamp) {
    return this.trackingService.getActivities(startTimestamp, endTimestamp);
  }

  async getActivitiesForDate(date) {
    return this.trackingService.getActivitiesForDate(date);
  }

  async updateActivity(activityId, updates) {
    return this.trackingService.updateActivity(activityId, updates);
  }

  async deleteActivity(activityId) {
    return this.trackingService.deleteActivity(activityId);
  }

  async batchLogActivities(activities) {
    return this.trackingService.batchLogActivities(activities);
  }

  // Legacy methods that might not exist in new service
  async requestActivityRecognitionPermission() {
    // This method was specific to the old implementation
    // Return success for backwards compatibility
    return true;
  }

  async startMonitoring() {
    // Start activity monitoring through new service
    return this.trackingService.activity.startActivityMonitoring();
  }

  async stopMonitoring() {
    // Stop activity monitoring through new service
    return this.trackingService.activity.stopActivityMonitoring();
  }

  async detectActivity(accelerometerData) {
    // This was an internal method - simulate basic detection
    const magnitude = Math.sqrt(
      accelerometerData.x * accelerometerData.x + 
      accelerometerData.y * accelerometerData.y + 
      accelerometerData.z * accelerometerData.z
    );
    
    if (magnitude > 12) return 'walking';
    if (magnitude > 15) return 'running';
    return 'stationary';
  }

  async endActivity() {
    // End current activity through new service
    return this.trackingService.activity.endActivity();
  }

  async getStepsCount(startDate, endDate) {
    // Get steps from activities in date range
    const activities = await this.getActivities(startDate.getTime(), endDate.getTime());
    return activities.reduce((total, activity) => total + (activity.steps || 0), 0);
  }

  async getActivitySummary(startDate, endDate) {
    // Generate summary from activities
    const activities = await this.getActivities(startDate.getTime(), endDate.getTime());
    
    return {
      totalActivities: activities.length,
      totalSteps: activities.reduce((total, activity) => total + (activity.steps || 0), 0),
      totalCalories: activities.reduce((total, activity) => total + (activity.calories || 0), 0),
      totalDistance: activities.reduce((total, activity) => total + (activity.distance || 0), 0),
      activeMinutes: activities.reduce((total, activity) => 
        total + (activity.duration ? Math.floor(activity.duration / 60000) : 0), 0
      ),
      byType: this.groupBy(activities, 'type')
    };
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }
}

// Export singleton instance for backwards compatibility
export default new LegacyActivityService();