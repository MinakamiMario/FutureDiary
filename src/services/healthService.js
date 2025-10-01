// src/services/healthService.js
// Assume Android mobile app
import { Platform } from 'react-native';
import { BaseService } from './BaseService';
import databaseService from './database';
import errorHandler from './errorLogger';
// Mock constants for React Native without Expo
const MockConstants = {
  executionEnvironment: 'standalone',
  manifest: {
    name: 'MinakamiApp',
    version: '1.0.0'
  }
};

const Constants = MockConstants;
import { generateDemoSportsData, generateDemoStravaData, generateDemoStepsData } from '../utils/demoSportsData';

// Conditional imports based on platform
let AppleHealthKit, GoogleFit;

// Production detection for real device usage
const isProductionBuild = typeof __DEV__ === 'undefined' || __DEV__ === false;

// Enable native health packages in production builds
if (Platform.OS === 'ios' && isProductionBuild) {
  try {
    AppleHealthKit = require('react-native-health').default;
    console.info('✅ Apple Health native package loaded successfully');
  } catch (error) {
    console.warn('⚠️ Apple Health not available:', error.message);
  }
}

if (Platform.OS === 'android') {
  try {
    GoogleFit = require('react-native-google-fit');
    console.info('✅ Google Fit native package loaded successfully');
  } catch (error) {
    console.warn('⚠️ Google Fit not available:', error.message);
    if (!isProductionBuild) {
      console.info('Using demo health data in development');
    }
  }
}

// Utility function to detect if running in Expo Go
const isExpoGo = () => {
  // Always return false for bare React Native builds
  return false;
};

class HealthService extends BaseService {
  constructor() {
    super('HealthService');
    this.isHealthAvailable = this.checkHealthAvailability();
    this.lastSyncDate = null;
    
    // Set demo mode based on production status and native package availability
    this.isDemoMode = this.determineDemoMode();
    
    if (this.isDemoMode) {
      console.log('HealthService: Running in demo mode');
    } else {
      console.log('HealthService: Using native health packages');
    }
  }

  determineDemoMode() {
    // In production, only use demo mode if native packages are unavailable
    if (isProductionBuild) {
      return !GoogleFit && !AppleHealthKit;
    }
    // In development, use demo mode by default
    return true;
  }

  checkHealthAvailability() {
    if (isExpoGo()) {
      // In Expo Go, we'll use demo mode for health data
      return __DEV__; // Available in development for demo purposes
    }
    
    // Assume Android mobile app
    if (GoogleFit) {  
      return true;
    }
    
    // For APK builds without packages, return false
    return false;
  }

  async onInitialize() {
    // Health data service is now managed separately
    try {
      // Health data service initialization is handled independently
      await this.info('HealthService initialized - health data service runs independently');
    } catch (error) {
      await this.warn('Health service initialization failed', error);
    }

    if (!this.isHealthAvailable) {
      await this.info('Health services niet beschikbaar in huidige omgeving');
      return;
    }

    try {
      if (__DEV__) {
        await this.info('Health service running in demo mode (Expo Go)');
      } else if (false) {
        await this.initializeAppleHealth();
      } else if (true) {
        await this.initializeGoogleFit();
      }
      
      await this.info('Health service succesvol geïnitialiseerd');
    } catch (error) {
      await this.error('Fout bij initialiseren health service', error);
    }
  }

  async initializeAppleHealth() {
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.Sleep,
        ],
        write: [], // We alleen lezen, niet schrijven
      },
    };

    return new Promise((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (error) => {
        if (error) {
          console.error('Apple Health initialization failed:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async initializeGoogleFit() {
    try {
      const isAvailable = await GoogleFit.isAvailable();
      if (!isAvailable) {
        throw new Error('Google Fit niet beschikbaar');
      }

      const options = {
        scopes: [
          'https://www.googleapis.com/auth/fitness.activity.read',
          'https://www.googleapis.com/auth/fitness.body.read',
          'https://www.googleapis.com/auth/fitness.heart_rate.read',
          'https://www.googleapis.com/auth/fitness.sleep.read',
        ],
      };

      await GoogleFit.authorize(options);
      return true;
    } catch (error) {
      console.error('Google Fit initialization failed:', error);
      throw error;
    }
  }

  // Import historical step data
  async importHistoricalStepData(daysBack = 30) {
    if (!this.isHealthAvailable) {
      return { success: false, message: 'Health services niet beschikbaar' };
    }

    try {
      // Use demo mode fallback if native packages not available
      if (this.isDemoMode) {
        return await this.importDemoStepData(daysBack);
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      let stepData = [];

      // Try Google Fit first
      if (GoogleFit) {
        try {
          const options = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            bucketUnit: 'DAY',
            bucketInterval: 1,
          };

          stepData = await GoogleFit.getDailyStepCountSamples(options);
          console.log(`✅ Google Fit: Imported ${stepData.length} days of step data`);
        } catch (googleFitError) {
          console.warn('Google Fit step import failed, trying demo fallback:', googleFitError);
          return await this.importDemoStepData(daysBack);
        }
      } else {
        // No native package available, use demo data
        return await this.importDemoStepData(daysBack);
      }
      let workoutData = [];

      // Use real health data when available, fallback to demo in development
      if (Platform.OS === 'ios' && AppleHealthKit) {
        stepData = await this.getAppleHealthSteps(startDate, endDate);
        workoutData = await this.getAppleHealthWorkouts(startDate, endDate);
      } else if (Platform.OS === 'android' && GoogleFit) {
        stepData = await this.getGoogleFitSteps(startDate, endDate);
        workoutData = await this.getGoogleFitWorkouts(startDate, endDate);
      } else if (__DEV__) {
        // Generate demo data only in development when real services unavailable
        stepData = this.generateDemoStepData(daysBack);
        workoutData = this.generateDemoWorkoutData(daysBack);
      } else {
        // Production without health services - return empty data
        stepData = [];
        workoutData = [];
      }

      // Save steps data
      for (const dayData of stepData) {
        // Determine source based on actual data source
        let source = 'unknown';
        if (Platform.OS === 'ios' && AppleHealthKit) {
          source = 'apple_health';
        } else if (Platform.OS === 'android' && GoogleFit) {
          source = 'google_fit';
        } else if (__DEV__) {
          source = 'demo_health';
        }

        await databaseService.saveActivity({
          type: 'steps',
          value: dayData.steps,
          date: dayData.date,
          source: source,
          timestamp: dayData.date
        });
      }

      // Save workout data
      for (const workout of workoutData) {
        // Determine source based on actual data source
        let source = 'unknown';
        if (Platform.OS === 'ios' && AppleHealthKit) {
          source = 'apple_health';
        } else if (Platform.OS === 'android' && GoogleFit) {
          source = 'google_fit';
        } else if (__DEV__) {
          source = 'demo_health';
        }

        await databaseService.saveActivity({
          type: 'workout',
          value: workout.duration,
          date: workout.date,
          source: source,
          timestamp: workout.date,
          metadata: {
            sport_type: workout.type,
            calories: workout.calories,
            distance: workout.distance,
            duration: workout.duration
          }
        });
      }

      await this.info(`${stepData.length} dagen stappen en ${workoutData.length} workouts geïmporteerd`);
      return { 
        success: true, 
        message: `${stepData.length} dagen stappen en ${workoutData.length} workouts geïmporteerd${__DEV__ ? ' (demo mode)' : ''}`,
        imported: stepData.length,
        workouts: workoutData.length
      };

    } catch (error) {
      await this.error('Fout bij importeren historische data', error);
      return { success: false, message: error.message };
    }
  }

  // Generate demo step data for testing
  generateDemoStepData(daysBack = 30) {
    const stepData = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (let i = 0; i < daysBack; i++) {
      const dayTimestamp = now - (i * oneDay);
      const baseSteps = 6000; // Base step count
      const variation = Math.random() * 8000; // Random variation 0-8000
      const weekdayBonus = new Date(dayTimestamp).getDay() >= 1 && new Date(dayTimestamp).getDay() <= 5 ? 2000 : 0; // Weekday bonus
      
      const dailySteps = Math.floor(baseSteps + variation + weekdayBonus);
      
      stepData.push({
        date: dayTimestamp,
        steps: dailySteps
      });
    }

    return stepData.reverse(); // Oldest first
  }

  // Generate demo workout data for testing
  generateDemoWorkoutData(daysBack = 30) {
    const workoutData = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const sportTypes = [
      'running', 'cycling', 'walking', 'swimming', 'gym', 'yoga', 'tennis', 'football'
    ];

    for (let i = 0; i < daysBack; i++) {
      const dayTimestamp = now - (i * oneDay);
      const dayOfWeek = new Date(dayTimestamp).getDay();
      
      // Workouts komen vaker voor op weekenden/weekdagen
      const workoutProbability = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 0.4 : 0.6;
      
      if (Math.random() < workoutProbability) {
        const sportType = sportTypes[Math.floor(Math.random() * sportTypes.length)];
        const baseDuration = sportType === 'running' ? 30 : 
                           sportType === 'cycling' ? 45 : 
                           sportType === 'swimming' ? 25 : 35;
        
        const durationVariation = Math.random() * 30; // 0-30 minuten variatie
        const duration = Math.floor(baseDuration + durationVariation);
        
        const baseCalories = sportType === 'running' ? 300 : 
                           sportType === 'cycling' ? 400 : 
                           sportType === 'swimming' ? 250 : 200;
        
        const calories = Math.floor(baseCalories + (Math.random() * 100));
        
        const baseDistance = sportType === 'running' ? 5 : 
                           sportType === 'cycling' ? 15 : 
                           sportType === 'walking' ? 3 : 0;
        
        const distance = sportType !== 'gym' && sportType !== 'yoga' ? 
                        (baseDistance + (Math.random() * 3)).toFixed(1) : 0;

        workoutData.push({
          date: dayTimestamp,
          type: sportType,
          duration: duration,
          calories: calories,
          distance: parseFloat(distance)
        });
      }
    }

    return workoutData.reverse(); // Oldest first
  }

  async getAppleHealthWorkouts(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
      };

      AppleHealthKit.getSamples(options, (callbackError, results) => {
        if (callbackError) {
          reject(callbackError);
        } else {
          // Filter for workout samples
          const workouts = results.filter(item => item.type === 'Workout');
          const workoutData = workouts.map(item => ({
            date: new Date(item.startDate).getTime(),
            type: item.activityType || 'workout',
            duration: item.duration / 60, // minutes
            calories: item.calories || 0,
            distance: item.distance || 0
          }));
          resolve(workoutData);
        }
      });
    });
  }

  async getGoogleFitWorkouts(startDate, endDate) {
    try {
      const workoutData = await GoogleFit.getActivitySamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      return workoutData.map(record => ({
        date: new Date(record.start).getTime(),
        type: record.activityName || 'workout',
        duration: record.duration / (1000 * 60), // minutes
        calories: record.calories || 0,
        distance: record.distance || 0
      }));

    } catch (error) {
      console.error('Error reading Google Fit workouts:', error);
      throw error;
    }
  }

  async getAppleHealthSteps(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
      };

      AppleHealthKit.getDailyStepCountSamples(options, (callbackError, results) => {
        if (callbackError) {
          reject(callbackError);
        } else {
          const stepData = results.map(item => ({
            date: new Date(item.startDate).getTime(),
            steps: item.value
          }));
          resolve(stepData);
        }
      });
    });
  }

  async getGoogleFitSteps(startDate, endDate) {
    try {
      const stepData = await GoogleFit.getDailyStepCountSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      return stepData.map(record => ({
        date: new Date(record.date).getTime(),
        steps: record.value
      }));

    } catch (error) {
      console.error('Error reading Google Fit steps:', error);
      throw error;
    }
  }

  // Import today's data (for immediate display)
  async importTodayData() {
    if (!this.isHealthAvailable) {
      return { steps: 0, message: 'Health services niet beschikbaar' };
    }

    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);

      let todaySteps = 0;
      let source = '';

      // Use real health data when available, fallback to demo in development
      if (Platform.OS === 'ios' && AppleHealthKit) {
        const stepData = await this.getAppleHealthSteps(startOfDay, today);
        todaySteps = stepData.reduce((total, day) => total + day.steps, 0);
        source = 'Apple Health';
      } else if (Platform.OS === 'android' && GoogleFit) {
        const stepData = await this.getGoogleFitSteps(startOfDay, today);
        todaySteps = stepData.reduce((total, day) => total + day.steps, 0);
        source = 'Google Fit';
      } else if (__DEV__) {
        // Generate demo today's steps only in development
        const hourOfDay = today.getHours();
        const baseSteps = Math.floor((hourOfDay / 24) * 12000); // Progressive steps through the day
        const randomVariation = Math.floor(Math.random() * 2000);
        todaySteps = Math.max(baseSteps + randomVariation, 0);
        source = 'Demo Health (Development)';
      } else {
        // Production without health services
        todaySteps = 0;
        source = 'No Health Service Available';
      }

      // Save today's data with correct source
      let dbSource = 'unknown';
      if (Platform.OS === 'ios' && AppleHealthKit) {
        dbSource = 'apple_health';
      } else if (Platform.OS === 'android' && GoogleFit) {
        dbSource = 'google_fit';
      } else if (__DEV__) {
        dbSource = 'demo_health';
      }

      await databaseService.saveActivity({
        type: 'steps',
        value: todaySteps,
        date: today.getTime(),
        source: dbSource,
        timestamp: today.getTime()
      });

      return { 
        steps: todaySteps, 
        success: true,
        source: source
      };

    } catch (error) {
      await this.error('Fout bij importeren vandaag data', error);
      return { steps: 0, success: false, message: error.message };
    }
  }

  // Get available data sources
  async getAvailableDataSources() {
    const sources = {
      platform: 'android',
      healthAvailable: this.isHealthAvailable,
      canImportHistorical: this.isHealthAvailable,
      supportedDataTypes: []
    };

    if (isExpoGo() && __DEV__) {
      sources.healthPlatform = 'Demo Health (Expo Go)';
      sources.supportedDataTypes = ['steps', 'distance', 'calories'];
      sources.reason = 'Demo mode - real health data available in APK builds';
    } else if (false && this.isHealthAvailable) {
      sources.healthPlatform = 'Apple Health';
      sources.supportedDataTypes = ['steps', 'distance', 'calories', 'heart_rate', 'sleep'];
    } else if (true && this.isHealthAvailable) {
      sources.healthPlatform = 'Google Fit';
      sources.supportedDataTypes = ['steps', 'distance', 'calories', 'heart_rate', 'sleep'];
    } else {
      sources.healthPlatform = 'None';
      sources.canImportHistorical = false;
      sources.reason = isExpoGo() ? 'Install APK for real health data' : 'Health platform not available';
    }

    return sources;
  }

  // Check if we can access historical data
  async canAccessHistoricalData() {
    if (!this.isHealthAvailable) {
      return false;
    }

    try {
      // Try to read one day of data to test permissions
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - 1);
      
      if (false) {
        const testData = await this.getAppleHealthSteps(testDate, new Date());
        return testData.length >= 0;
      } else if (true) {
        const testData = await this.getGoogleFitSteps(testDate, new Date());
        return testData.length >= 0;
      }
    } catch (error) {
      if (__DEV__) console.log('Cannot access historical data:', error.message);
      return false;
    }

    return false;
  }

  // Populate demo sports data for development mode
  async populateDemoSportsData(daysBack = 30) {
    if (!__DEV__) {
      return { success: false, message: 'Demo data only available in development mode' };
    }

    try {
      await this.log('Populating demo sports data...');

      // Check if we already have sports data
      const existingSportsData = await databaseService.getSportsActivities(
        Date.now() - (daysBack * 24 * 60 * 60 * 1000),
        Date.now()
      );

      if (existingSportsData.length > 0) {
        await this.log(`Already have ${existingSportsData.length} sports activities, skipping demo data`);
        return { 
          success: true, 
          message: `Found ${existingSportsData.length} existing sports activities`,
          existing: existingSportsData.length 
        };
      }

      // Generate comprehensive demo data
      const [sportsActivities, stravaActivities, stepsActivities] = await Promise.all([
        Promise.resolve(generateDemoSportsData(daysBack, 0.6)), // 60% chance per day
        Promise.resolve(generateDemoStravaData(daysBack)),
        Promise.resolve(generateDemoStepsData(daysBack))
      ]);

      let savedCount = 0;

      // Save sports activities
      for (const activity of sportsActivities) {
        try {
          await databaseService.saveActivity({
            type: activity.type,
            startTime: activity.startTime,
            endTime: activity.endTime,
            duration: activity.duration,
            details: activity.details,
            source: activity.source,
            calories: activity.calories,
            distance: activity.distance,
            sport_type: activity.sport_type,  
            heart_rate_avg: activity.heart_rate_avg,
            heart_rate_max: activity.heart_rate_max,
            elevation_gain: activity.elevation_gain,
            metadata: activity.metadata
          });
          savedCount++;
        } catch (saveError) {
          await this.error(`Failed to save activity: ${activity.sport_type}`, saveError);
        }
      }

      // Save Strava activities
      for (const activity of stravaActivities) {
        try {
          await databaseService.saveActivity({
            type: activity.type,
            startTime: activity.startTime,
            endTime: activity.endTime,
            duration: activity.duration,
            details: activity.details,
            source: activity.source,
            calories: activity.calories,
            distance: activity.distance,
            sport_type: activity.sport_type,
            strava_id: activity.strava_id,
            heart_rate_avg: activity.heart_rate_avg,
            heart_rate_max: activity.heart_rate_max,
            elevation_gain: activity.elevation_gain,
            metadata: activity.metadata
          });
          savedCount++;
        } catch (saveError) {
          await this.error(`Failed to save Strava activity: ${activity.sport_type}`, saveError);
        }
      }

      // Save steps activities
      for (const activity of stepsActivities) {
        try {
          await databaseService.saveActivity({
            type: activity.type,
            startTime: activity.startTime,
            endTime: activity.endTime,
            duration: activity.duration,
            details: activity.details,
            source: activity.source,
            calories: activity.calories,
            distance: activity.distance,
            metadata: activity.metadata
          });
          savedCount++;
        } catch (saveError) {
          await this.error(`Failed to save steps activity`, saveError);
        }
      }

      await this.log(`Successfully populated ${savedCount} demo activities`);
      return {
        success: true,
        message: `Populated ${savedCount} demo activities`,
        saved: savedCount,
        breakdown: {
          sports: sportsActivities.length,
          strava: stravaActivities.length,
          steps: stepsActivities.length
        }
      };

    } catch (error) {
      await this.error('Failed to populate demo sports data', error);
      return { success: false, message: error.message };
    }
  }

  // Demo fallback methods for when native packages are unavailable
  async importDemoStepData(daysBack = 30) {
    try {
      console.log('HealthService: Using demo step data fallback');
      
      const stepsData = generateDemoStepsData(daysBack);
      let savedCount = 0;

      for (const stepActivity of stepsData) {
        await databaseService.saveActivity({
          type: stepActivity.type,
          startTime: stepActivity.startTime,
          endTime: stepActivity.endTime,
          duration: stepActivity.duration,
          details: stepActivity.details,
          source: 'demo_health',
          calories: stepActivity.calories,
          distance: stepActivity.distance,
          metadata: stepActivity.metadata
        });
        savedCount++;
      }

      return {
        success: true,
        message: `Demo mode: ${savedCount} dagen stappen data geïmporteerd`,
        imported: savedCount,
        fallback_used: true
      };

    } catch (error) {
      console.error('Demo step data import failed:', error);
      return { success: false, message: error.message };
    }
  }

  async importDemoWorkoutData(daysBack = 30) {
    try {
      console.log('HealthService: Using demo workout data fallback');
      
      const sportsData = generateDemoSportsData(daysBack);
      const stravaData = generateDemoStravaData(daysBack);
      const allWorkouts = [...sportsData, ...stravaData];
      
      let savedCount = 0;

      for (const workout of allWorkouts) {
        await databaseService.saveActivity({
          type: workout.type,
          startTime: workout.startTime,
          endTime: workout.endTime,
          duration: workout.duration,
          details: workout.details,
          source: workout.source,
          calories: workout.calories,
          distance: workout.distance,
          metadata: workout.metadata
        });
        savedCount++;
      }

      return {
        success: true,
        message: `Demo mode: ${savedCount} workout activiteiten geïmporteerd`,
        imported: savedCount,
        fallback_used: true
      };

    } catch (error) {
      console.error('Demo workout data import failed:', error);
      return { success: false, message: error.message };
    }
  }
}

// Singleton instance
const healthService = new HealthService();
export default healthService;