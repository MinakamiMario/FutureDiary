// src/services/activityService.js
// React Native sensors implementation
import { NativeModules, NativeEventEmitter } from 'react-native';
const { SensorManager } = NativeModules;

// Real accelerometer implementation - fallback to mock if unavailable
class RealAccelerometer {
  constructor() {
    this.listeners = [];
    this.isListening = false;
    this.intervalId = null;
  }

  addListener(callback) {
    this.listeners.push(callback);
    if (!this.isListening) {
      this.startListening();
    }
    return {
      remove: () => {
        this.listeners = this.listeners.filter(l => l !== callback);
        if (this.listeners.length === 0) {
          this.stopListening();
        }
      }
    };
  }

  startListening() {
    this.isListening = true;
    
    // Try to use real sensors first
    try {
      if (SensorManager && SensorManager.startAccelerometer) {
        // Use real accelerometer
        const eventEmitter = new NativeEventEmitter(SensorManager);
        this.sensorSubscription = eventEmitter.addListener('Accelerometer', (data) => {
          this.listeners.forEach(listener => listener(data));
        });
        SensorManager.startAccelerometer(200); // 200ms interval
      } else {
        throw new Error('Native sensors not available');
      }
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        if (__DEV__) console.warn('Real accelerometer not available, using mock data:', error);
        // Fallback to mock data only in development on emulator
        this.intervalId = setInterval(() => {
          const mockData = {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            z: (Math.random() - 0.5) * 2
          };
          this.listeners.forEach(listener => listener(mockData));
        }, 200);
      } else {
        // Production on real device - don't use mock data, report error
        console.error('ActivityService: Accelerometer not available on real device');
        throw error; // Re-throw error for proper handling
      }
    }
  }

  stopListening() {
    this.isListening = false;
    
    // Stop real sensor if available
    if (this.sensorSubscription) {
      this.sensorSubscription.remove();
      this.sensorSubscription = null;
      if (SensorManager && SensorManager.stopAccelerometer) {
        SensorManager.stopAccelerometer();
      }
    }
    
    // Stop mock data interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setUpdateInterval(interval) {
    // Mock implementation - doesn't actually change interval
  }
}

const Accelerometer = new RealAccelerometer();
// Assume Android mobile app
import databaseService from './database';
// Import real permissions - no fallback to mock/demo
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const ACTIVITY_DETECTION = 'activity-detection';
const SAMPLE_RATE = 5; // 5 samples per seconde (200ms)
const DETECTION_INTERVAL = 10000; // 10 seconden
const STEP_THRESHOLD = 10; // Drempel voor herkenning van een stap

class ActivityService {
  constructor() {
    this.isMonitoring = false;
    this.currentActivity = null;
    this.activityStartTime = null;
    this.accelerometerSubscription = null;
    this.accelerometerData = [];
    this.steps = 0;
    this.lastMagnitude = 0;
    this.isStepUp = false;
    this.setupActivityTask();
  }

  setupActivityTask() {
    // TaskManager removed - using direct monitoring instead
    if (__DEV__) console.log('Activity task setup complete - using direct monitoring');
  }

  async requestActivityRecognitionPermission() {
    try {
      if ('android' === 'android') {
        const result = await request(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION);
        return result === RESULTS.GRANTED;
      }
      return true; // iOS heeft geen specifieke toestemming nodig voor accelerometer
    } catch (error) {
      console.error('Error requesting activity recognition permission:', error);
      return false;
    }
  }

  async startMonitoring() {
    if (this.isMonitoring) {
      return { success: true, message: 'Activiteitenmonitoring is al actief' };
    }
    // Vraag eerst de benodigde permissie aan
const hasPermission = await this.requestActivityRecognitionPermission();
if (!hasPermission) {
  return {
    success: false,
    message: 'Activiteitenherkenningstoegang is vereist voor activiteitenmonitoring'
  };
}
    
    try {
      // Start accelerometer subscription
      Accelerometer.setUpdateInterval(1000 / SAMPLE_RATE);
      
      this.accelerometerSubscription = Accelerometer.addListener(accelerometerData => {
        this.accelerometerData.push(accelerometerData);
        this.processAccelerometerData(accelerometerData);
        
        // Beperk de grootte van de accelerometer data array
        if (this.accelerometerData.length > 50) {
          this.accelerometerData.shift();
        }
      });
      
      // Start een timer om periodiek activiteiten te detecteren
      this.detectionTimer = setInterval(() => {
        if (this.accelerometerData.length > 0) {
          this.detectActivity(this.accelerometerData);
          this.accelerometerData = [];
        }
      }, DETECTION_INTERVAL);
      
      this.isMonitoring = true;
      return { success: true, message: 'Activiteitenmonitoring is gestart' };
    } catch (error) {
      console.error('Error starting activity monitoring:', error);
      return { 
        success: false, 
        message: 'Fout bij het starten van activiteitenmonitoring: ' + error.message 
      };
    }
  }

  async stopMonitoring() {
    if (!this.isMonitoring) {
      return { success: true, message: 'Activiteitenmonitoring is niet actief' };
    }
    
    try {
      // Stop de huidige activiteit als die gaande is
      if (this.currentActivity && this.activityStartTime) {
        await this.endActivity();
      }
      
      // Verwijder de accelerometer subscription
      if (this.accelerometerSubscription) {
        this.accelerometerSubscription.remove();
        this.accelerometerSubscription = null;
      }
      
      // Stop de detectie timer
      if (this.detectionTimer) {
        clearInterval(this.detectionTimer);
        this.detectionTimer = null;
      }
      
      this.isMonitoring = false;
      return { success: true, message: 'Activiteitenmonitoring is gestopt' };
    } catch (error) {
      console.error('Error stopping activity monitoring:', error);
      return { 
        success: false, 
        message: 'Fout bij het stoppen van activiteitenmonitoring: ' + error.message 
      };
    }
  }

  processAccelerometerData(data) {
    // Bereken de magnitude van de accelerometer data
    const magnitude = Math.sqrt(
      data.x * data.x + data.y * data.y + data.z * data.z
    );
    
    // Detecteer stappen op basis van pieken in de magnitude
    // Eenvoudig algoritme: detecteert een stap wanneer magnitude stijgt boven drempel
    // en daarna weer zakt
    if (!this.isStepUp && magnitude > this.lastMagnitude && magnitude > STEP_THRESHOLD) {
      this.isStepUp = true;
    } else if (this.isStepUp && magnitude < this.lastMagnitude && magnitude < STEP_THRESHOLD) {
      this.isStepUp = false;
      this.steps++;
    }
    
    this.lastMagnitude = magnitude;
  }

  async detectActivity(accelerometerData) {
    if (!accelerometerData || accelerometerData.length === 0) {
      return;
    }
    
    // Bereken kenmerken van de accelerometer data
    const features = this.extractFeatures(accelerometerData);
    
    // Classificeer de activiteit op basis van de kenmerken
    const activity = this.classifyActivity(features);
    
    // Als de gedetecteerde activiteit verschilt van de huidige, update dan
    if (!this.currentActivity || this.currentActivity !== activity) {
      if (this.currentActivity && this.activityStartTime) {
        // Beëindig de vorige activiteit
        await this.endActivity();
      }
      
      // Start nieuwe activiteit
      this.currentActivity = activity;
      this.activityStartTime = Date.now();
    }
  }

  extractFeatures(accelerometerData) {
    // Bereken statistische kenmerken van de accelerometer data
    let sumX = 0, sumY = 0, sumZ = 0;
    let sumX2 = 0, sumY2 = 0, sumZ2 = 0;
    
    for (const data of accelerometerData) {
      sumX += data.x;
      sumY += data.y;
      sumZ += data.z;
      
      sumX2 += data.x * data.x;
      sumY2 += data.y * data.y;
      sumZ2 += data.z * data.z;
    }
    
    const n = accelerometerData.length;
    
    const meanX = sumX / n;
    const meanY = sumY / n;
    const meanZ = sumZ / n;
    
    const varX = (sumX2 / n) - (meanX * meanX);
    const varY = (sumY2 / n) - (meanY * meanY);
    const varZ = (sumZ2 / n) - (meanZ * meanZ);
    
    const stdDevX = Math.sqrt(varX);
    const stdDevY = Math.sqrt(varY);
    const stdDevZ = Math.sqrt(varZ);
    
    // Bereken de energie (som van kwadraten)
    const energy = sumX2 + sumY2 + sumZ2;
    
    // Bereken de gemiddelde absolute afwijking
    let madX = 0, madY = 0, madZ = 0;
    for (const data of accelerometerData) {
      madX += Math.abs(data.x - meanX);
      madY += Math.abs(data.y - meanY);
      madZ += Math.abs(data.z - meanZ);
    }
    
    madX /= n;
    madY /= n;
    madZ /= n;
    
    return {
      meanX, meanY, meanZ,
      stdDevX, stdDevY, stdDevZ,
      energy,
      madX, madY, madZ
    };
  }

  classifyActivity(features) {
    // Vereenvoudigde kNN algoritme voor activiteitenherkenning
    // In een volledige implementatie zouden we een beter model gebruiken
    // met vooraf bekende referentiepunten, maar dit is een startpunt
    
    const { energy, stdDevX, stdDevY, stdDevZ } = features;
    
    // Eenvoudige beslisboom voor activiteitenclassificatie
    if (energy < 0.1) {
      return 'still'; // Stilstaand
    } else if (energy < 0.5) {
      if (stdDevY > stdDevX && stdDevY > stdDevZ) {
        return 'walking'; // Lopen
      } else {
        return 'stationary_activity'; // Stationaire activiteit
      }
    } else if (energy < 1.5) {
      return 'running'; // Rennen
    } else {
      return 'unknown'; // Onbekende activiteit
    }
  }

  async endActivity() {
    if (!this.currentActivity || !this.activityStartTime) {
      return;
    }
    
    const endTime = Date.now();
    const duration = endTime - this.activityStartTime;
    
    // Sla alleen activiteiten op die lang genoeg duren
    if (duration > 10000) { // langer dan 10 seconden
      const activityData = {
        type: this.currentActivity,
        start_time: this.activityStartTime,
        end_time: endTime,
        duration,
        metadata: JSON.stringify({
          steps: this.currentActivity === 'walking' || this.currentActivity === 'running' 
            ? this.steps 
            : 0
        })
      };
      
      await databaseService.saveActivity(activityData);
      
      // Reset stappenteller als de activiteit lopen of rennen was
      if (this.currentActivity === 'walking' || this.currentActivity === 'running') {
        this.steps = 0;
      }
    }
    
    this.currentActivity = null;
    this.activityStartTime = null;
  }

  async getStepsCount(startDate, endDate) {
    try {
      const activities = await databaseService.getActivities(startDate, endDate);
      
      // Tel alle stappen bij elkaar op van activiteiten die stappen bevatten
      let totalSteps = 0;
      for (const activity of activities) {
        try {
          // Veilige JSON parsing met null-check
          if (activity.metadata && typeof activity.metadata === 'string') {
            const metadata = JSON.parse(activity.metadata);
            if (metadata && metadata.steps) {
              totalSteps += metadata.steps;
            }
          }
        } catch (parseError) {
          // Skip malformed metadata, log alleen in debug mode
          if (__DEV__) console.debug('Skipping malformed activity metadata for activity:', activity.id);
        }
      }
      
      return totalSteps;
    } catch (error) {
      console.error('Error getting steps count:', error);
      return 0;
    }
  }

  async getActivitySummary(startDate, endDate) {
    try {
      const activities = await databaseService.getActivities(startDate, endDate);
      
      // Bereken totale duur per activiteitstype
      const summary = {
        still: 0,
        walking: 0,
        running: 0,
        stationary_activity: 0,
        unknown: 0,
        totalDuration: 0,
        totalSteps: 0
      };
      
      for (const activity of activities) {
        if (activity.type in summary) {
          summary[activity.type] += activity.duration || 0;
        }
        
        summary.totalDuration += activity.duration || 0;
        
        // Tel stappen - veilige JSON parsing
        try {
          if (activity.metadata && typeof activity.metadata === 'string') {
            const metadata = JSON.parse(activity.metadata);
            if (metadata && metadata.steps) {
              summary.totalSteps += metadata.steps;
            }
          }
        } catch (parseError) {
          // Skip malformed metadata, log alleen in debug mode
          if (__DEV__) console.debug('Skipping malformed activity metadata for activity:', activity.id);
        }
      }
      
      return summary;
    } catch (error) {
      console.error('Error getting activity summary:', error);
      return null;
    }
  }
}

// Singleton instance
const activityService = new ActivityService();
export default activityService;