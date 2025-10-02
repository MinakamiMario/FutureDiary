// src/services/samsungHealthService.js
// Samsung Health integration for comprehensive health data import

import { NativeModules, NativeEventEmitter } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import databaseService from './database';
import errorHandler from './errorLogger';
import platformDetector from '../utils/platformDetector';

// Samsung Health native module - fallback to mock if unavailable
let SamsungHealthModule;
try {
  SamsungHealthModule = NativeModules.SamsungHealth;
} catch (error) {
  if (__DEV__) console.warn('Samsung Health native module not available, using mock implementation');
  SamsungHealthModule = null;
}

// Samsung Health data types mapping
const SAMSUNG_HEALTH_DATA_TYPES = {
  STEP_COUNT: 'com.samsung.health.step_count',
  HEART_RATE: 'com.samsung.health.heart_rate', 
  SLEEP: 'com.samsung.health.sleep',
  CALORIES_BURNED: 'com.samsung.health.calories_burned',
  EXERCISE: 'com.samsung.health.exercise',
  WEIGHT: 'com.samsung.health.weight',
  BLOOD_PRESSURE: 'com.samsung.health.blood_pressure',
  BODY_TEMPERATURE: 'com.samsung.health.body_temperature',
  OXYGEN_SATURATION: 'com.samsung.health.oxygen_saturation',
  STRESS: 'com.samsung.health.stress',
  WATER_INTAKE: 'com.samsung.health.water_intake',
  NUTRITION: 'com.samsung.health.nutrition',
  DISTANCE: 'com.samsung.health.distance'
};

// Required permissions for Samsung Health
const REQUIRED_PERMISSIONS = [
  SAMSUNG_HEALTH_DATA_TYPES.STEP_COUNT,
  SAMSUNG_HEALTH_DATA_TYPES.HEART_RATE,
  SAMSUNG_HEALTH_DATA_TYPES.SLEEP,
  SAMSUNG_HEALTH_DATA_TYPES.CALORIES_BURNED,
  SAMSUNG_HEALTH_DATA_TYPES.EXERCISE,
  SAMSUNG_HEALTH_DATA_TYPES.WEIGHT,
  SAMSUNG_HEALTH_DATA_TYPES.BLOOD_PRESSURE,
  SAMSUNG_HEALTH_DATA_TYPES.BODY_TEMPERATURE,
  SAMSUNG_HEALTH_DATA_TYPES.OXYGEN_SATURATION,
  SAMSUNG_HEALTH_DATA_TYPES.STRESS,
  SAMSUNG_HEALTH_DATA_TYPES.WATER_INTAKE,
  SAMSUNG_HEALTH_DATA_TYPES.NUTRITION,
  SAMSUNG_HEALTH_DATA_TYPES.DISTANCE
];

class SamsungHealthService {
  constructor() {
    this.isConnected = false;
    this.permissions = [];
    this.eventEmitter = null;
    this.syncInProgress = false;
    this.platformInfo = null;
    
    if (SamsungHealthModule) {
      this.eventEmitter = new NativeEventEmitter(SamsungHealthModule);
    }
    
    // Initialize platform detection
    this.initializePlatform();
  }

  /**
   * Initialize platform detection
   */
  async initializePlatform() {
    try {
      this.platformInfo = await platformDetector.detectPlatform();
    } catch (error) {
      console.warn('Platform detection failed in Samsung Health service:', error);
      this.platformInfo = { isEmulator: false, shouldUseMockData: false };
    }
  }

  /**
   * Check if Samsung Health app is installed on the device
   */
  async isSamsungHealthAppInstalled() {
    try {
      if (this.platformInfo?.shouldUseMockData) {
        return true; // Always available in emulator demo mode
      }

      // For Samsung devices, assume Samsung Health is available
      // Samsung Health comes pre-installed on most Samsung devices
      try {
        const brand = await DeviceInfo.getBrand();
        if (brand && brand.toLowerCase().includes('samsung')) {
          console.log('Samsung device detected - assuming Samsung Health is available');
          return true;
        }
      } catch (brandError) {
        console.warn('Could not detect device brand:', brandError);
      }

      // For non-Samsung devices or when in doubt, try to detect the app
      // Method 1: Check if native module can detect the app
      if (SamsungHealthModule && SamsungHealthModule.isAppInstalled) {
        return await SamsungHealthModule.isAppInstalled();
      }

      // Method 2: Try to use Android package manager
      try {
        const { Linking } = require('react-native');
        // Try multiple Samsung Health package URLs
        const canOpenHealth = await Linking.canOpenURL('samsunghealth://');
        const canOpenHealthMain = await Linking.canOpenURL('com.sec.android.app.shealth://');
        return canOpenHealth || canOpenHealthMain;
      } catch (linkError) {
        console.log('Samsung Health app detection via linking failed');
      }

      // Default: assume it might be available (user will find out when they try to connect)
      console.log('Samsung Health availability unknown - letting user try to connect');
      return true;
    } catch (error) {
      console.warn('Samsung Health app detection failed:', error);
      // Default to true - better UX to let user try than to block them
      return true;
    }
  }

  /**
   * Initialize Samsung Health connection
   */
  async initialize() {
    try {
      // Ensure platform detection is complete
      if (!this.platformInfo) {
        await this.initializePlatform();
      }

      // Check if Samsung Health app is installed
      const appInstalled = await this.isSamsungHealthAppInstalled();

      // On real devices, only use Samsung Health if native module is available
      if (!SamsungHealthModule) {
        if (this.platformInfo.shouldUseMockData) {
          // Emulator - Demo mode
          console.log('Samsung Health - Demo mode active (emulator detected)');
          this.isConnected = true;
          this.permissions = REQUIRED_PERMISSIONS;
          return { 
            success: true, 
            mock: true, 
            message: 'Demo mode - Samsung Health simulation active',
            appInstalled: true
          };
        } else {
          // Real device without Samsung Health native module
          console.log('Samsung Health - Will need manual connection to Samsung Health app');
          this.isConnected = false;
          return { 
            success: true, 
            mock: false, 
            message: appInstalled ? 'Samsung Health app gedetecteerd - klik om te verbinden' : 'Samsung Health app moet geïnstalleerd worden', 
            requiresManualConnection: true,
            appInstalled: appInstalled
          };
        }
      }

      // Real device with Samsung Health module - use real API
      console.log('Samsung Health - Initializing real Samsung Health SDK');
      const result = await SamsungHealthModule.initialize();
      
      if (result.success) {
        this.isConnected = true;
        console.log('Samsung Health initialized successfully on real device');
        
        // Setup event listeners
        this.setupEventListeners();
        
        return { success: true, mock: false, appInstalled: true };
      } else {
        throw new Error(result.error || 'Failed to initialize Samsung Health');
      }
    } catch (error) {
      errorHandler.error('Samsung Health initialization failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, appInstalled: false };
    }
  }

  /**
   * Setup event listeners for Samsung Health updates
   */
  setupEventListeners() {
    if (!this.eventEmitter) return;

    // Listen for health data updates
    this.eventEmitter.addListener('SamsungHealthDataUpdated', (data) => {
      if (__DEV__) console.log('Samsung Health data updated:', data.dataType);
      this.handleHealthDataUpdate(data);
    });

    // Listen for connection status changes
    this.eventEmitter.addListener('SamsungHealthConnectionChanged', (status) => {
      this.isConnected = status.connected;
      if (__DEV__) console.log('Samsung Health connection status:', status.connected);
    });
  }

  /**
   * Connect to Samsung Health (combines initialize + request permissions)
   */
  async connect() {
    try {
      console.log('Samsung Health - Starting connection process...');
      
      // First initialize
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
      
      // If mock mode, we're already "connected"
      if (initResult.mock) {
        return {
          success: true,
          message: 'Samsung Health demo mode actief',
          mock: true
        };
      }
      
      // If requires manual connection, show realistic message
      if (initResult.requiresManualConnection) {
        return {
          success: true,
          message: 'Samsung Health vereist complexe SDK integratie en app registratie bij Samsung.\n\nVoor echte gezondheidsdata raden we Google Fit aan (werkt direct).\n\nSamsung Health kan wel in demo mode met voorbeelddata.',
          requiresManualConnection: true,
          appInstalled: initResult.appInstalled,
          fallbackToGoogleFit: true
        };
      }
      
      // Real device with native module - request permissions
      return await this.requestPermissions();
    } catch (error) {
      errorHandler.error('Samsung Health connection failed', error, 'SamsungHealthService');
      return { success: false, error: error.message };
    }
  }

  /**
   * Request permissions for Samsung Health data access
   */
  async requestPermissions() {
    try {
      if (!SamsungHealthModule) {
        if (this.platformInfo?.shouldUseMockData) {
          // Mock permissions for emulator only
          this.permissions = REQUIRED_PERMISSIONS;
          return { success: true, permissions: this.permissions };
        } else {
          throw new Error('Samsung Health not available on this device');
        }
      }

      const result = await SamsungHealthModule.requestPermissions(REQUIRED_PERMISSIONS);
      
      if (result.success) {
        this.permissions = result.grantedPermissions || [];
        if (__DEV__) console.log('Samsung Health permissions granted:', this.permissions.length);
        return { success: true, permissions: this.permissions };
      } else {
        throw new Error(result.error || 'Permission request failed');
      }
    } catch (error) {
      errorHandler.error('Samsung Health permission request failed', error, 'SamsungHealthService');
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if Samsung Health is available and connected
   */
  isAvailable() {
    // If platform detection not ready, assume real device and show as available
    if (!this.platformInfo) {
      return true;
    }

    // On emulator, always available (demo mode)
    if (this.platformInfo.shouldUseMockData) {
      return true;
    }

    // On real device, always show as available
    // User can try to connect and we'll show appropriate message
    return true;
  }

  /**
   * Get connection status details
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasPermissions: this.permissions.length > 0,
      permissions: this.permissions,
      isReady: this.isReady(),
      requiresManualConnection: !this.isConnected && !this.platformInfo?.shouldUseMockData,
      appInstalled: true // Will be properly checked in real implementation
    };
  }

  /**
   * Check if service is connected and has permissions
   */
  isReady() {
    return this.isConnected && this.permissions.length > 0;
  }

  /**
   * Sync all health data from Samsung Health
   */
  async syncAllHealthData(startDate = null, endDate = null) {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    try {
      this.syncInProgress = true;
      
      if (!startDate) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
      }
      
      if (!endDate) {
        endDate = new Date();
      }

      const results = {
        steps: await this.syncStepData(startDate, endDate),
        heartRate: await this.syncHeartRateData(startDate, endDate),
        sleep: await this.syncSleepData(startDate, endDate),
        calories: await this.syncCaloriesData(startDate, endDate),
        exercise: await this.syncExerciseData(startDate, endDate),
        weight: await this.syncWeightData(startDate, endDate),
        bloodPressure: await this.syncBloodPressureData(startDate, endDate),
        stress: await this.syncStressData(startDate, endDate),
        waterIntake: await this.syncWaterIntakeData(startDate, endDate),
        nutrition: await this.syncNutritionData(startDate, endDate)
      };

      const totalSynced = Object.values(results).reduce((sum, result) => 
        sum + (result.synced || 0), 0
      );

      if (__DEV__) console.log(`Samsung Health sync completed: ${totalSynced} records synced`);

      return {
        success: true,
        totalSynced,
        results,
        timeRange: { startDate, endDate }
      };

    } catch (error) {
      errorHandler.error('Samsung Health full sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync step count data
   */
  async syncStepData(startDate, endDate) {
    try {
      let stepData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        // Mock data for emulator only
        stepData = this.generateMockStepData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readStepCount(
          startDate.getTime(),
          endDate.getTime()
        );
        stepData = result.data || [];
      }

      let synced = 0;
      for (const step of stepData) {
        await databaseService.executeQuery(
          `INSERT OR REPLACE INTO health_data (type, value, timestamp, source, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            'steps',
            step.count,
            step.timestamp,
            'samsung_health',
            JSON.stringify({
              deviceId: step.deviceId,
              source: step.source,
              binningType: step.binningType
            })
          ]
        );
        synced++;
      }

      return { success: true, synced, dataType: 'steps' };
    } catch (error) {
      errorHandler.error('Step data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Sync heart rate data
   */
  async syncHeartRateData(startDate, endDate) {
    try {
      let heartRateData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        heartRateData = this.generateMockHeartRateData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readHeartRate(
          startDate.getTime(),
          endDate.getTime()
        );
        heartRateData = result.data || [];
      }

      let synced = 0;
      for (const hr of heartRateData) {
        await databaseService.executeQuery(
          `INSERT OR REPLACE INTO health_data (type, value, timestamp, source, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            'heart_rate',
            hr.rate,
            hr.timestamp,
            'samsung_health',
            JSON.stringify({
              min: hr.min,
              max: hr.max,
              context: hr.context
            })
          ]
        );
        synced++;
      }

      return { success: true, synced, dataType: 'heart_rate' };
    } catch (error) {
      errorHandler.error('Heart rate data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Sync sleep data
   */
  async syncSleepData(startDate, endDate) {
    try {
      let sleepData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        sleepData = this.generateMockSleepData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readSleep(
          startDate.getTime(),
          endDate.getTime()
        );
        sleepData = result.data || [];
      }

      let synced = 0;
      for (const sleep of sleepData) {
        await databaseService.executeQuery(
          `INSERT OR REPLACE INTO health_data (type, value, timestamp, source, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            'sleep',
            sleep.duration,
            sleep.startTime,
            'samsung_health',
            JSON.stringify({
              endTime: sleep.endTime,
              efficiency: sleep.efficiency,
              stage: sleep.stage,
              quality: sleep.quality
            })
          ]
        );
        synced++;
      }

      return { success: true, synced, dataType: 'sleep' };
    } catch (error) {
      errorHandler.error('Sleep data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Sync calorie data
   */
  async syncCaloriesData(startDate, endDate) {
    try {
      let calorieData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        calorieData = this.generateMockCalorieData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readCaloriesBurned(
          startDate.getTime(),
          endDate.getTime()
        );
        calorieData = result.data || [];
      }

      let synced = 0;
      for (const calorie of calorieData) {
        await databaseService.executeQuery(
          `INSERT OR REPLACE INTO health_data (type, value, timestamp, source, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            'calories',
            calorie.calories,
            calorie.timestamp,
            'samsung_health',
            JSON.stringify({
              type: calorie.type, // active, basal
              activity: calorie.activity
            })
          ]
        );
        synced++;
      }

      return { success: true, synced, dataType: 'calories' };
    } catch (error) {
      errorHandler.error('Calorie data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Sync exercise/workout data
   */
  async syncExerciseData(startDate, endDate) {
    try {
      let exerciseData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        exerciseData = this.generateMockExerciseData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readExercise(
          startDate.getTime(),
          endDate.getTime()
        );
        exerciseData = result.data || [];
      }

      let synced = 0;
      for (const exercise of exerciseData) {
        await databaseService.saveActivity({
          type: 'exercise',
          sport_type: exercise.exerciseType,
          start_time: exercise.startTime,
          end_time: exercise.endTime,
          duration: exercise.duration,
          calories: exercise.calories,
          distance: exercise.distance,
          source: 'samsung_health',
          metadata: JSON.stringify({
            stepCount: exercise.stepCount,
            endTime: exercise.endTime,
            maxSpeed: exercise.maxSpeed,
            meanSpeed: exercise.meanSpeed,
            maxHeartRate: exercise.maxHeartRate,
            meanHeartRate: exercise.meanHeartRate,
            location: exercise.location
          })
        });
        synced++;
      }

      return { success: true, synced, dataType: 'exercise' };
    } catch (error) {
      errorHandler.error('Exercise data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Sync weight data
   */
  async syncWeightData(startDate, endDate) {
    try {
      let weightData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        weightData = this.generateMockWeightData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readWeight(
          startDate.getTime(),
          endDate.getTime()
        );
        weightData = result.data || [];
      }

      let synced = 0;
      for (const weight of weightData) {
        await databaseService.executeQuery(
          `INSERT OR REPLACE INTO health_data (type, value, timestamp, source, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            'weight',
            weight.weight,
            weight.timestamp,
            'samsung_health',
            JSON.stringify({
              unit: weight.unit,
              bodyFat: weight.bodyFat,
              muscleMass: weight.muscleMass
            })
          ]
        );
        synced++;
      }

      return { success: true, synced, dataType: 'weight' };
    } catch (error) {
      errorHandler.error('Weight data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Sync blood pressure data
   */
  async syncBloodPressureData(startDate, endDate) {
    try {
      let bpData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        bpData = this.generateMockBloodPressureData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readBloodPressure(
          startDate.getTime(),
          endDate.getTime()
        );
        bpData = result.data || [];
      }

      let synced = 0;
      for (const bp of bpData) {
        await databaseService.executeQuery(
          `INSERT OR REPLACE INTO health_data (type, value, timestamp, source, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            'blood_pressure',
            bp.systolic,
            bp.timestamp,
            'samsung_health',
            JSON.stringify({
              diastolic: bp.diastolic,
              pulse: bp.pulse,
              mean: bp.mean
            })
          ]
        );
        synced++;
      }

      return { success: true, synced, dataType: 'blood_pressure' };
    } catch (error) {
      errorHandler.error('Blood pressure data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Sync stress data
   */
  async syncStressData(startDate, endDate) {
    try {
      let stressData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        stressData = this.generateMockStressData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readStress(
          startDate.getTime(),
          endDate.getTime()
        );
        stressData = result.data || [];
      }

      let synced = 0;
      for (const stress of stressData) {
        await databaseService.executeQuery(
          `INSERT OR REPLACE INTO health_data (type, value, timestamp, source, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            'stress',
            stress.score,
            stress.timestamp,
            'samsung_health',
            JSON.stringify({
              level: stress.level, // low, normal, high
              context: stress.context
            })
          ]
        );
        synced++;
      }

      return { success: true, synced, dataType: 'stress' };
    } catch (error) {
      errorHandler.error('Stress data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Sync water intake data
   */
  async syncWaterIntakeData(startDate, endDate) {
    try {
      let waterData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        waterData = this.generateMockWaterData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readWaterIntake(
          startDate.getTime(),
          endDate.getTime()
        );
        waterData = result.data || [];
      }

      let synced = 0;
      for (const water of waterData) {
        await databaseService.executeQuery(
          `INSERT OR REPLACE INTO health_data (type, value, timestamp, source, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            'water_intake',
            water.amount,
            water.timestamp,
            'samsung_health',
            JSON.stringify({
              unit: water.unit
            })
          ]
        );
        synced++;
      }

      return { success: true, synced, dataType: 'water_intake' };
    } catch (error) {
      errorHandler.error('Water intake data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Sync nutrition data
   */
  async syncNutritionData(startDate, endDate) {
    try {
      let nutritionData = [];

      if (!SamsungHealthModule && this.platformInfo?.shouldUseMockData) {
        nutritionData = this.generateMockNutritionData(startDate, endDate);
      } else if (SamsungHealthModule) {
        const result = await SamsungHealthModule.readNutrition(
          startDate.getTime(),
          endDate.getTime()
        );
        nutritionData = result.data || [];
      }

      let synced = 0;
      for (const nutrition of nutritionData) {
        await databaseService.executeQuery(
          `INSERT OR REPLACE INTO health_data (type, value, timestamp, source, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            'nutrition',
            nutrition.calories,
            nutrition.timestamp,
            'samsung_health',
            JSON.stringify({
              carbs: nutrition.carbs,
              protein: nutrition.protein,
              fat: nutrition.fat,
              fiber: nutrition.fiber,
              sugar: nutrition.sugar,
              sodium: nutrition.sodium
            })
          ]
        );
        synced++;
      }

      return { success: true, synced, dataType: 'nutrition' };
    } catch (error) {
      errorHandler.error('Nutrition data sync failed', error, 'SamsungHealthService');
      return { success: false, error: error.message, synced: 0 };
    }
  }

  /**
   * Get latest health data summary
   */
  async getHealthSummary(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const [steps, calories, heartRate, sleep] = await Promise.all([
        this.getStepsForDate(startOfDay, endOfDay),
        this.getCaloriesForDate(startOfDay, endOfDay),
        this.getHeartRateForDate(startOfDay, endOfDay),
        this.getSleepForDate(startOfDay, endOfDay)
      ]);

      return {
        date: date.toISOString().split('T')[0],
        steps: steps.total,
        calories: calories.total,
        heartRate: heartRate.average,
        sleep: sleep.duration,
        source: 'samsung_health'
      };
    } catch (error) {
      errorHandler.error('Health summary retrieval failed', error, 'SamsungHealthService');
      return null;
    }
  }

  /**
   * Get steps for specific date range
   */
  async getStepsForDate(startDate, endDate) {
    try {
      const result = await databaseService.executeQuery(
        `SELECT SUM(value) as total FROM health_data 
         WHERE type = 'steps' AND source = 'samsung_health' 
         AND timestamp >= ? AND timestamp <= ?`,
        [startDate.getTime(), endDate.getTime()]
      );

      return { total: result[0]?.total || 0 };
    } catch (error) {
      return { total: 0 };
    }
  }

  /**
   * Get calories for specific date range
   */
  async getCaloriesForDate(startDate, endDate) {
    try {
      const result = await databaseService.executeQuery(
        `SELECT SUM(value) as total FROM health_data 
         WHERE type = 'calories' AND source = 'samsung_health' 
         AND timestamp >= ? AND timestamp <= ?`,
        [startDate.getTime(), endDate.getTime()]
      );

      return { total: result[0]?.total || 0 };
    } catch (error) {
      return { total: 0 };
    }
  }

  /**
   * Get heart rate for specific date range
   */
  async getHeartRateForDate(startDate, endDate) {
    try {
      const result = await databaseService.executeQuery(
        `SELECT AVG(value) as average, MIN(value) as min, MAX(value) as max FROM health_data 
         WHERE type = 'heart_rate' AND source = 'samsung_health' 
         AND timestamp >= ? AND timestamp <= ?`,
        [startDate.getTime(), endDate.getTime()]
      );

      const row = result[0] || {};
      return { 
        average: Math.round(row.average || 0),
        min: row.min || 0,
        max: row.max || 0
      };
    } catch (error) {
      return { average: 0, min: 0, max: 0 };
    }
  }

  /**
   * Get sleep for specific date range
   */
  async getSleepForDate(startDate, endDate) {
    try {
      const result = await databaseService.executeQuery(
        `SELECT SUM(value) as duration FROM health_data 
         WHERE type = 'sleep' AND source = 'samsung_health' 
         AND timestamp >= ? AND timestamp <= ?`,
        [startDate.getTime(), endDate.getTime()]
      );

      return { duration: result[0]?.duration || 0 };
    } catch (error) {
      return { duration: 0 };
    }
  }

  /**
   * Handle Samsung Health data updates
   */
  async handleHealthDataUpdate(data) {
    try {
      // Auto-sync specific data type when updated
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      switch (data.dataType) {
        case SAMSUNG_HEALTH_DATA_TYPES.STEP_COUNT:
          await this.syncStepData(startDate, endDate);
          break;
        case SAMSUNG_HEALTH_DATA_TYPES.HEART_RATE:
          await this.syncHeartRateData(startDate, endDate);
          break;
        case SAMSUNG_HEALTH_DATA_TYPES.SLEEP:
          await this.syncSleepData(startDate, endDate);
          break;
        case SAMSUNG_HEALTH_DATA_TYPES.CALORIES_BURNED:
          await this.syncCaloriesData(startDate, endDate);
          break;
        default:
          if (__DEV__) console.log('Unhandled Samsung Health data type:', data.dataType);
      }
    } catch (error) {
      errorHandler.error('Samsung Health data update handling failed', error, 'SamsungHealthService');
    }
  }

  // Mock data generators for development/emulator
  generateMockStepData(startDate, endDate) {
    const data = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const steps = 2000 + Math.round(Math.random() * 8000); // 2000-10000 steps
      data.push({
        count: steps,
        timestamp: currentDate.getTime(),
        deviceId: 'mock_device',
        source: 'mock',
        binningType: 'daily'
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  generateMockHeartRateData(startDate, endDate) {
    const data = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const rate = 60 + Math.round(Math.random() * 40); // 60-100 bpm
      data.push({
        rate: rate,
        min: rate - 5,
        max: rate + 15,
        timestamp: currentDate.getTime(),
        context: 'resting'
      });
      currentDate.setHours(currentDate.getHours() + 6);
    }
    
    return data;
  }

  generateMockSleepData(startDate, endDate) {
    const data = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const bedtime = new Date(currentDate);
      bedtime.setHours(23, 0, 0, 0);
      const wakeup = new Date(currentDate);
      wakeup.setDate(wakeup.getDate() + 1);
      wakeup.setHours(7, 0, 0, 0);
      
      const duration = wakeup.getTime() - bedtime.getTime();
      
      data.push({
        startTime: bedtime.getTime(),
        endTime: wakeup.getTime(),
        duration: duration,
        efficiency: 80 + Math.round(Math.random() * 15), // 80-95%
        stage: 'deep',
        quality: 'good'
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  generateMockCalorieData(startDate, endDate) {
    const data = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const calories = 1800 + Math.round(Math.random() * 600); // 1800-2400 calories
      data.push({
        calories: calories,
        timestamp: currentDate.getTime(),
        type: 'active',
        activity: 'daily'
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  generateMockExerciseData(startDate, endDate) {
    const data = [];
    const exercises = ['walking', 'running', 'cycling', 'swimming'];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (Math.random() > 0.7) { // 30% chance of exercise per day
        const exercise = exercises[Math.floor(Math.random() * exercises.length)];
        const duration = 20 + Math.round(Math.random() * 40); // 20-60 minutes
        const startTime = new Date(currentDate);
        startTime.setHours(18, 0, 0, 0);
        
        data.push({
          exerciseType: exercise,
          startTime: startTime.getTime(),
          endTime: startTime.getTime() + (duration * 60 * 1000),
          duration: duration * 60 * 1000,
          calories: duration * 8,
          distance: exercise === 'running' ? duration * 0.15 : duration * 0.08,
          stepCount: exercise === 'running' ? duration * 150 : duration * 100,
          maxSpeed: Math.random() * 15,
          meanSpeed: Math.random() * 10,
          maxHeartRate: 140 + Math.round(Math.random() * 40),
          meanHeartRate: 120 + Math.round(Math.random() * 20)
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  generateMockWeightData(startDate, endDate) {
    const data = [];
    const baseWeight = 70 + Math.random() * 30; // 70-100 kg base
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (Math.random() > 0.9) { // 10% chance per day
        data.push({
          weight: baseWeight + (Math.random() - 0.5) * 2, // ±1kg variation
          timestamp: currentDate.getTime(),
          unit: 'kg',
          bodyFat: 15 + Math.random() * 10,
          muscleMass: 30 + Math.random() * 10
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  generateMockBloodPressureData(startDate, endDate) {
    const data = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (Math.random() > 0.8) { // 20% chance per day
        const systolic = 110 + Math.round(Math.random() * 30); // 110-140
        const diastolic = 70 + Math.round(Math.random() * 20); // 70-90
        
        data.push({
          systolic: systolic,
          diastolic: diastolic,
          pulse: 60 + Math.round(Math.random() * 30),
          mean: Math.round((systolic + 2 * diastolic) / 3),
          timestamp: currentDate.getTime()
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  generateMockStressData(startDate, endDate) {
    const data = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (Math.random() > 0.6) { // 40% chance per day
        const score = Math.round(Math.random() * 100);
        let level = 'normal';
        if (score < 30) level = 'low';
        else if (score > 70) level = 'high';
        
        data.push({
          score: score,
          level: level,
          timestamp: currentDate.getTime(),
          context: 'measurement'
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  generateMockWaterData(startDate, endDate) {
    const data = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const amount = 1500 + Math.round(Math.random() * 1000); // 1.5-2.5L per day
      data.push({
        amount: amount,
        timestamp: currentDate.getTime(),
        unit: 'ml'
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  generateMockNutritionData(startDate, endDate) {
    const data = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const calories = 1800 + Math.round(Math.random() * 600);
      data.push({
        calories: calories,
        carbs: Math.round(calories * 0.5 / 4), // 50% carbs
        protein: Math.round(calories * 0.2 / 4), // 20% protein  
        fat: Math.round(calories * 0.3 / 9), // 30% fat
        fiber: 20 + Math.round(Math.random() * 15),
        sugar: 50 + Math.round(Math.random() * 30),
        sodium: 2000 + Math.round(Math.random() * 1000),
        timestamp: currentDate.getTime()
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }
}

export default new SamsungHealthService();