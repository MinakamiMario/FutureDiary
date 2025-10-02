// src/services/healthDataService.js
// Unified health data integration service for Google Fit (Android) and Apple Health (iOS)

import BaseService from './BaseService';
import databaseService from './databaseSelector';
import { Platform } from 'react-native';

// Constants for better maintainability
const HEALTH_PERMISSIONS = {
  IOS: [
    'Steps', 'DistanceWalkingRunning', 'ActiveEnergyBurned', 'HeartRate',
    'Workout', 'Sleep', 'Weight', 'Height', 'BodyMass', 'Cycling', 'Swimming', 'Running'
  ],
  ANDROID: [
    'com.google.step_count.delta',
    'com.google.distance.delta',
    'com.google.calories.expended',
    'com.google.heart_rate.bpm',
    'com.google.activity.segment'
  ]
};

const DEMO_HEALTH_DATA = {
  steps: 8500 + Math.floor(Math.random() * 3000),
  calories: 2200 + Math.floor(Math.random() * 800),
  distance: 6.2 + Math.random() * 2,
  activeMinutes: 45 + Math.floor(Math.random() * 30),
  heartRate: 72 + Math.floor(Math.random() * 20),
  isTracking: true
};

class HealthDataService extends BaseService {
  constructor() {
    super('HealthDataService');
    this.isHealthKitAvailable = false;
    this.isGoogleFitAvailable = false;
    this.healthKit = null;
    this.googleFit = null;
  }

  async onInitialize() {
    await this.info('Health data service initialiseren...');
    
    try {
      if (Platform.OS === 'ios') {
        await this.initializeAppleHealth();
      } else if (Platform.OS === 'android') {
        await this.initializeGoogleFit();
      }
      
      await this.info(`Health data service geïnitialiseerd - iOS: ${this.isHealthKitAvailable}, Android: ${this.isGoogleFitAvailable}`);
    } catch (error) {
      await this.error('Health data service initialization failed', error);
      // Ensure demo mode is available even if initialization fails
      this.isHealthKitAvailable = false;
      this.isGoogleFitAvailable = false;
    }
  }

  // Initialize Apple Health (iOS)
  async initializeAppleHealth() {
    try {
      if (Platform.OS !== 'ios') {
        await this.warn('Apple Health alleen beschikbaar op iOS');
        return;
      }

      // Enable Apple Health for production builds
      if (__DEV__) {
        await this.info('Apple Health development mode - attempting real integration');
      }

      // Try to import Apple Health module dynamically with fallback
      try {
        // Check if Apple Health module exists
        require.resolve('react-native-health');
        const healthKitImport = await import('react-native-health');
        const HealthKit = healthKitImport;
        const healthKitModule = HealthKit.default || HealthKit;
        
        // Verify the module has the required methods
        if (!healthKitModule || typeof healthKitModule.isAvailableAsync !== 'function') {
          throw new Error('Apple Health module not properly loaded');
        }
        
        this.healthKit = healthKitModule;

        // Check if HealthKit is available
        const isAvailable = await this.healthKit.isAvailableAsync();
        if (!isAvailable) {
          await this.warn('Apple Health niet beschikbaar op dit apparaat');
          return;
        }

        // Request permissions
        const permissions = {
          permissions: {
            read: [
              this.healthKit.Constants.Permissions.Steps,
              this.healthKit.Constants.Permissions.DistanceWalkingRunning,
              this.healthKit.Constants.Permissions.ActiveEnergyBurned,
              this.healthKit.Constants.Permissions.HeartRate,
              this.healthKit.Constants.Permissions.Workout,
              this.healthKit.Constants.Permissions.Sleep,
              this.healthKit.Constants.Permissions.Weight,
              this.healthKit.Constants.Permissions.Height,
              this.healthKit.Constants.Permissions.BodyMass,
              this.healthKit.Constants.Permissions.Cycling,
              this.healthKit.Constants.Permissions.Swimming,
              this.healthKit.Constants.Permissions.Running
            ]
          }
        };

        const authResult = await this.healthKit.requestPermissionsAsync(permissions);
        if (authResult) {
          this.isHealthKitAvailable = true;
          await this.info('Apple Health toegang verkregen');
        } else {
          await this.warn('Apple Health toegang geweigerd');
        }
      } catch (importError) {
        await this.warn('Apple Health package niet beschikbaar - mogelijk APK build vereist', importError);
        this.isHealthKitAvailable = false;
      }
    } catch (error) {
      await this.warn('Apple Health initialisatie overgeslagen - demo mode actief', error);
      this.isHealthKitAvailable = false;
    }
  }

  // Initialize Google Fit (Android)
  async initializeGoogleFit() {
    try {
      if (Platform.OS !== 'android') {
        await this.warn('Google Fit alleen beschikbaar op Android');
        return;
      }

      // Try Google Fit initialization in both development and production
      await this.info('Attempting Google Fit initialization...');

      // Enable real Google Fit integration for production with fallback
      try {
        // Check if Google Fit module exists
        require.resolve('react-native-google-fit');
        const googleFitImport = await import('react-native-google-fit');
        const googleFitModule = googleFitImport.default || googleFitImport;
        
        // Verify the module has the required methods
        if (!googleFitModule || typeof googleFitModule.authorize !== 'function') {
          throw new Error('Google Fit module not properly loaded');
        }
        
        this.googleFit = googleFitModule;

        // Configure Google Fit options
        const options = {
          scopes: [
            'https://www.googleapis.com/auth/fitness.activity.read',
            'https://www.googleapis.com/auth/fitness.location.read',
            'https://www.googleapis.com/auth/fitness.body.read',
            'https://www.googleapis.com/auth/fitness.nutrition.read'
          ]
        };

        // Initialize and authorize
        const authResult = await this.googleFit.authorize(options);
        if (authResult.success) {
          this.isGoogleFitAvailable = true;
          await this.info('Google Fit toegang verkregen');
        } else {
          await this.warn('Google Fit toegang geweigerd');
        }
      } catch (importError) {
        await this.warn('Google Fit package niet beschikbaar - mogelijk APK build vereist', importError);
        this.isGoogleFitAvailable = false;
      }
    } catch (error) {
      await this.warn('Google Fit initialisatie overgeslagen - demo mode actief', error);
      this.isGoogleFitAvailable = false;
    }
  }

  // Check health data availability
  async getHealthDataAvailability() {
    const inDemoMode = this.isDemoMode();
    
    return {
      platform: Platform.OS,
      appleHealthAvailable: this.isHealthKitAvailable,
      googleFitAvailable: this.isGoogleFitAvailable,
      hasHealthAccess: this.isHealthKitAvailable || this.isGoogleFitAvailable || inDemoMode,
      supportedDataTypes: this.getSupportedDataTypes(),
      demoMode: inDemoMode
    };
  }

  // Get supported data types based on platform
  getSupportedDataTypes() {
    const dataTypes = [];
    
    // In Expo Go or when health platforms are available
    if (this.isHealthKitAvailable || this.isGoogleFitAvailable || this.isDemoMode()) {
      dataTypes.push(
        'steps',
        'distance',
        'calories',
        'heart_rate',
        'workouts',
        'weight',
        'sleep'
      );
      
      if (this.isHealthKitAvailable || (this.isDemoMode() && Platform.OS === 'ios')) {
        dataTypes.push('active_energy', 'cycling', 'swimming', 'running');
      }
      
      if (this.isGoogleFitAvailable || (this.isDemoMode() && Platform.OS === 'android')) {
        dataTypes.push('location', 'nutrition', 'hydration');
      }
    }
    
    return dataTypes;
  }

  // Check if we're in demo mode (Expo Go or emulator)
  isDemoMode() {
    // Production detection
    const isProductionBuild = typeof __DEV__ === 'undefined' || __DEV__ === false;
    const isEmulator = this.isRunningInEmulator();
    
    // In production on real device, ONLY use demo mode if explicitly no health platforms after initialization attempt
    if (isProductionBuild && !isEmulator) {
      // Try to force initialization if not already done
      if (!this.isHealthKitAvailable && !this.isGoogleFitAvailable) {
        console.warn('HealthDataService: Production device but no health platforms initialized - checking native packages availability');
        // Still try native first, only use demo if absolutely no choice
        return false; // Let import functions try native first
      }
      return false; // Production on real device should use native
    }
    
    // Development mode or emulator - use demo mode
    return true;
  }

  // Detect if running in emulator
  isRunningInEmulator() {
    try {
      // Check for emulator-specific indicators
      const deviceInfo = require('react-native-device-info');
      const brand = deviceInfo.getBrand();
      const deviceId = deviceInfo.getDeviceId();
      
      // Common emulator/device detection patterns
      const emulatorIndicators = [
        'google', 'sdk', 'emulator', 'generic', 'unknown',
        'goldfish', 'ranchu', 'qemu', 'vbox86p'
      ];
      
      const deviceIdLower = deviceId.toLowerCase();
      const brandLower = brand.toLowerCase();
      
      return emulatorIndicators.some(indicator => 
        deviceIdLower.includes(indicator) || brandLower.includes(indicator)
      );
    } catch (error) {
      // If device info fails, assume real device (safer)
      return false;
    }
  }

  // Import comprehensive health data from specified date range
  async importHealthData(startDate, endDate, dataTypes = ['all']) {
    if (!this.isHealthKitAvailable && !this.isGoogleFitAvailable && !this.isDemoMode()) {
      return {
        success: false,
        message: 'Geen gezondheidsdata toegang beschikbaar'
      };
    }

    // In demo mode, generate demo data
    if (this.isDemoMode()) {
      return await this.importDemoHealthData(startDate, endDate, dataTypes);
    }

    try {
      let importResults = {
        success: true,
        imported: 0,
        details: {},
        errors: []
      };

      await this.info(`Importing health data from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`);

      // Import from Apple Health (iOS)
      if (this.isHealthKitAvailable) {
        const appleResults = await this.importFromAppleHealth(startDate, endDate, dataTypes);
        importResults.imported += appleResults.imported;
        importResults.details.apple = appleResults;
        if (appleResults.errors?.length > 0) {
          importResults.errors.push(...appleResults.errors);
        }
      }

      // Import from Google Fit (Android) - with runtime initialization attempt
      if (this.isGoogleFitAvailable || (Platform.OS === 'android' && !this.isDemoMode())) {
        try {
          // Try to initialize Google Fit if not already available
          if (!this.isGoogleFitAvailable && Platform.OS === 'android') {
            await this.info('Attempting runtime Google Fit initialization...');
            await this.initializeGoogleFit();
          }
          
          if (this.isGoogleFitAvailable) {
            const googleResults = await this.importFromGoogleFit(startDate, endDate, dataTypes);
            importResults.imported += googleResults.imported;
            importResults.details.google = googleResults;
            if (googleResults.errors?.length > 0) {
              importResults.errors.push(...googleResults.errors);
            }
          } else {
            await this.warn('Google Fit not available after initialization attempt, using demo fallback');
            const demoResults = await this.importDemoHealthData(startDate, endDate, dataTypes);
            importResults.imported += demoResults.imported;
            importResults.details.google = { demo: true, ...demoResults };
          }
        } catch (googleFitError) {
          await this.error('Google Fit import failed, using demo fallback', googleFitError);
          const demoResults = await this.importDemoHealthData(startDate, endDate, dataTypes);
          importResults.imported += demoResults.imported;
          importResults.details.google = { demo: true, fallback_used: true, ...demoResults };
        }
      }

      await this.info(`Health data import completed: ${importResults.imported} items imported`);
      return importResults;

    } catch (error) {
      await this.error('Health data import failed', error);
      return {
        success: false,
        message: error.message,
        imported: 0
      };
    }
  }

  // Import data from Apple Health
  async importFromAppleHealth(startDate, endDate, dataTypes) {
    const results = {
      imported: 0,
      details: {},
      errors: []
    };

    try {
      const options = {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      };

      // Import steps
      if (dataTypes.includes('all') || dataTypes.includes('steps')) {
        try {
          const stepsData = await this.healthKit.getSamples('stepCount', options);
          const stepsImported = await this.processAppleSteps(stepsData);
          results.imported += stepsImported;
          results.details.steps = stepsImported;
        } catch (error) {
          results.errors.push(`Steps import failed: ${error.message}`);
        }
      }

      // Import distance
      if (dataTypes.includes('all') || dataTypes.includes('distance')) {
        try {
          const distanceData = await this.healthKit.getSamples('distanceWalkingRunning', options);
          const distanceImported = await this.processAppleDistance(distanceData);
          results.imported += distanceImported;
          results.details.distance = distanceImported;
        } catch (error) {
          results.errors.push(`Distance import failed: ${error.message}`);
        }
      }

      // Import calories
      if (dataTypes.includes('all') || dataTypes.includes('calories')) {
        try {
          const caloriesData = await this.healthKit.getSamples('activeEnergyBurned', options);
          const caloriesImported = await this.processAppleCalories(caloriesData);
          results.imported += caloriesImported;
          results.details.calories = caloriesImported;
        } catch (error) {
          results.errors.push(`Calories import failed: ${error.message}`);
        }
      }

      // Import workouts
      if (dataTypes.includes('all') || dataTypes.includes('workouts')) {
        try {
          const workoutsData = await this.healthKit.getSamples('workout', options);
          const workoutsImported = await this.processAppleWorkouts(workoutsData);
          results.imported += workoutsImported;
          results.details.workouts = workoutsImported;
        } catch (error) {
          results.errors.push(`Workouts import failed: ${error.message}`);
        }
      }

      // Import heart rate
      if (dataTypes.includes('all') || dataTypes.includes('heart_rate')) {
        try {
          const heartRateData = await this.healthKit.getSamples('heartRate', options);
          const heartRateImported = await this.processAppleHeartRate(heartRateData);
          results.imported += heartRateImported;
          results.details.heart_rate = heartRateImported;
        } catch (error) {
          results.errors.push(`Heart rate import failed: ${error.message}`);
        }
      }

      // Import sleep
      if (dataTypes.includes('all') || dataTypes.includes('sleep')) {
        try {
          const sleepData = await this.healthKit.getSamples('sleepAnalysis', options);
          const sleepImported = await this.processAppleSleep(sleepData);
          results.imported += sleepImported;
          results.details.sleep = sleepImported;
        } catch (error) {
          results.errors.push(`Sleep import failed: ${error.message}`);
        }
      }

    } catch (error) {
      await this.error('Apple Health import error', error);
      results.errors.push(`Apple Health error: ${error.message}`);
    }

    return results;
  }

  // Import data from Google Fit
  async importFromGoogleFit(startDate, endDate, dataTypes) {
    const results = {
      imported: 0,
      details: {},
      errors: []
    };

    try {
      const options = {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      };

      // Import steps
      if (dataTypes.includes('all') || dataTypes.includes('steps')) {
        try {
          const stepsData = await this.googleFit.getDailyStepCountSamples(options);
          const stepsImported = await this.processGoogleSteps(stepsData);
          results.imported += stepsImported;
          results.details.steps = stepsImported;
        } catch (error) {
          results.errors.push(`Steps import failed: ${error.message}`);
        }
      }

      // Import distance
      if (dataTypes.includes('all') || dataTypes.includes('distance')) {
        try {
          const distanceData = await this.googleFit.getDailyDistanceSamples(options);
          const distanceImported = await this.processGoogleDistance(distanceData);
          results.imported += distanceImported;
          results.details.distance = distanceImported;
        } catch (error) {
          results.errors.push(`Distance import failed: ${error.message}`);
        }
      }

      // Import calories
      if (dataTypes.includes('all') || dataTypes.includes('calories')) {
        try {
          const caloriesData = await this.googleFit.getDailyCalorieSamples(options);
          const caloriesImported = await this.processGoogleCalories(caloriesData);
          results.imported += caloriesImported;
          results.details.calories = caloriesImported;
        } catch (error) {
          results.errors.push(`Calories import failed: ${error.message}`);
        }
      }

      // Import activities/workouts
      if (dataTypes.includes('all') || dataTypes.includes('workouts')) {
        try {
          const activitiesData = await this.googleFit.getActivitySamples(options);
          const activitiesImported = await this.processGoogleActivities(activitiesData);
          results.imported += activitiesImported;
          results.details.workouts = activitiesImported;
        } catch (error) {
          results.errors.push(`Activities import failed: ${error.message}`);
        }
      }

      // Import heart rate
      if (dataTypes.includes('all') || dataTypes.includes('heart_rate')) {
        try {
          const heartRateData = await this.googleFit.getHeartRateSamples(options);
          const heartRateImported = await this.processGoogleHeartRate(heartRateData);
          results.imported += heartRateImported;
          results.details.heart_rate = heartRateImported;
        } catch (error) {
          results.errors.push(`Heart rate import failed: ${error.message}`);
        }
      }

    } catch (error) {
      await this.error('Google Fit import error', error);
      results.errors.push(`Google Fit error: ${error.message}`);
    }

    return results;
  }

  // Process Apple Health steps data
  async processAppleSteps(stepsData) {
    let imported = 0;
    
    for (const sample of stepsData) {
      try {
        await databaseService.saveActivity({
          type: 'steps',
          startTime: new Date(sample.startDate).getTime(),
          endTime: new Date(sample.endDate || sample.startDate).getTime(),
          value: parseFloat(sample.value),
          source: 'apple_health',
          metadata: {
            end_date: sample.endDate,
            source_name: sample.sourceName || 'Apple Health',
            device: sample.device || null
          }
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Apple steps', error);
      }
    }
    
    return imported;
  }

  // Process Apple Health distance data
  async processAppleDistance(distanceData) {
    let imported = 0;
    
    for (const sample of distanceData) {
      try {
        // Save to health_data table instead of activities
        await databaseService.insertDataToSQLite('health_data', {
          type: 'distance',
          value: parseFloat(sample.value),
          unit: sample.unit || 'm',
          source: 'apple_health',
          timestamp: new Date(sample.startDate).getTime(),
          metadata: JSON.stringify({
            end_date: sample.endDate,
            source_name: sample.sourceName || 'Apple Health',
            device: sample.device || null
          })
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Apple distance', error);
      }
    }
    
    return imported;
  }

  // Process Apple Health calories data
  async processAppleCalories(caloriesData) {
    let imported = 0;
    
    for (const sample of caloriesData) {
      try {
        // Save to health_data table instead of activities  
        await databaseService.insertDataToSQLite('health_data', {
          type: 'calories',
          value: parseFloat(sample.value),
          unit: sample.unit || 'kcal',
          source: 'apple_health',
          timestamp: new Date(sample.startDate).getTime(),
          metadata: JSON.stringify({
            end_date: sample.endDate,
            source_name: sample.sourceName || 'Apple Health',
            device: sample.device || null
          })
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Apple calories', error);
      }
    }
    
    return imported;
  }

  // Process Apple Health workouts data
  async processAppleWorkouts(workoutsData) {
    let imported = 0;
    
    for (const workout of workoutsData) {
      try {
        const sportType = this.mapAppleWorkoutType(workout.activityType);
        const duration = Math.round((new Date(workout.endDate) - new Date(workout.startDate)) / 1000 / 60); // minutes
        
        await databaseService.saveActivity({
          type: 'workout',
          sport_type: sportType,
          startTime: new Date(workout.startDate).getTime(),
          endTime: new Date(workout.endDate).getTime(),
          duration: duration,
          calories: workout.totalEnergyBurned ? parseFloat(workout.totalEnergyBurned.value) : 0,
          distance: workout.totalDistance ? parseFloat(workout.totalDistance.value) : 0,
          source: 'apple_health',
          metadata: {
            activity_type: workout.activityType,
            source_name: workout.sourceName || 'Apple Health',
            device: workout.device || null,
            total_energy_burned: workout.totalEnergyBurned || null,
            total_distance: workout.totalDistance || null
          }
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Apple workout', error);
      }
    }
    
    return imported;
  }

  // Process Apple Health heart rate data
  async processAppleHeartRate(heartRateData) {
    let imported = 0;
    
    for (const sample of heartRateData) {
      try {
        await databaseService.saveActivity({
          type: 'heart_rate',
          startTime: new Date(sample.startDate).getTime(),
          endTime: new Date(sample.endDate || sample.startDate).getTime(),
          value: parseFloat(sample.value),
          source: 'apple_health',
          metadata: {
            end_date: sample.endDate,
            source_name: sample.sourceName || 'Apple Health',
            unit: sample.unit || 'bpm',
            device: sample.device || null
          }
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Apple heart rate', error);
      }
    }
    
    return imported;
  }

  // Process Apple Health sleep data
  async processAppleSleep(sleepData) {
    let imported = 0;
    
    for (const sample of sleepData) {
      try {
        const duration = Math.round((new Date(sample.endDate) - new Date(sample.startDate)) / 1000 / 60); // minutes
        
        await databaseService.saveActivity({
          type: 'sleep',
          startTime: new Date(sample.startDate).getTime(),
          endTime: new Date(sample.endDate).getTime(),
          duration: duration,
          source: 'apple_health',
          metadata: {
            sleep_stage: sample.value || 'unknown',
            source_name: sample.sourceName || 'Apple Health',
            device: sample.device || null
          }
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Apple sleep', error);
      }
    }
    
    return imported;
  }

  // Process Google Fit steps data
  async processGoogleSteps(stepsData) {
    let imported = 0;
    
    for (const sample of stepsData) {
      try {
        for (const step of sample.steps) {
          await databaseService.saveActivity({
            type: 'steps',
            startTime: new Date(step.date).getTime(),
            endTime: new Date(step.date).getTime() + (24 * 60 * 60 * 1000), // End of day
            value: step.value,
            source: 'google_fit',
            metadata: {
              source_name: sample.source || 'Google Fit'
            }
          });
          imported++;
        }
      } catch (error) {
        await this.error('Error saving Google steps', error);
      }
    }
    
    return imported;
  }

  // Process Google Fit distance data
  async processGoogleDistance(distanceData) {
    let imported = 0;
    
    for (const sample of distanceData) {
      try {
        // Save to health_data table instead of activities
        await databaseService.insertDataToSQLite('health_data', {
          type: 'distance',
          value: sample.distance,
          unit: 'm',
          source: 'google_fit',
          timestamp: new Date(sample.date).getTime(),
          metadata: JSON.stringify({
            source_name: sample.source || 'Google Fit'
          })
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Google distance', error);
      }
    }
    
    return imported;
  }

  // Process Google Fit calories data
  async processGoogleCalories(caloriesData) {
    let imported = 0;
    
    for (const sample of caloriesData) {
      try {
        // Save to health_data table instead of activities
        await databaseService.insertDataToSQLite('health_data', {
          type: 'calories',
          value: sample.calorie,
          unit: 'kcal',
          source: 'google_fit',
          timestamp: new Date(sample.date).getTime(),
          metadata: JSON.stringify({
            source_name: sample.source || 'Google Fit'
          })
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Google calories', error);
      }
    }
    
    return imported;
  }

  // Process Google Fit activities data
  async processGoogleActivities(activitiesData) {
    let imported = 0;
    
    for (const activity of activitiesData) {
      try {
        const sportType = this.mapGoogleActivityType(activity.activityName);
        const duration = Math.round((activity.end - activity.start) / 1000 / 60); // minutes
        
        await databaseService.saveActivity({
          type: 'workout',
          sport_type: sportType,
          startTime: activity.start,
          endTime: activity.end,
          duration: duration,
          calories: activity.calories || 0,
          distance: activity.distance || 0,
          source: 'google_fit',
          metadata: {
            activity_name: activity.activityName,
            source_name: activity.sourceName || 'Google Fit'
          }
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Google activity', error);
      }
    }
    
    return imported;
  }

  // Process Google Fit heart rate data
  async processGoogleHeartRate(heartRateData) {
    let imported = 0;
    
    for (const sample of heartRateData) {
      try {
        await databaseService.saveActivity({
          type: 'heart_rate',
          startTime: new Date(sample.startDate).getTime(),
          endTime: new Date(sample.endDate || sample.startDate).getTime(),
          value: sample.value,
          source: 'google_fit',
          metadata: {
            end_date: sample.endDate,
            source_name: 'Google Fit'
          }
        });
        imported++;
      } catch (error) {
        await this.error('Error saving Google heart rate', error);
      }
    }
    
    return imported;
  }

  // Map Apple Health workout types to our sport types
  mapAppleWorkoutType(appleType) {
    const mapping = {
      'HKWorkoutActivityTypeRunning': 'running',
      'HKWorkoutActivityTypeWalking': 'walking',
      'HKWorkoutActivityTypeCycling': 'cycling',
      'HKWorkoutActivityTypeSwimming': 'swimming',
      'HKWorkoutActivityTypeYoga': 'yoga',
      'HKWorkoutActivityTypeTennis': 'tennis',
      'HKWorkoutActivityTypeFootball': 'football',
      'HKWorkoutActivityTypeBasketball': 'basketball',
      'HKWorkoutActivityTypeHiking': 'hiking',
      'HKWorkoutActivityTypeSkiing': 'skiing',
      'HKWorkoutActivityTypeSnowboarding': 'snowboarding',
      'HKWorkoutActivityTypeRowing': 'rowing',
      'HKWorkoutActivityTypeCrossTraining': 'crossfit',
      'HKWorkoutActivityTypeClimbing': 'climbing',
      'HKWorkoutActivityTypeSurfing': 'surfing',
      'HKWorkoutActivityTypeGolf': 'golf',
      'HKWorkoutActivityTypeFunctionalStrengthTraining': 'gym',
      'HKWorkoutActivityTypeTraditionalStrengthTraining': 'gym'
    };
    
    return mapping[appleType] || appleType.toLowerCase().replace(/hkworkoutactivitytype/i, '');
  }

  // Map Google Fit activity types to our sport types
  mapGoogleActivityType(googleType) {
    const mapping = {
      'running': 'running',
      'walking': 'walking',
      'biking': 'cycling',
      'swimming': 'swimming',
      'yoga': 'yoga',
      'tennis': 'tennis',
      'football': 'football',
      'basketball': 'basketball',
      'hiking': 'hiking',
      'skiing': 'skiing',
      'snowboarding': 'snowboarding',
      'rowing': 'rowing',
      'crossfit': 'crossfit',
      'rock_climbing': 'climbing',
      'surfing': 'surfing',
      'golf': 'golf',
      'strength_training': 'gym',
      'weight_lifting': 'gym'
    };
    
    return mapping[googleType] || googleType.toLowerCase();
  }

  // Quick import for last 30 days
  async importLast30Days(dataTypes = ['all']) {
    const endDate = Date.now();
    const startDate = endDate - (30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    return await this.importHealthData(startDate, endDate, dataTypes);
  }

  // Quick import for last 7 days
  async importLastWeek(dataTypes = ['all']) {
    const endDate = Date.now();
    const startDate = endDate - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    return await this.importHealthData(startDate, endDate, dataTypes);
  }

  // Get import statistics
  async getImportStats() {
    try {
      // Get counts by source
      const appleHealthCount = await databaseService.safeGetAllAsync(
        'SELECT COUNT(*) as count FROM activities WHERE source = ?',
        ['apple_health']
      );
      
      const googleFitCount = await databaseService.safeGetAllAsync(
        'SELECT COUNT(*) as count FROM activities WHERE source = ?',
        ['google_fit']
      );
      
      // Get latest import dates
      const latestApple = await databaseService.safeGetAllAsync(
        'SELECT MAX(start_time) as latest FROM activities WHERE source = ?',
        ['apple_health']
      );
      
      const latestGoogle = await databaseService.safeGetAllAsync(
        'SELECT MAX(start_time) as latest FROM activities WHERE source = ?',
        ['google_fit']
      );
      
      return {
        apple_health: {
          count: appleHealthCount[0]?.count || 0,
          latest_import: latestApple[0]?.latest || null
        },
        google_fit: {
          count: googleFitCount[0]?.count || 0,
          latest_import: latestGoogle[0]?.latest || null
        },
        total_imported: (appleHealthCount[0]?.count || 0) + (googleFitCount[0]?.count || 0)
      };
    } catch (error) {
      await this.error('Error getting import stats', error);
      return {
        apple_health: { count: 0, latest_import: null },
        google_fit: { count: 0, latest_import: null },
        total_imported: 0
      };
    }
  }

  // Get current health statistics with improved maintainability
  async getCurrentStats() {
    try {
      // Use constants for time calculations
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const WEEK_MS = 7 * DAY_MS;
      const yesterday = now - DAY_MS;
      const weekAgo = now - WEEK_MS;

      // If in demo mode, return demo data
      if (this.isDemoMode()) {
        return this._getDemoStats();
      }

      // Parallel database queries for better performance
      const [
        dailySteps,
        dailyCalories,
        dailyDistance,
        weeklySteps,
        weeklyCalories,
        weeklyDistance,
        workoutStats
      ] = await Promise.all([
        this._queryHealthData('steps', yesterday, now),
        this._queryActivityData('calories', yesterday, now),
        this._queryActivityData('distance', yesterday, now),
        this._queryHealthData('steps', weekAgo, now),
        this._queryActivityData('calories', weekAgo, now),
        this._queryActivityData('distance', weekAgo, now),
        this._queryWorkoutStats(weekAgo, now)
      ]);

      return {
        daily: {
          steps: dailySteps || 0,
          calories: dailyCalories || 0,
          distance: dailyDistance || 0
        },
        weekly: {
          steps: weeklySteps || 0,
          calories: weeklyCalories || 0,
          distance: weeklyDistance || 0,
          workouts: workoutStats.count || 0,
          workout_duration: workoutStats.duration || 0
        },
        platform: Platform.OS,
        last_updated: now,
        demo_mode: this.isDemoMode()
      };
    } catch (error) {
      await this.error('Error getting current stats', error);
      return this._getEmptyStats();
    }
  }

  // Helper method for health data queries
  async _queryHealthData(type, startTime, endTime) {
    const result = await databaseService.safeGetAllAsync(
      'SELECT COALESCE(SUM(value), 0) as total FROM health_data WHERE type = ? AND timestamp >= ? AND timestamp <= ?',
      [type, startTime, endTime]
    );
    return result[0]?.total || 0;
  }

  // Helper method for activity data queries
  async _queryActivityData(field, startTime, endTime) {
    const result = await databaseService.safeGetAllAsync(
      `SELECT COALESCE(SUM(${field}), 0) as total FROM activities WHERE start_time >= ? AND start_time <= ?`,
      [startTime, endTime]
    );
    return result[0]?.total || 0;
  }

  // Helper method for workout statistics
  async _queryWorkoutStats(startTime, endTime) {
    const result = await databaseService.safeGetAllAsync(
      'SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration FROM activities WHERE type = ? AND start_time >= ? AND start_time <= ?',
      ['workout', startTime, endTime]
    );
    return {
      count: result[0]?.count || 0,
      duration: result[0]?.total_duration || 0
    };
  }

  // Get demo stats using constants
  _getDemoStats() {
    return {
      daily: {
        steps: DEMO_HEALTH_DATA.steps,
        calories: Math.floor(DEMO_HEALTH_DATA.calories * 0.3),
        distance: DEMO_HEALTH_DATA.distance
      },
      weekly: {
        steps: DEMO_HEALTH_DATA.steps * 7,
        calories: DEMO_HEALTH_DATA.calories,
        distance: DEMO_HEALTH_DATA.distance * 7,
        workouts: 3 + Math.floor(Math.random() * 4),
        workout_duration: DEMO_HEALTH_DATA.activeMinutes * 7
      },
      platform: Platform.OS,
      last_updated: Date.now(),
      demo_mode: true
    };
  }

  // Get empty stats structure
  _getEmptyStats() {
    return {
      daily: { steps: 0, calories: 0, distance: 0 },
      weekly: { steps: 0, calories: 0, distance: 0, workouts: 0, workout_duration: 0 },
      platform: Platform.OS,
      last_updated: Date.now(),
      demo_mode: false
    };
  }

  // Import demo health data for Expo Go development
  async importDemoHealthData(startDate, endDate, dataTypes = ['all']) {
    try {
      await this.info('Generating demo health data for development...');
      
      // Validate inputs
      if (!startDate || !endDate || startDate >= endDate) {
        throw new Error('Invalid date range for demo data generation');
      }
      
      const daysToGenerate = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
      if (daysToGenerate > 365) {
        throw new Error('Date range too large for demo data generation (max 365 days)');
      }
      
      let imported = 0;
      const details = {};

      // Generate demo steps data
      if (dataTypes.includes('all') || dataTypes.includes('steps')) {
        try {
          const stepsData = this.generateDemoSteps(startDate, endDate);
          if (Array.isArray(stepsData)) {
            for (const dayData of stepsData) {
              await databaseService.saveActivity({
                type: 'steps',
                startTime: dayData.timestamp,
                endTime: dayData.timestamp + (24 * 60 * 60 * 1000), // End of day
                value: dayData.steps,
                source: Platform.OS === 'ios' ? 'demo_apple_health' : 'demo_google_fit',
                metadata: {
                  demo_mode: true,
                  platform: Platform.OS
                }
              });
              imported++;
            }
            details.steps = stepsData.length;
          }
        } catch (stepsError) {
          await this.warn('Failed to generate demo steps data', stepsError);
          details.steps = 0;
        }
      }

      // Generate demo workouts data
      if (dataTypes.includes('all') || dataTypes.includes('workouts')) {
        try {
          const workoutsData = this.generateDemoWorkouts(startDate, endDate);
          if (Array.isArray(workoutsData)) {
            for (const workout of workoutsData) {
              await databaseService.saveActivity({
                type: 'workout',
                sport_type: workout.sport_type,
                startTime: workout.start_time,
                endTime: workout.end_time,
                duration: workout.duration,
            calories: workout.calories,
            distance: workout.distance,
            heart_rate_avg: workout.heart_rate_avg,
            heart_rate_max: workout.heart_rate_max,
            source: Platform.OS === 'ios' ? 'demo_apple_health' : 'demo_google_fit',
            metadata: {
              demo_mode: true,
              platform: Platform.OS,
              activity_type: workout.activity_type
            }
          });
          imported++;
        }
        details.workouts = workoutsData.length;
          }
        } catch (workoutsError) {
          await this.warn('Failed to generate demo workouts data', workoutsError);
          details.workouts = 0;
        }
      }

      // Generate demo calories data
      if (dataTypes.includes('all') || dataTypes.includes('calories')) {
        try {
          const caloriesData = this.generateDemoCalories(startDate, endDate);
          if (Array.isArray(caloriesData)) {
            for (const dayData of caloriesData) {
              await databaseService.saveActivity({
                type: 'calories',
                startTime: dayData.timestamp,
                endTime: dayData.timestamp + (24 * 60 * 60 * 1000), // End of day
                value: dayData.calories,
                source: Platform.OS === 'ios' ? 'demo_apple_health' : 'demo_google_fit',
            metadata: {
              demo_mode: true,
              platform: 'android'
            }
          });
          imported++;
        }
        details.calories = caloriesData.length;
          }
        } catch (caloriesError) {
          await this.warn('Failed to generate demo calories data', caloriesError);
          details.calories = 0;
        }
      }

      return {
        success: true,
        imported: imported,
        details: {
          [Platform.OS === 'ios' ? 'apple' : 'google']: details
        },
        message: `Demo health data generated for ${daysToGenerate} days`
      };

    } catch (error) {
      await this.error('Demo health data generation failed', error);
      return {
        success: false,
        message: 'Demo data generation failed',
        imported: 0
      };
    }
  }

  // Generate demo steps data
  generateDemoSteps(startDate, endDate) {
    const steps = [];
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (let timestamp = startDate; timestamp <= endDate; timestamp += oneDay) {
      const dayOfWeek = new Date(timestamp).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // More steps on weekends, less on weekdays
      const baseSteps = isWeekend ? 12000 : 8000;
      const variation = Math.random() * 4000 - 2000; // ±2000 steps
      const dailySteps = Math.max(1000, Math.floor(baseSteps + variation));
      
      steps.push({
        timestamp: timestamp,
        steps: dailySteps
      });
    }
    
    return steps;
  }

  // Generate demo workouts data
  generateDemoWorkouts(startDate, endDate) {
    const workouts = [];
    const oneDay = 24 * 60 * 60 * 1000;
    const sportTypes = ['running', 'cycling', 'swimming', 'gym', 'yoga', 'tennis', 'walking'];
    
    for (let timestamp = startDate; timestamp <= endDate; timestamp += oneDay) {
      const dayOfWeek = new Date(timestamp).getDay();
      const workoutProbability = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.4 : 0.2;
      
      if (Math.random() < workoutProbability) {
        const sportType = sportTypes[Math.floor(Math.random() * sportTypes.length)];
        const baseDuration = sportType === 'running' ? 45 : 
                           sportType === 'cycling' ? 60 : 
                           sportType === 'swimming' ? 30 : 40;
        
        const duration = Math.floor(baseDuration + (Math.random() * 30 - 15)); // ±15 minutes
        const startTime = timestamp + (Math.random() * 8 * 60 * 60 * 1000); // Random time during day
        const endTime = startTime + (duration * 60 * 1000);
        
        const baseCalories = sportType === 'running' ? 450 : 
                           sportType === 'cycling' ? 600 : 
                           sportType === 'swimming' ? 350 : 300;
        
        const calories = Math.floor(baseCalories + (Math.random() * 150 - 75));
        
        const baseDistance = sportType === 'running' ? 8 : 
                           sportType === 'cycling' ? 25 : 
                           sportType === 'walking' ? 5 : 0;
        
        const distance = sportType !== 'gym' && sportType !== 'yoga' ? 
                        parseFloat((baseDistance + (Math.random() * 5 - 2.5)).toFixed(1)) : 0;

        workouts.push({
          sport_type: sportType,
          activity_type: sportType.charAt(0).toUpperCase() + sportType.slice(1),
          start_time: startTime,
          end_time: endTime,
          duration: duration,
          calories: calories,
          distance: distance,
          heart_rate_avg: 140 + Math.floor(Math.random() * 40), // 140-180 bpm
          heart_rate_max: 170 + Math.floor(Math.random() * 30)  // 170-200 bpm
        });
      }
    }
    
    return workouts;
  }

  // Generate demo calories data
  generateDemoCalories(startDate, endDate) {
    const calories = [];
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (let timestamp = startDate; timestamp <= endDate; timestamp += oneDay) {
      const baseCalories = 2000; // Base daily calories
      const variation = Math.random() * 400 - 200; // ±200 calories
      const dailyCalories = Math.max(1200, Math.floor(baseCalories + variation));
      
      calories.push({
        timestamp: timestamp,
        calories: dailyCalories
      });
    }
    
    return calories;
  }
}

// Singleton instance
const healthDataService = new HealthDataService();
export default healthDataService;