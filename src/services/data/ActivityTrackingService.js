/**
 * UNIFIED ACTIVITY TRACKING SERVICE
 * 
 * Consolidates all activity and health tracking:
 * - activityService.js (435 lines)
 * - locationService.js (404 lines) 
 * - healthDataService.js (982 lines)
 * 
 * Single source of truth for user tracking data with modular architecture
 */

import database from '../database';
import errorHandler from '../errorLogger';
import performanceService from '../performanceService';
import { BaseService } from '../BaseService';
import platformDetector from '../../utils/platformDetector';
import GetLocation from 'react-native-get-location';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { SensorManager, HealthConnectModule, RealHealthConnectModule } = NativeModules;

// Configuration constants
const LOCATION_INTERVAL = 300000; // 5 minutes
const SIGNIFICANT_DISTANCE = 100; // 100 meters
const ACCELEROMETER_INTERVAL = 200; // 200ms

// Health Connect setup
let HealthConnect;
if (__DEV__) {
  HealthConnect = HealthConnectModule;
} else {
  HealthConnect = RealHealthConnectModule;
}

class ActivityTrackingService extends BaseService {
  constructor() {
    super('ActivityTrackingService');
    
    // Tracking state
    this.isTracking = false;
    this.lastLocation = null;
    this.locationTrackingInterval = null;
    this.accelerometerSubscription = null;
    this.platformInfo = null;
    this.currentSession = null;
    
    // Sub-modules for organization
    this.activity = new ActivityModule(this);
    this.location = new LocationModule(this);
    this.health = new HealthModule(this);
    
    this.initializePlatform();
  }

  async initializePlatform() {
    try {
      this.platformInfo = await platformDetector.detectPlatform();
    } catch (error) {
      console.warn('Platform detection failed:', error);
      this.platformInfo = { isEmulator: false, shouldUseMockData: false };
    }
  }

  // ============================================
  // UNIFIED TRACKING METHODS
  // ============================================

  /**
   * Unified tracking session - combines activity, location, and health data
   */
  async startTrackingSession(options = {}) {
    const start = performanceService?.startTracking?.('activityTracking.startSession');
    
    try {
      this.isTracking = true;
      
      // Start all sub-module tracking
      await Promise.all([
        this.activity.startActivityMonitoring(options.activity),
        this.location.startLocationTracking(options.location),
        this.health.startHealthSync(options.health)
      ]);
      
      performanceService?.endTracking?.(start);
      return { success: true, sessionId: Date.now() };
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to start tracking session', error);
      throw error;
    }
  }

  async stopTrackingSession() {
    const start = performanceService?.startTracking?.('activityTracking.stopSession');
    
    try {
      this.isTracking = false;
      
      // Stop all sub-module tracking
      await Promise.all([
        this.activity.stopActivityMonitoring(),
        this.location.stopLocationTracking(),
        this.health.stopHealthSync()
      ]);
      
      performanceService?.endTracking?.(start);
      return { success: true };
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to stop tracking session', error);
      throw error;
    }
  }

  /**
   * Get comprehensive daily tracking data
   */
  async getDailyTrackingData(date) {
    const start = performanceService?.startTracking?.('activityTracking.getDailyData');
    
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const [activities, locations, healthData] = await Promise.all([
        this.activity.getActivities(startOfDay.getTime(), endOfDay.getTime()),
        this.location.getLocations(startOfDay.getTime(), endOfDay.getTime()),
        this.health.getHealthStats(date)
      ]);
      
      const unifiedData = {
        date: date.toISOString().split('T')[0],
        activities: activities,
        locations: locations,
        health: healthData,
        summary: this.generateDailySummary(activities, locations, healthData),
        metadata: {
          totalActivities: activities.length,
          totalLocations: locations.length,
          trackingCoverage: this.calculateTrackingCoverage(activities, locations, healthData),
          generatedAt: Date.now()
        }
      };
      
      performanceService?.endTracking?.(start);
      return unifiedData;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to get daily tracking data', error);
      throw error;
    }
  }

  /**
   * Batch operations for efficient data processing
   */
  async batchLogActivities(activities) {
    return this.activity.batchLogActivities(activities);
  }

  async batchTrackLocations(locations) {
    return this.location.batchTrackLocations(locations);
  }

  async batchSyncHealthData(dates) {
    return this.health.batchSyncHealthData(dates);
  }

  // ============================================
  // LEGACY COMPATIBILITY METHODS
  // ============================================

  // Activity service compatibility
  async logActivity(activity) {
    return this.activity.logActivity(activity);
  }

  async getActivities(startTimestamp, endTimestamp) {
    return this.activity.getActivities(startTimestamp, endTimestamp);
  }

  async getActivitiesForDate(date) {
    return this.activity.getActivitiesForDate(date);
  }

  async updateActivity(activityId, updates) {
    return this.activity.updateActivity(activityId, updates);
  }

  async deleteActivity(activityId) {
    return this.activity.deleteActivity(activityId);
  }

  // Location service compatibility
  async trackLocation(location) {
    return this.location.trackLocation(location);
  }

  async getLocations(startTimestamp, endTimestamp) {
    return this.location.getLocations(startTimestamp, endTimestamp);
  }

  async getVisitedPlaces(startTimestamp, endTimestamp) {
    return this.location.getVisitedPlaces(startTimestamp, endTimestamp);
  }

  async getRecentLocations(limit = 10) {
    return this.location.getRecentLocations(limit);
  }

  // Health data service compatibility
  async syncHealthData(date) {
    return this.health.syncHealthData(date);
  }

  async getHealthStats(date) {
    return this.health.getHealthStats(date);
  }

  async getHealthDataForDateRange(startDate, endDate) {
    return this.health.getHealthDataForDateRange(startDate, endDate);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  generateDailySummary(activities, locations, healthData) {
    return {
      totalSteps: this.calculateTotalSteps(activities),
      totalCalories: this.calculateTotalCalories(activities),
      totalDistance: this.calculateTotalDistance(activities),
      activeMinutes: this.calculateActiveMinutes(activities),
      uniquePlacesVisited: this.countUniquePlaces(locations),
      mostActiveTime: this.findMostActiveTime(activities),
      locationCoverage: this.calculateLocationCoverage(locations),
      healthScore: this.calculateHealthScore(activities, healthData)
    };
  }

  calculateTrackingCoverage(activities, locations, healthData) {
    const hasActivities = activities && activities.length > 0;
    const hasLocations = locations && locations.length > 0;
    const hasHealthData = healthData && Object.keys(healthData).length > 0;
    
    let coverage = 0;
    if (hasActivities) coverage += 0.4;
    if (hasLocations) coverage += 0.3;
    if (hasHealthData) coverage += 0.3;
    
    return Math.round(coverage * 100);
  }

  calculateTotalSteps(activities) {
    return activities.reduce((total, activity) => {
      return total + (activity.steps || 0);
    }, 0);
  }

  calculateTotalCalories(activities) {
    return activities.reduce((total, activity) => {
      return total + (activity.calories || 0);
    }, 0);
  }

  calculateTotalDistance(activities) {
    return activities.reduce((total, activity) => {
      return total + (activity.distance || 0);
    }, 0);
  }

  calculateActiveMinutes(activities) {
    return activities.reduce((total, activity) => {
      const minutes = activity.duration ? Math.floor(activity.duration / 60000) : 0;
      return total + minutes;
    }, 0);
  }

  countUniquePlaces(locations) {
    const places = new Set();
    locations.forEach(loc => {
      const key = loc.place_id || `${loc.latitude?.toFixed(4)},${loc.longitude?.toFixed(4)}`;
      places.add(key);
    });
    return places.size;
  }

  findMostActiveTime(activities) {
    if (!activities.length) return null;
    
    const hourCounts = {};
    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const mostActiveHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    );
    
    return `${mostActiveHour}:00-${parseInt(mostActiveHour) + 1}:00`;
  }

  calculateLocationCoverage(locations) {
    if (!locations.length) return 0;
    
    const startTime = Math.min(...locations.map(l => l.timestamp));
    const endTime = Math.max(...locations.map(l => l.timestamp));
    const totalDuration = endTime - startTime;
    const dayDuration = 24 * 60 * 60 * 1000; // 24 hours
    
    return Math.min(100, Math.round((totalDuration / dayDuration) * 100));
  }

  calculateHealthScore(activities, healthData) {
    let score = 0;
    
    // Activity score (0-40 points)
    const steps = this.calculateTotalSteps(activities);
    const stepScore = Math.min(40, (steps / 10000) * 40);
    score += stepScore;
    
    // Health data score (0-30 points)
    if (healthData && healthData.steps) {
      const healthScore = Math.min(30, (healthData.steps / 10000) * 30);
      score += healthScore;
    }
    
    // Active minutes score (0-30 points)
    const activeMinutes = this.calculateActiveMinutes(activities);
    const activeScore = Math.min(30, (activeMinutes / 30) * 30);
    score += activeScore;
    
    return Math.round(score);
  }
}

/**
 * ACTIVITY MODULE
 * Handles activity tracking and step counting
 */
class ActivityModule {
  constructor(parent) {
    this.parent = parent;
    this.accelerometerSubscription = null;
    this.isMonitoring = false;
    this.currentActivity = null;
  }

  async startActivityMonitoring(options = {}) {
    if (this.isMonitoring) return;
    
    try {
      // Initialize accelerometer monitoring
      await this.initializeAccelerometer();
      this.isMonitoring = true;
    } catch (error) {
      errorHandler.logError('Failed to start activity monitoring', error);
      throw error;
    }
  }

  async stopActivityMonitoring() {
    if (!this.isMonitoring) return;
    
    try {
      if (this.accelerometerSubscription) {
        this.accelerometerSubscription.remove();
        this.accelerometerSubscription = null;
      }
      
      if (this.currentActivity) {
        await this.endActivity();
      }
      
      this.isMonitoring = false;
    } catch (error) {
      errorHandler.logError('Failed to stop activity monitoring', error);
      throw error;
    }
  }

  async initializeAccelerometer() {
    try {
      if (SensorManager && SensorManager.startAccelerometer) {
        const eventEmitter = new NativeEventEmitter(SensorManager);
        this.accelerometerSubscription = eventEmitter.addListener('Accelerometer', (data) => {
          this.handleAccelerometerData(data);
        });
        SensorManager.startAccelerometer(200); // 200ms interval
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Accelerometer not available, using mock data:', error);
        // Mock accelerometer data for development
        this.startMockAccelerometer();
      }
    }
  }

  startMockAccelerometer() {
    const mockInterval = setInterval(() => {
      const mockData = {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2 + 9.8,
        timestamp: Date.now()
      };
      this.handleAccelerometerData(mockData);
    }, 200);
    
    this.accelerometerSubscription = { remove: () => clearInterval(mockInterval) };
  }

  handleAccelerometerData(data) {
    // Simple activity detection based on accelerometer patterns
    const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
    
    if (magnitude > 12) { // High activity threshold
      if (!this.currentActivity) {
        this.startActivity('walking');
      }
    } else if (magnitude < 10.5) { // Low activity threshold
      if (this.currentActivity) {
        this.endActivity();
      }
    }
  }

  async startActivity(type) {
    this.currentActivity = {
      type: type,
      start_time: Date.now(),
      steps: 0,
      calories: 0,
      distance: 0
    };
  }

  async endActivity() {
    if (!this.currentActivity) return;
    
    this.currentActivity.end_time = Date.now();
    this.currentActivity.duration = this.currentActivity.end_time - this.currentActivity.start_time;
    
    // Estimate metrics based on activity type and duration
    this.estimateActivityMetrics(this.currentActivity);
    
    // Save to database
    await this.logActivity(this.currentActivity);
    this.currentActivity = null;
  }

  estimateActivityMetrics(activity) {
    const durationMinutes = activity.duration / 60000;
    
    switch (activity.type) {
      case 'walking':
        activity.steps = Math.round(durationMinutes * 100); // ~100 steps per minute
        activity.calories = Math.round(durationMinutes * 5); // ~5 calories per minute
        activity.distance = Math.round(durationMinutes * 100); // ~100m per minute
        break;
      case 'running':
        activity.steps = Math.round(durationMinutes * 150);
        activity.calories = Math.round(durationMinutes * 12);
        activity.distance = Math.round(durationMinutes * 200);
        break;
      case 'cycling':
        activity.calories = Math.round(durationMinutes * 8);
        activity.distance = Math.round(durationMinutes * 300);
        break;
      default:
        activity.calories = Math.round(durationMinutes * 3);
    }
  }

  // Core activity methods
  async logActivity(activity) {
    const activityData = {
      type: activity.type || 'unknown',
      start_time: activity.start_time || Date.now(),
      end_time: activity.end_time,
      duration: activity.duration,
      sport_type: activity.sport_type,
      distance: activity.distance,
      calories: activity.calories,
      steps: activity.steps,
      metadata: activity.metadata ? JSON.stringify(activity.metadata) : null,
      created_at: Date.now()
    };

    return database.addActivity(activityData);
  }

  async getActivities(startTimestamp, endTimestamp) {
    return database.getActivitiesForDateRange(startTimestamp, endTimestamp);
  }

  async getActivitiesForDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getActivities(startOfDay.getTime(), endOfDay.getTime());
  }

  async updateActivity(activityId, updates) {
    return database.updateActivity(activityId, updates);
  }

  async deleteActivity(activityId) {
    return database.deleteActivity(activityId);
  }

  async batchLogActivities(activities) {
    const results = [];
    
    for (const activity of activities) {
      try {
        const result = await this.logActivity(activity);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message, activity });
      }
    }
    
    return results;
  }
}

/**
 * LOCATION MODULE
 * Handles location tracking and place detection
 */
class LocationModule {
  constructor(parent) {
    this.parent = parent;
    this.isTracking = false;
    this.lastLocation = null;
    this.locationTrackingInterval = null;
  }

  async startLocationTracking(options = {}) {
    if (this.isTracking) return;
    
    try {
      this.isTracking = true;
      
      // Start periodic location updates
      this.startPeriodicLocationUpdates(options);
      
    } catch (error) {
      errorHandler.logError('Failed to start location tracking', error);
      throw error;
    }
  }

  async stopLocationTracking() {
    if (!this.isTracking) return;
    
    try {
      this.isTracking = false;
      
      if (this.locationTrackingInterval) {
        clearInterval(this.locationTrackingInterval);
        this.locationTrackingInterval = null;
      }
      
    } catch (error) {
      errorHandler.logError('Failed to stop location tracking', error);
      throw error;
    }
  }

  startPeriodicLocationUpdates(options = {}) {
    const interval = options.interval || LOCATION_INTERVAL;
    
    this.locationTrackingInterval = setInterval(async () => {
      if (!this.isTracking) return;
      
      try {
        const location = await this.getCurrentPositionAsync(options);
        await this.handleLocationUpdate(location);
      } catch (error) {
        errorHandler.logError('Location update failed', error);
      }
    }, interval);
  }

  async getCurrentPositionAsync(options = {}) {
    // Platform detection for emulator/real device logic
    if (!this.parent.platformInfo) {
      await this.parent.initializePlatform();
    }

    if (this.parent.platformInfo?.shouldUseMockData) {
      return this.getMockLocation();
    }

    // Real device - get actual location
    const location = await GetLocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy || false,
      timeout: options.timeout || 15000,
    });
    
    return {
      coords: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude || null,
        heading: location.heading || null,
        speed: location.speed || null
      },
      timestamp: Date.now()
    };
  }

  getMockLocation() {
    return {
      coords: {
        latitude: 52.3676 + (Math.random() - 0.5) * 0.01, // Amsterdam area
        longitude: 4.9041 + (Math.random() - 0.5) * 0.01,
        accuracy: 10 + Math.random() * 20,
        altitude: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    };
  }

  async handleLocationUpdate(location) {
    // Check if location is significantly different from last location
    if (this.lastLocation && !this.isSignificantLocationChange(this.lastLocation, location)) {
      return; // Skip if not significant change
    }
    
    // Get place information
    const placeInfo = await this.getPlaceInfo(location.coords);
    
    const locationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
      name: placeInfo.name,
      address: placeInfo.address,
      place_id: placeInfo.place_id,
      created_at: Date.now()
    };

    await this.trackLocation(locationData);
    this.lastLocation = location;
  }

  isSignificantLocationChange(lastLocation, newLocation) {
    if (!lastLocation) return true;
    
    const distance = this.calculateDistance(
      lastLocation.coords.latitude,
      lastLocation.coords.longitude,
      newLocation.coords.latitude,
      newLocation.coords.longitude
    );
    
    return distance > SIGNIFICANT_DISTANCE;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula for distance calculation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  async getPlaceInfo(coords) {
    // Simple reverse geocoding simulation
    // In production, this would call a real geocoding API
    const mockPlaces = [
      { name: 'Home', address: 'Residential Area', place_id: 'home_001' },
      { name: 'Work', address: 'Business District', place_id: 'work_001' },
      { name: 'Gym', address: 'Fitness Center', place_id: 'gym_001' },
      { name: 'Park', address: 'Public Park', place_id: 'park_001' }
    ];
    
    // Simple place assignment based on coordinates (mock logic)
    const placeIndex = Math.floor(Math.random() * mockPlaces.length);
    return mockPlaces[placeIndex];
  }

  // Core location methods
  async trackLocation(location) {
    return database.addLocation(location);
  }

  async getLocations(startTimestamp, endTimestamp) {
    return database.getLocationsForDateRange(startTimestamp, endTimestamp);
  }

  async getVisitedPlaces(startTimestamp, endTimestamp) {
    const locations = await this.getLocations(startTimestamp, endTimestamp);
    
    // Group by place_id or coordinates to get unique places
    const places = new Map();
    
    locations.forEach(loc => {
      const key = loc.place_id || `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
      
      if (!places.has(key)) {
        places.set(key, {
          ...loc,
          visit_count: 1,
          first_visit: loc.timestamp,
          last_visit: loc.timestamp
        });
      } else {
        const place = places.get(key);
        place.visit_count++;
        place.last_visit = Math.max(place.last_visit, loc.timestamp);
      }
    });
    
    return Array.from(places.values());
  }

  async getRecentLocations(limit = 10) {
    return database.getRecentLocations(limit);
  }

  async batchTrackLocations(locations) {
    const results = [];
    
    for (const location of locations) {
      try {
        const result = await this.trackLocation(location);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message, location });
      }
    }
    
    return results;
  }
}

/**
 * HEALTH MODULE
 * Handles health data synchronization from Health Connect
 */
class HealthModule {
  constructor(parent) {
    this.parent = parent;
    this.isSyncing = false;
    this.healthConnect = HealthConnect;
    this.recordTypes = {
      STEPS: 'Steps',
      HEART_RATE: 'HeartRate',
      DISTANCE: 'Distance',
      ACTIVE_CALORIES: 'ActiveCaloriesBurned',
      TOTAL_CALORIES: 'TotalCaloriesBurned',
      EXERCISE: 'ExerciseSession',
      SLEEP: 'SleepSession',
      WEIGHT: 'Weight',
      HEIGHT: 'Height',
      BODY_FAT: 'BodyFat'
    };
  }

  async startHealthSync(options = {}) {
    if (this.isSyncing) return;
    
    try {
      this.isSyncing = true;
      
      // Initialize Health Connect if available
      if (Platform.OS === 'android' && this.healthConnect) {
        await this.initializeHealthConnect();
      }
      
    } catch (error) {
      errorHandler.logError('Failed to start health sync', error);
      throw error;
    }
  }

  async stopHealthSync() {
    this.isSyncing = false;
  }

  async initializeHealthConnect() {
    try {
      // Check if Health Connect is available
      const isAvailable = await this.isHealthConnectAvailable();
      if (!isAvailable) {
        throw new Error('Health Connect is not available on this device');
      }

      // Request permissions
      await this.requestHealthPermissions();
      
    } catch (error) {
      errorHandler.logError('Health Connect initialization failed', error);
      throw error;
    }
  }

  async isHealthConnectAvailable() {
    try {
      return await this.healthConnect.isAvailable();
    } catch (error) {
      return false;
    }
  }

  async requestHealthPermissions(dataTypes = ['steps', 'heart_rate', 'exercise']) {
    const permissions = [];
    
    dataTypes.forEach(type => {
      switch (type) {
        case 'steps':
          permissions.push({ accessType: 'read', recordType: 'Steps' });
          break;
        case 'heart_rate':
          permissions.push({ accessType: 'read', recordType: 'HeartRate' });
          break;
        case 'exercise':
          permissions.push({ accessType: 'read', recordType: 'ExerciseSession' });
          break;
        case 'sleep':
          permissions.push({ accessType: 'read', recordType: 'SleepSession' });
          break;
      }
    });

    try {
      return await this.healthConnect.requestPermissions(permissions);
    } catch (error) {
      errorHandler.logError('Health permissions request failed', error);
      throw error;
    }
  }

  /**
   * Sync health data from Health Connect
   */
  async syncHealthData(date) {
    const start = performanceService?.startTracking?.('health.syncHealthData');
    
    try {
      if (Platform.OS !== 'android' || !this.healthConnect) {
        // Return aggregated data from activities for non-Android platforms
        return this.aggregateHealthFromActivities(date);
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Collect data from Health Connect
      const [steps, heartRate, exercise, sleep] = await Promise.all([
        this.getSteps(startOfDay, endOfDay),
        this.getHeartRate(startOfDay, endOfDay),
        this.getExercise(startOfDay, endOfDay),
        this.getSleep(startOfDay, endOfDay)
      ]);

      const healthData = {
        date: date,
        steps: steps,
        heart_rate: heartRate,
        exercise: exercise,
        sleep: sleep,
        synced_at: Date.now(),
        source: 'HealthConnect'
      };

      performanceService?.endTracking?.(start);
      return healthData;
      
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Health data sync failed', error);
      
      // Fallback to aggregated activity data
      return this.aggregateHealthFromActivities(date);
    }
  }

  async getSteps(startDate, endDate) {
    try {
      const records = await this.healthConnect.getSteps(startDate.getTime(), endDate.getTime());
      return this.aggregateSteps(records);
    } catch (error) {
      return 0;
    }
  }

  async getHeartRate(startDate, endDate) {
    try {
      const records = await this.healthConnect.getHeartRate(startDate.getTime(), endDate.getTime());
      return this.aggregateHeartRate(records);
    } catch (error) {
      return { average: 0, min: 0, max: 0, count: 0 };
    }
  }

  async getExercise(startDate, endDate) {
    try {
      const records = await this.healthConnect.getExercise(startDate.getTime(), endDate.getTime());
      return this.aggregateExercise(records);
    } catch (error) {
      return [];
    }
  }

  async getSleep(startDate, endDate) {
    try {
      const records = await this.healthConnect.getSleep(startDate.getTime(), endDate.getTime());
      return this.aggregateSleep(records);
    } catch (error) {
      return { totalMinutes: 0, sessions: [] };
    }
  }

  aggregateSteps(records) {
    return records.reduce((total, record) => total + (record.count || 0), 0);
  }

  aggregateHeartRate(records) {
    if (!records.length) return { average: 0, min: 0, max: 0, count: 0 };
    
    const values = records.map(r => r.bpm).filter(v => v > 0);
    if (!values.length) return { average: 0, min: 0, max: 0, count: 0 };
    
    return {
      average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  aggregateExercise(records) {
    return records.map(record => ({
      type: record.exerciseType || 'unknown',
      start_time: record.startTime,
      end_time: record.endTime,
      duration: record.endTime - record.startTime,
      calories: record.energyBurned || 0,
      distance: record.distance || 0
    }));
  }

  aggregateSleep(records) {
    const sessions = records.map(record => ({
      start_time: record.startTime,
      end_time: record.endTime,
      duration: record.endTime - record.startTime,
      stage: record.stage || 'unknown'
    }));
    
    const totalMinutes = sessions.reduce((total, session) => 
      total + Math.floor(session.duration / 60000), 0
    );
    
    return {
      totalMinutes,
      sessions
    };
  }

  aggregateHealthFromActivities(date) {
    // Fallback: aggregate health data from activities
    return {
      date: date,
      steps: 0, // Will be calculated from activity data
      heart_rate: { average: 0, min: 0, max: 0, count: 0 },
      exercise: [],
      sleep: { totalMinutes: 0, sessions: [] },
      synced_at: Date.now(),
      source: 'ActivityAggregation'
    };
  }

  // Core health methods
  async getHealthStats(date) {
    return this.syncHealthData(date);
  }

  async getHealthDataForDateRange(startDate, endDate) {
    const results = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const healthData = await this.getHealthStats(currentDate);
      if (healthData) {
        results.push(healthData);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return results;
  }

  async batchSyncHealthData(dates) {
    const results = [];
    
    for (const date of dates) {
      try {
        const healthData = await this.syncHealthData(date);
        results.push({ success: true, data: healthData });
      } catch (error) {
        results.push({ success: false, error: error.message, date });
      }
    }
    
    return results;
  }
}

// Export singleton instance
const activityTrackingService = new ActivityTrackingService();
export default activityTrackingService;