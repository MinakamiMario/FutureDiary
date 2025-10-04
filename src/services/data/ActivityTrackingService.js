/**
 * UNIFIED ACTIVITY TRACKING SERVICE
 * 
 * Consolidates activity, location, and health data tracking:
 * - activityService.js
 * - locationService.js  
 * - healthDataService.js
 * 
 * Provides unified interface for all physical activity tracking
 */

import databaseService from '../../database';
import { healthDataService } from '../healthDataService';
import errorHandler from '../errorLogger';
import performanceService from '../performanceService';

class ActivityTrackingService {
  constructor() {
    this.isTracking = false;
    this.currentSession = null;
  }

  // ACTIVITY METHODS
  async logActivity(activityData) {
    const start = performanceService?.startTracking?.('activity.logActivity');

    try {
      const activity = {
        type: activityData.type,
        start_time: activityData.start_time || Date.now(),
        end_time: activityData.end_time,
        duration: activityData.duration,
        details: activityData.details,
        source: activityData.source || 'manual',
        metadata: activityData.metadata || {},
        calories: activityData.calories || 0,
        distance: activityData.distance || 0,
        sport_type: activityData.sport_type,
        strava_id: activityData.strava_id,
        heart_rate_avg: activityData.heart_rate_avg,
        heart_rate_max: activityData.heart_rate_max,
        elevation_gain: activityData.elevation_gain || 0
      };

      const result = await databaseService.addActivity(activity);
      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to log activity', error);
      throw error;
    }
  }

  async getActivitiesForDate(date) {
    return databaseService.getActivitiesForDate(date);
  }

  async getActivitiesForDateRange(startDate, endDate) {
    return databaseService.getActivitiesForDateRange(startDate, endDate);
  }

  // LOCATION METHODS
  async logLocation(locationData) {
    const start = performanceService?.startTracking?.('activity.logLocation');

    try {
      const location = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: locationData.timestamp || Date.now(),
        accuracy: locationData.accuracy,
        name: locationData.name,
        visit_count: locationData.visit_count || 1,
        last_visited: locationData.last_visited || locationData.timestamp || Date.now()
      };

      const result = await databaseService.addLocation(location);
      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to log location', error);
      throw error;
    }
  }

  async getLocationsForDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return databaseService.getLocationsForDateRange(startOfDay.getTime(), endOfDay.getTime());
  }

  // HEALTH DATA METHODS
  async getHealthStats(date = new Date()) {
    try {
      if (healthDataService) {
        return await healthDataService.getHealthStats();
      }
      return {
        daily: {
          steps: 0,
          calories: 0,
          distance: 0,
          activeMinutes: 0,
          heartRate: 0
        }
      };
    } catch (error) {
      errorHandler.logError('Failed to get health stats', error);
      return {
        daily: {
          steps: 0,
          calories: 0,
          distance: 0,
          activeMinutes: 0,
          heartRate: 0
        }
      };
    }
  }

  // UNIFIED TRACKING SESSION
  async startTrackingSession(sessionConfig = {}) {
    if (this.isTracking) {
      throw new Error('Already tracking a session');
    }

    this.currentSession = {
      id: Date.now().toString(),
      start_time: Date.now(),
      type: sessionConfig.type || 'general',
      activities: [],
      locations: [],
      health_snapshots: [],
      config: sessionConfig
    };

    this.isTracking = true;
    
    // Start periodic health data collection if requested
    if (sessionConfig.collectHealth) {
      this.startHealthCollection();
    }

    return this.currentSession.id;
  }

  async stopTrackingSession() {
    if (!this.isTracking || !this.currentSession) {
      throw new Error('No active tracking session');
    }

    this.currentSession.end_time = Date.now();
    this.currentSession.duration = this.currentSession.end_time - this.currentSession.start_time;

    // Save session data
    const sessionSummary = await this.saveTrackingSession();

    this.isTracking = false;
    this.currentSession = null;

    return sessionSummary;
  }

  async saveTrackingSession() {
    if (!this.currentSession) return null;

    try {
      // Create a comprehensive activity for the session
      const sessionActivity = {
        type: 'tracking_session',
        start_time: this.currentSession.start_time,
        end_time: this.currentSession.end_time,
        duration: this.currentSession.duration,
        details: `Tracking session: ${this.currentSession.type}`,
        source: 'tracking_session',
        metadata: {
          session_id: this.currentSession.id,
          activities_count: this.currentSession.activities.length,
          locations_count: this.currentSession.locations.length,
          health_snapshots: this.currentSession.health_snapshots.length,
          config: this.currentSession.config
        }
      };

      await this.logActivity(sessionActivity);

      return {
        session_id: this.currentSession.id,
        duration: this.currentSession.duration,
        activities: this.currentSession.activities.length,
        locations: this.currentSession.locations.length,
        health_data: this.currentSession.health_snapshots.length
      };
    } catch (error) {
      errorHandler.logError('Failed to save tracking session', error);
      throw error;
    }
  }

  async addToCurrentSession(type, data) {
    if (!this.isTracking || !this.currentSession) {
      throw new Error('No active tracking session');
    }

    const timestamp = Date.now();

    switch (type) {
      case 'activity':
        this.currentSession.activities.push({ ...data, timestamp });
        break;
      case 'location':
        this.currentSession.locations.push({ ...data, timestamp });
        break;
      case 'health':
        this.currentSession.health_snapshots.push({ ...data, timestamp });
        break;
      default:
        throw new Error(`Unknown session data type: ${type}`);
    }
  }

  startHealthCollection() {
    if (this.healthCollectionInterval) {
      return; // Already collecting
    }

    this.healthCollectionInterval = setInterval(async () => {
      try {
        const healthStats = await this.getHealthStats();
        await this.addToCurrentSession('health', healthStats);
      } catch (error) {
        console.warn('Failed to collect health data during session:', error);
      }
    }, 60000); // Every minute
  }

  stopHealthCollection() {
    if (this.healthCollectionInterval) {
      clearInterval(this.healthCollectionInterval);
      this.healthCollectionInterval = null;
    }
  }

  // STATS AND ANALYTICS
  async getActivityStats(startDate, endDate) {
    return databaseService.repositories.activity.getActivityStats(startDate, endDate);
  }

  async getLocationStats(startDate, endDate) {
    return databaseService.repositories.location.getLocationStats(startDate, endDate);
  }

  async getDailyActivitySummary(date) {
    const [activities, locations, healthStats] = await Promise.all([
      this.getActivitiesForDate(date),
      this.getLocationsForDate(date),
      this.getHealthStats(date)
    ]);

    return {
      date: date.toISOString().split('T')[0],
      activities: {
        count: activities.length,
        types: [...new Set(activities.map(a => a.type))],
        total_duration: activities.reduce((sum, a) => sum + (a.duration || 0), 0)
      },
      locations: {
        count: locations.length,
        unique_places: [...new Set(locations.map(l => l.name).filter(Boolean))]
      },
      health: healthStats.daily || {},
      summary: this.generateDailySummary(activities, locations, healthStats)
    };
  }

  generateDailySummary(activities, locations, healthStats) {
    const summary = [];

    if (healthStats?.daily?.steps > 0) {
      summary.push(`${healthStats.daily.steps} steps recorded`);
    }

    if (activities.length > 0) {
      summary.push(`${activities.length} activities logged`);
    }

    if (locations.length > 0) {
      summary.push(`Visited ${locations.length} locations`);
    }

    return summary.join(', ') || 'No activity data recorded';
  }

  // UTILITY METHODS
  getCurrentSession() {
    return this.currentSession;
  }

  isCurrentlyTracking() {
    return this.isTracking;
  }

  cleanup() {
    this.stopHealthCollection();
    if (this.isTracking) {
      this.stopTrackingSession().catch(console.error);
    }
  }
}

const activityTrackingService = new ActivityTrackingService();
export default activityTrackingService;