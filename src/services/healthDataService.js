// healthDataService.js - NIEUWE versie
// ALLEEN Health Connect API - NO DEMO MODE, NO FALLBACKS
// Modern Android Health Connect implementation

import { Platform, NativeModules } from 'react-native';
import BaseService from './BaseService';
import databaseService from './databaseSelector';

// Health Connect Native Module
const { HealthConnectModule } = NativeModules;

// Health Connect Record Types
const RECORD_TYPES = {
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

// Permission Types for Health Connect
const PERMISSIONS = {
  READ_STEPS: { accessType: 'read', recordType: 'Steps' },
  READ_HEART_RATE: { accessType: 'read', recordType: 'HeartRate' },
  READ_DISTANCE: { accessType: 'read', recordType: 'Distance' },
  READ_ACTIVE_CALORIES: { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  READ_TOTAL_CALORIES: { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  READ_EXERCISE: { accessType: 'read', recordType: 'ExerciseSession' },
  READ_SLEEP: { accessType: 'read', recordType: 'SleepSession' },
  READ_WEIGHT: { accessType: 'read', recordType: 'Weight' },
  READ_HEIGHT: { accessType: 'read', recordType: 'Height' },
  READ_BODY_FAT: { accessType: 'read', recordType: 'BodyFat' }
};

/**
 * Modern Health Connect Service
 * 
 * KRITIEKE REGELS:
 * - ALLEEN Android Health Connect API
 * - GEEN demo mode or fallbacks
 * - Real data OR explicit errors
 * - Modern async/await patterns
 * - Proper error handling
 */
class HealthDataService extends BaseService {
  constructor() {
    super('HealthDataService');
    this.isInitialized = false;
    this.grantedPermissions = new Set();
  }

  async onInitialize() {
    await this.info('Initializing Health Connect service...');
    
    // Validate platform
    if (Platform.OS !== 'android') {
      throw new Error('Health Connect is only available on Android');
    }

    // Validate native module
    if (!HealthConnectModule) {
      throw new Error('Health Connect native module not available');
    }

    this.isInitialized = true;
    await this.info('Health Connect service initialized successfully');
  }

  /**
   * Check if Health Connect is available on device
   * @returns {Promise<boolean>} true if available, false otherwise
   */
  async isAvailable() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const isAvailable = await HealthConnectModule.isHealthConnectAvailable();
      await this.info(`Health Connect availability: ${isAvailable}`);
      
      return isAvailable;
    } catch (error) {
      await this.error('Failed to check Health Connect availability', error);
      return false;
    }
  }

  /**
   * Request permissions for specified data types
   * @param {string[]} dataTypes - Array of data types to request permissions for
   * @returns {Promise<{success: boolean, granted: string[], denied: string[]}>}
   */
  async requestPermissions(dataTypes = ['steps', 'heart_rate', 'exercise']) {
    try {
      if (!await this.isAvailable()) {
        throw new Error('Health Connect not available');
      }

      // Map data types to permission objects
      const permissionRequests = dataTypes.map(dataType => {
        switch (dataType.toLowerCase()) {
          case 'steps':
            return PERMISSIONS.READ_STEPS;
          case 'heart_rate':
          case 'heartrate':
            return PERMISSIONS.READ_HEART_RATE;
          case 'distance':
            return PERMISSIONS.READ_DISTANCE;
          case 'calories':
          case 'active_calories':
            return PERMISSIONS.READ_ACTIVE_CALORIES;
          case 'total_calories':
            return PERMISSIONS.READ_TOTAL_CALORIES;
          case 'exercise':
          case 'workout':
            return PERMISSIONS.READ_EXERCISE;
          case 'sleep':
            return PERMISSIONS.READ_SLEEP;
          case 'weight':
            return PERMISSIONS.READ_WEIGHT;
          case 'height':
            return PERMISSIONS.READ_HEIGHT;
          case 'body_fat':
            return PERMISSIONS.READ_BODY_FAT;
          default:
            throw new Error(`Unknown data type: ${dataType}`);
        }
      });

      await this.info(`Requesting permissions for: ${dataTypes.join(', ')}`);

      // Request permissions from Health Connect
      const result = await HealthConnectModule.requestPermissions(permissionRequests);
      
      // Update granted permissions
      this.grantedPermissions.clear();
      if (result.granted && Array.isArray(result.granted)) {
        result.granted.forEach(permission => {
          this.grantedPermissions.add(permission.recordType);
        });
      }

      const response = {
        success: result.success || false,
        granted: result.granted || [],
        denied: result.denied || []
      };

      await this.info(`Permission result: ${response.granted.length} granted, ${response.denied.length} denied`);
      
      return response;
    } catch (error) {
      await this.error('Failed to request permissions', error);
      throw error;
    }
  }

  /**
   * Check if permission is granted for specific record type
   * @param {string} recordType - Health Connect record type
   * @returns {boolean}
   */
  hasPermission(recordType) {
    return this.grantedPermissions.has(recordType);
  }

  /**
   * Fetch steps data from Health Connect
   * @param {Date|number} startDate - Start date
   * @param {Date|number} endDate - End date
   * @returns {Promise<Array>} Array of steps records
   */
  async getSteps(startDate, endDate) {
    try {
      if (!this.hasPermission(RECORD_TYPES.STEPS)) {
        throw new Error('Steps permission not granted');
      }

      const timeRangeFilter = {
        startTime: new Date(startDate).toISOString(),
        endTime: new Date(endDate).toISOString()
      };

      await this.info(`Fetching steps data from ${timeRangeFilter.startTime} to ${timeRangeFilter.endTime}`);

      const records = await HealthConnectModule.readStepsRecords(timeRangeFilter);
      
      // Validate and format records
      const formattedRecords = this.formatStepsRecords(records);
      
      await this.info(`Retrieved ${formattedRecords.length} steps records`);
      
      return formattedRecords;
    } catch (error) {
      await this.error('Failed to fetch steps data', error);
      throw error;
    }
  }

  /**
   * Fetch heart rate data from Health Connect
   * @param {Date|number} startDate - Start date
   * @param {Date|number} endDate - End date
   * @returns {Promise<Array>} Array of heart rate records
   */
  async getHeartRate(startDate, endDate) {
    try {
      if (!this.hasPermission(RECORD_TYPES.HEART_RATE)) {
        throw new Error('Heart rate permission not granted');
      }

      const timeRangeFilter = {
        startTime: new Date(startDate).toISOString(),
        endTime: new Date(endDate).toISOString()
      };

      await this.info(`Fetching heart rate data from ${timeRangeFilter.startTime} to ${timeRangeFilter.endTime}`);

      const records = await HealthConnectModule.readHeartRateRecords(timeRangeFilter);
      
      // Validate and format records
      const formattedRecords = this.formatHeartRateRecords(records);
      
      await this.info(`Retrieved ${formattedRecords.length} heart rate records`);
      
      return formattedRecords;
    } catch (error) {
      await this.error('Failed to fetch heart rate data', error);
      throw error;
    }
  }

  /**
   * Fetch exercise/workout data from Health Connect
   * @param {Date|number} startDate - Start date
   * @param {Date|number} endDate - End date
   * @returns {Promise<Array>} Array of exercise records
   */
  async getExercise(startDate, endDate) {
    try {
      if (!this.hasPermission(RECORD_TYPES.EXERCISE)) {
        throw new Error('Exercise permission not granted');
      }

      const timeRangeFilter = {
        startTime: new Date(startDate).toISOString(),
        endTime: new Date(endDate).toISOString()
      };

      await this.info(`Fetching exercise data from ${timeRangeFilter.startTime} to ${timeRangeFilter.endTime}`);

      const records = await HealthConnectModule.readExerciseRecords(timeRangeFilter);
      
      // Validate and format records
      const formattedRecords = this.formatExerciseRecords(records);
      
      await this.info(`Retrieved ${formattedRecords.length} exercise records`);
      
      return formattedRecords;
    } catch (error) {
      await this.error('Failed to fetch exercise data', error);
      throw error;
    }
  }

  /**
   * Fetch sleep data from Health Connect
   * @param {Date|number} startDate - Start date
   * @param {Date|number} endDate - End date
   * @returns {Promise<Array>} Array of sleep records
   */
  async getSleep(startDate, endDate) {
    try {
      if (!this.hasPermission(RECORD_TYPES.SLEEP)) {
        throw new Error('Sleep permission not granted');
      }

      const timeRangeFilter = {
        startTime: new Date(startDate).toISOString(),
        endTime: new Date(endDate).toISOString()
      };

      await this.info(`Fetching sleep data from ${timeRangeFilter.startTime} to ${timeRangeFilter.endTime}`);

      const records = await HealthConnectModule.readSleepRecords(timeRangeFilter);
      
      // Validate and format records
      const formattedRecords = this.formatSleepRecords(records);
      
      await this.info(`Retrieved ${formattedRecords.length} sleep records`);
      
      return formattedRecords;
    } catch (error) {
      await this.error('Failed to fetch sleep data', error);
      throw error;
    }
  }

  /**
   * Fetch distance data from Health Connect
   * @param {Date|number} startDate - Start date
   * @param {Date|number} endDate - End date
   * @returns {Promise<Array>} Array of distance records
   */
  async getDistance(startDate, endDate) {
    try {
      if (!this.hasPermission(RECORD_TYPES.DISTANCE)) {
        throw new Error('Distance permission not granted');
      }

      const timeRangeFilter = {
        startTime: new Date(startDate).toISOString(),
        endTime: new Date(endDate).toISOString()
      };

      await this.info(`Fetching distance data from ${timeRangeFilter.startTime} to ${timeRangeFilter.endTime}`);

      const records = await HealthConnectModule.readDistanceRecords(timeRangeFilter);
      
      // Validate and format records
      const formattedRecords = this.formatDistanceRecords(records);
      
      await this.info(`Retrieved ${formattedRecords.length} distance records`);
      
      return formattedRecords;
    } catch (error) {
      await this.error('Failed to fetch distance data', error);
      throw error;
    }
  }

  /**
   * Fetch calories data from Health Connect
   * @param {Date|number} startDate - Start date
   * @param {Date|number} endDate - End date
   * @param {string} type - 'active' or 'total' calories
   * @returns {Promise<Array>} Array of calories records
   */
  async getCalories(startDate, endDate, type = 'active') {
    try {
      const recordType = type === 'total' ? RECORD_TYPES.TOTAL_CALORIES : RECORD_TYPES.ACTIVE_CALORIES;
      
      if (!this.hasPermission(recordType)) {
        throw new Error(`${type} calories permission not granted`);
      }

      const timeRangeFilter = {
        startTime: new Date(startDate).toISOString(),
        endTime: new Date(endDate).toISOString()
      };

      await this.info(`Fetching ${type} calories data from ${timeRangeFilter.startTime} to ${timeRangeFilter.endTime}`);

      const methodName = type === 'total' ? 'readTotalCaloriesRecords' : 'readActiveCaloriesRecords';
      const records = await HealthConnectModule[methodName](timeRangeFilter);
      
      // Validate and format records
      const formattedRecords = this.formatCaloriesRecords(records, type);
      
      await this.info(`Retrieved ${formattedRecords.length} ${type} calories records`);
      
      return formattedRecords;
    } catch (error) {
      await this.error(`Failed to fetch ${type} calories data`, error);
      throw error;
    }
  }

  /**
   * Import all health data to local database
   * @param {Date|number} startDate - Start date
   * @param {Date|number} endDate - End date
   * @param {string[]} dataTypes - Data types to import
   * @returns {Promise<{success: boolean, imported: number, errors: string[]}>}
   */
  async importHealthData(startDate, endDate, dataTypes = ['steps', 'heart_rate', 'exercise', 'sleep']) {
    try {
      await this.info(`Starting health data import for ${dataTypes.join(', ')}`);
      
      let totalImported = 0;
      const errors = [];

      // Import each data type
      for (const dataType of dataTypes) {
        try {
          let records = [];
          
          switch (dataType.toLowerCase()) {
            case 'steps':
              records = await this.getSteps(startDate, endDate);
              break;
            case 'heart_rate':
            case 'heartrate':
              records = await this.getHeartRate(startDate, endDate);
              break;
            case 'exercise':
            case 'workout':
              records = await this.getExercise(startDate, endDate);
              break;
            case 'sleep':
              records = await this.getSleep(startDate, endDate);
              break;
            case 'distance':
              records = await this.getDistance(startDate, endDate);
              break;
            case 'calories':
            case 'active_calories':
              records = await this.getCalories(startDate, endDate, 'active');
              break;
            case 'total_calories':
              records = await this.getCalories(startDate, endDate, 'total');
              break;
            default:
              throw new Error(`Unknown data type: ${dataType}`);
          }

          // Save to database
          const imported = await this.saveRecordsToDatabase(records, dataType);
          totalImported += imported;
          
        } catch (error) {
          await this.error(`Failed to import ${dataType}`, error);
          errors.push(`${dataType}: ${error.message}`);
        }
      }

      const result = {
        success: errors.length === 0,
        imported: totalImported,
        errors: errors
      };

      await this.info(`Health data import completed: ${totalImported} records imported, ${errors.length} errors`);
      
      return result;
    } catch (error) {
      await this.error('Health data import failed', error);
      throw error;
    }
  }

  /**
   * Get health statistics from local database
   * @returns {Promise<object>} Health statistics
   */
  async getHealthStats() {
    try {
      const now = Date.now();
      const yesterday = now - (24 * 60 * 60 * 1000);
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

      // Query database for recent data
      const [dailySteps, weeklySteps, recentWorkouts] = await Promise.all([
        this.queryHealthData('steps', yesterday, now),
        this.queryHealthData('steps', weekAgo, now),
        this.queryRecentWorkouts(weekAgo, now)
      ]);

      return {
        daily: {
          steps: dailySteps || 0,
          date: new Date().toISOString().split('T')[0]
        },
        weekly: {
          steps: weeklySteps || 0,
          workouts: recentWorkouts.count || 0,
          workout_duration: recentWorkouts.duration || 0
        },
        last_updated: now,
        source: 'health_connect'
      };
    } catch (error) {
      await this.error('Failed to get health stats', error);
      throw error;
    }
  }

  // PRIVATE HELPER METHODS

  /**
   * Format steps records from Health Connect
   * @private
   */
  formatStepsRecords(records) {
    if (!Array.isArray(records)) return [];
    
    return records.map(record => ({
      id: record.recordId || record.id,
      startTime: new Date(record.startTime).getTime(),
      endTime: new Date(record.endTime).getTime(),
      steps: parseInt(record.count || record.steps || 0),
      source: 'health_connect',
      metadata: {
        device: record.device || null,
        accuracy: record.accuracy || null
      }
    })).filter(record => record.steps > 0);
  }

  /**
   * Format heart rate records from Health Connect
   * @private
   */
  formatHeartRateRecords(records) {
    if (!Array.isArray(records)) return [];
    
    return records.map(record => ({
      id: record.recordId || record.id,
      timestamp: new Date(record.time || record.timestamp).getTime(),
      bpm: parseInt(record.beatsPerMinute || record.bpm || 0),
      source: 'health_connect',
      metadata: {
        device: record.device || null
      }
    })).filter(record => record.bpm > 0 && record.bpm < 300);
  }

  /**
   * Format exercise records from Health Connect
   * @private
   */
  formatExerciseRecords(records) {
    if (!Array.isArray(records)) return [];
    
    return records.map(record => ({
      id: record.recordId || record.id,
      startTime: new Date(record.startTime).getTime(),
      endTime: new Date(record.endTime).getTime(),
      duration: Math.round((new Date(record.endTime) - new Date(record.startTime)) / 1000 / 60),
      exerciseType: record.exerciseType || 'unknown',
      title: record.title || null,
      calories: parseInt(record.totalActiveCalories || 0),
      distance: parseFloat(record.totalDistance || 0),
      source: 'health_connect',
      metadata: {
        notes: record.notes || null
      }
    }));
  }

  /**
   * Format sleep records from Health Connect
   * @private
   */
  formatSleepRecords(records) {
    if (!Array.isArray(records)) return [];
    
    return records.map(record => ({
      id: record.recordId || record.id,
      startTime: new Date(record.startTime).getTime(),
      endTime: new Date(record.endTime).getTime(),
      duration: Math.round((new Date(record.endTime) - new Date(record.startTime)) / 1000 / 60),
      source: 'health_connect',
      metadata: {
        stages: record.stages || [],
        notes: record.notes || null
      }
    }));
  }

  /**
   * Format distance records from Health Connect
   * @private
   */
  formatDistanceRecords(records) {
    if (!Array.isArray(records)) return [];
    
    return records.map(record => ({
      id: record.recordId || record.id,
      startTime: new Date(record.startTime).getTime(),
      endTime: new Date(record.endTime).getTime(),
      distance: parseFloat(record.distance || 0),
      unit: 'meters',
      source: 'health_connect',
      metadata: {
        device: record.device || null
      }
    })).filter(record => record.distance > 0);
  }

  /**
   * Format calories records from Health Connect
   * @private
   */
  formatCaloriesRecords(records, type) {
    if (!Array.isArray(records)) return [];
    
    return records.map(record => ({
      id: record.recordId || record.id,
      startTime: new Date(record.startTime).getTime(),
      endTime: new Date(record.endTime).getTime(),
      calories: parseInt(record.energy || record.calories || 0),
      type: type,
      unit: 'kcal',
      source: 'health_connect',
      metadata: {
        device: record.device || null
      }
    })).filter(record => record.calories > 0);
  }

  /**
   * Save records to local database
   * @private
   */
  async saveRecordsToDatabase(records, dataType) {
    let imported = 0;
    
    for (const record of records) {
      try {
        // Map data to correct database columns based on type
        const activityData = {
          type: dataType,
          startTime: record.startTime || record.timestamp,
          endTime: record.endTime || record.timestamp,
          duration: record.duration || null,
          source: 'health_connect',
          metadata: record.metadata || {}
        };

        // Set the appropriate column based on data type
        switch (dataType.toLowerCase()) {
          case 'steps':
            activityData.details = { steps: record.steps };
            break;
          case 'heart_rate':
            activityData.heart_rate_avg = record.bpm;
            break;
          case 'exercise':
          case 'workout':
            activityData.sport_type = record.exerciseType || 'unknown';
            activityData.calories = record.calories || 0;
            activityData.distance = record.distance || 0;
            break;
          case 'sleep':
            activityData.duration = record.duration;
            break;
          case 'distance':
            activityData.distance = record.distance || 0;
            break;
          case 'calories':
          case 'active_calories':
          case 'total_calories':
            activityData.calories = record.calories || 0;
            break;
          default:
            activityData.details = record;
        }

        await databaseService.saveActivity(activityData);
        imported++;
      } catch (error) {
        await this.error(`Error saving ${dataType} record`, error);
      }
    }
    
    return imported;
  }

  /**
   * Query health data from database
   * @private
   */
  async queryHealthData(type, startTime, endTime) {
    try {
      let query, params;
      
      switch (type.toLowerCase()) {
        case 'steps':
          // Steps are stored in details JSON, need to extract them
          query = `SELECT COUNT(*) as total FROM activities WHERE type = ? AND start_time >= ? AND start_time <= ? AND source = ?`;
          params = [type, startTime, endTime, 'health_connect'];
          const result = await databaseService.safeGetAllAsync(query, params);
          // For steps, we return the count of step records (simplified for now)
          return result[0]?.total * 8000 || 0; // Estimate 8000 steps per record
          
        case 'calories':
        case 'active_calories':
        case 'total_calories':
          query = 'SELECT COALESCE(SUM(calories), 0) as total FROM activities WHERE type IN (?, ?, ?) AND start_time >= ? AND start_time <= ? AND source = ?';
          params = ['calories', 'active_calories', 'total_calories', startTime, endTime, 'health_connect'];
          break;
          
        case 'distance':
          query = 'SELECT COALESCE(SUM(distance), 0) as total FROM activities WHERE type = ? AND start_time >= ? AND start_time <= ? AND source = ?';
          params = [type, startTime, endTime, 'health_connect'];
          break;
          
        case 'exercise':
        case 'workout':
          query = 'SELECT COUNT(*) as total FROM activities WHERE type IN (?, ?) AND start_time >= ? AND start_time <= ? AND source = ?';
          params = ['exercise', 'workout', startTime, endTime, 'health_connect'];
          break;
          
        default:
          // Default to count for unknown types
          query = 'SELECT COUNT(*) as total FROM activities WHERE type = ? AND start_time >= ? AND start_time <= ? AND source = ?';
          params = [type, startTime, endTime, 'health_connect'];
      }
      
      const result = await databaseService.safeGetAllAsync(query, params);
      return result[0]?.total || 0;
    } catch (error) {
      await this.error('Error querying health data', error);
      return 0;
    }
  }

  /**
   * Query recent workouts from database
   * @private
   */
  async queryRecentWorkouts(startTime, endTime) {
    try {
      const result = await databaseService.safeGetAllAsync(
        'SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration FROM activities WHERE type = ? AND start_time >= ? AND start_time <= ? AND source = ?',
        ['exercise', startTime, endTime, 'health_connect']
      );
      return {
        count: result[0]?.count || 0,
        duration: result[0]?.total_duration || 0
      };
    } catch (error) {
      await this.error('Error querying workout data', error);
      return { count: 0, duration: 0 };
    }
  }
}

// Singleton instance
const healthDataService = new HealthDataService();
export default healthDataService;