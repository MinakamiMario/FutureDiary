// utils/healthNarrativeIntegration.js
// Safe health data integration for AI narratives
// Follows strict guidelines: factual data only, no medical interpretations

/**
 * Health Data Integration Guidelines:
 * 
 * ✅ ALLOWED:
 * - Factual data presentation (heart rate: 75 BPM)
 * - Activity context (active during workout)
 * - Sleep duration facts (slept 7.5 hours)
 * - Trend observations (higher/lower than usual)
 * 
 * ❌ FORBIDDEN:
 * - Medical interpretations ("your heart rate indicates stress")
 * - Health advice ("you should exercise more")
 * - Diagnostic language ("unhealthy", "concerning")
 * - Predictive statements about health outcomes
 */

import databaseService from '../services/database';
import { shouldIncludeHealthData, getEnabledHealthDataTypes, shouldEnableHealthContext } from './healthSettings';

// Safe health data patterns for narrative integration
export const HEALTH_DATA_PATTERNS = {
  heart_rate: {
    safe_descriptors: {
      range_40_60: 'rustige hartslag',
      range_60_80: 'gewone hartslag', 
      range_80_100: 'actieve hartslag',
      range_100_120: 'verhoogde hartslag',
      range_120_plus: 'hoge hartslag'
    },
    context_phrases: [
      'je hartslag was {value} slagen per minuut',
      'hartslag tijdens activiteit: {value} BPM',
      'gemiddelde hartslag: {value} BPM'
    ]
  },
  
  sleep: {
    safe_descriptors: {
      range_0_5: 'korte slaap',
      range_5_7: 'beperkte slaap',
      range_7_9: 'goede slaapduur',
      range_9_plus: 'lange slaap'
    },
    context_phrases: [
      'je sliep {hours} uur',
      'slaapduur was {hours} uur',
      'nachtrust van {hours} uur'
    ]
  },
  
  steps: {
    safe_descriptors: {
      range_0_3000: 'rustige dag',
      range_3000_7000: 'gematigde activiteit', 
      range_7000_12000: 'actieve dag',
      range_12000_plus: 'zeer actieve dag'
    },
    context_phrases: [
      'je zette {value} stappen',
      'wandelde {value} stappen',
      'dagelijks stappentel: {value}'
    ]
  }
};

// Health data thresholds for context determination
export const HEALTH_THRESHOLDS = {
  heart_rate: {
    resting: { min: 40, max: 80 },
    active: { min: 80, max: 150 },
    intense: { min: 150, max: 200 }
  },
  
  sleep_hours: {
    short: { min: 0, max: 6 },
    normal: { min: 6, max: 9 },
    long: { min: 9, max: 12 }
  },
  
  steps: {
    sedentary: { min: 0, max: 5000 },
    moderate: { min: 5000, max: 10000 },
    active: { min: 10000, max: 15000 },
    very_active: { min: 15000, max: 25000 }
  }
};

/**
 * Get safe health context for a specific date
 * Returns only factual data without medical interpretations
 * Respects user privacy settings
 */
export async function getHealthContextForDate(date) {
  try {
    // Check if user wants health data included
    const includeHealthData = await shouldIncludeHealthData();
    if (!includeHealthData) {
      return {
        heart_rate: null,
        sleep: null, 
        steps: null,
        workouts: [],
        has_health_data: false,
        privacy_disabled: true
      };
    }
    
    // Get enabled health data types based on user preferences
    const enabledTypes = await getEnabledHealthDataTypes();
    
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    const startTime = dateStart.getTime();
    const endTime = dateEnd.getTime();
    
    // Get health data from database based on user preferences
    const [heartRateData, sleepData, stepsData, workoutData] = await Promise.all([
      enabledTypes.includes('heart_rate') ? getHeartRateData(startTime, endTime) : Promise.resolve(null),
      enabledTypes.includes('sleep') ? getSleepData(startTime, endTime) : Promise.resolve(null), 
      enabledTypes.includes('steps') ? getStepsData(startTime, endTime) : Promise.resolve(null),
      enabledTypes.includes('workouts') ? getWorkoutData(startTime, endTime) : Promise.resolve([])
    ]);
    
    return {
      heart_rate: heartRateData,
      sleep: sleepData,
      steps: stepsData,
      workouts: workoutData,
      has_health_data: !!(heartRateData || sleepData || stepsData || workoutData.length > 0),
      enabled_types: enabledTypes
    };
  } catch (error) {
    console.error('Error getting health context:', error);
    return {
      heart_rate: null,
      sleep: null, 
      steps: null,
      workouts: [],
      has_health_data: false
    };
  }
}

/**
 * Get heart rate data for date range
 */
async function getHeartRateData(startTime, endTime) {
  try {
    // Get heart rate from activities table
    const heartRateActivities = await databaseService.safeGetAllAsync(
      'SELECT heart_rate_avg, heart_rate_max, start_time FROM activities WHERE (heart_rate_avg > 0 OR heart_rate_max > 0) AND start_time >= ? AND start_time <= ?',
      [startTime, endTime]
    );
    
    if (heartRateActivities.length === 0) return null;
    
    // Calculate average heart rate for the day
    const validReadings = heartRateActivities.filter(a => a.heart_rate_avg > 0);
    if (validReadings.length === 0) return null;
    
    const avgHeartRate = Math.round(
      validReadings.reduce((sum, a) => sum + a.heart_rate_avg, 0) / validReadings.length
    );
    
    const maxHeartRate = Math.max(...heartRateActivities.map(a => a.heart_rate_max || 0));
    
    return {
      average: avgHeartRate,
      maximum: maxHeartRate > 0 ? maxHeartRate : null,
      readings_count: validReadings.length,
      context: getHeartRateContext(avgHeartRate)
    };
  } catch (error) {
    console.error('Error getting heart rate data:', error);
    return null;
  }
}

/**
 * Get sleep data for date range
 */
async function getSleepData(startTime, endTime) {
  try {
    // Get sleep activities
    const sleepActivities = await databaseService.safeGetAllAsync(
      'SELECT duration, start_time, end_time FROM activities WHERE type = ? AND start_time >= ? AND start_time <= ?',
      ['sleep', startTime - (12 * 60 * 60 * 1000), endTime] // Include sleep that started up to 12 hours before
    );
    
    if (sleepActivities.length === 0) return null;
    
    // Sum total sleep duration for the period
    const totalSleepMinutes = sleepActivities.reduce((sum, sleep) => sum + (sleep.duration || 0), 0);
    const sleepHours = parseFloat((totalSleepMinutes / 60).toFixed(1));
    
    return {
      duration_hours: sleepHours,
      duration_minutes: totalSleepMinutes,
      sessions_count: sleepActivities.length,
      context: getSleepContext(sleepHours)
    };
  } catch (error) {
    console.error('Error getting sleep data:', error);
    return null;
  }
}

/**
 * Get steps data for date range
 */
async function getStepsData(startTime, endTime) {
  try {
    // Get steps from health_data table (Samsung Health format)
    const stepsActivities = await databaseService.safeGetAllAsync(
      'SELECT value, timestamp as start_time FROM health_data WHERE type = ? AND timestamp >= ? AND timestamp <= ?',
      ['steps', startTime, endTime]
    );
    
    if (stepsActivities.length === 0) return null;
    
    // Sum total steps for the day
    const totalSteps = stepsActivities.reduce((sum, step) => sum + (step.value || 0), 0);
    
    return {
      total: totalSteps,
      context: getStepsContext(totalSteps)
    };
  } catch (error) {
    console.error('Error getting steps data:', error);
    return null;
  }
}

/**
 * Get workout data for date range
 */
async function getWorkoutData(startTime, endTime) {
  try {
    const workouts = await databaseService.safeGetAllAsync(
      'SELECT sport_type, duration, calories, distance, heart_rate_avg, start_time FROM activities WHERE type = ? AND start_time >= ? AND start_time <= ?',
      ['workout', startTime, endTime]
    );
    
    return workouts.map(workout => ({
      sport_type: workout.sport_type,
      duration: workout.duration,
      calories: workout.calories,
      distance: workout.distance,
      heart_rate_avg: workout.heart_rate_avg,
      start_time: workout.start_time
    }));
  } catch (error) {
    console.error('Error getting workout data:', error);
    return [];
  }
}

/**
 * Get safe heart rate context without medical interpretation
 */
function getHeartRateContext(avgHeartRate) {
  if (avgHeartRate >= 40 && avgHeartRate <= 60) return 'rustige hartslag';
  if (avgHeartRate > 60 && avgHeartRate <= 80) return 'gewone hartslag';
  if (avgHeartRate > 80 && avgHeartRate <= 100) return 'actieve hartslag';
  if (avgHeartRate > 100 && avgHeartRate <= 120) return 'verhoogde hartslag';
  if (avgHeartRate > 120) return 'hoge hartslag';
  return 'hartslag gemeten';
}

/**
 * Get safe sleep context without medical interpretation
 */
function getSleepContext(hours) {
  if (hours < 5) return 'korte slaap';
  if (hours >= 5 && hours < 7) return 'beperkte slaap';
  if (hours >= 7 && hours <= 9) return 'goede slaapduur';
  if (hours > 9) return 'lange slaap';
  return 'slaap geregistreerd';
}

/**
 * Get safe steps context without medical interpretation
 */
function getStepsContext(steps) {
  if (steps < 3000) return 'rustige dag';
  if (steps >= 3000 && steps < 7000) return 'gematigde activiteit';
  if (steps >= 7000 && steps < 12000) return 'actieve dag';
  if (steps >= 12000) return 'zeer actieve dag';
  return 'stappen geteld';
}

/**
 * Generate safe health narrative snippets
 * Returns factual statements without medical interpretations
 */
export function generateHealthNarrativeSnippets(healthContext) {
  const snippets = [];
  
  // Heart rate snippet
  if (healthContext.heart_rate) {
    const hr = healthContext.heart_rate;
    snippets.push(
      `Je hartslag was gemiddeld ${hr.average} slagen per minuut (${hr.context})`
    );
    
    if (hr.maximum && hr.maximum !== hr.average) {
      snippets.push(`met een piek van ${hr.maximum} BPM`);
    }
  }
  
  // Sleep snippet
  if (healthContext.sleep) {
    const sleep = healthContext.sleep;
    snippets.push(
      `Je sliep ${sleep.duration_hours} uur (${sleep.context})`
    );
  }
  
  // Steps snippet
  if (healthContext.steps) {
    const steps = healthContext.steps;
    snippets.push(
      `Je zette ${steps.total.toLocaleString()} stappen (${steps.context})`
    );
  }
  
  // Workout snippets
  if (healthContext.workouts && healthContext.workouts.length > 0) {
    healthContext.workouts.forEach(workout => {
      let workoutSnippet = `Je deed ${workout.duration} minuten ${workout.sport_type}`;
      
      if (workout.calories > 0) {
        workoutSnippet += ` en verbrandde ${workout.calories} calorieën`;
      }
      
      if (workout.distance > 0) {
        workoutSnippet += ` over ${workout.distance.toFixed(1)} km`;
      }
      
      if (workout.heart_rate_avg > 0) {
        workoutSnippet += ` met gemiddelde hartslag ${workout.heart_rate_avg} BPM`;
      }
      
      snippets.push(workoutSnippet);
    });
  }
  
  return snippets;
}

/**
 * Create health data context for AI prompt
 * Includes strict safety instructions and respects user settings
 */
export async function createHealthAIContext(healthContext) {
  try {
    // Check if health context should be enabled
    const enableHealthContext = await shouldEnableHealthContext();
    if (!enableHealthContext || !healthContext.has_health_data) {
      return '';
    }
    
    const healthSnippets = generateHealthNarrativeSnippets(healthContext);
    
    if (healthSnippets.length === 0) {
      return '';
    }
    
    return `

GEZONDHEIDSDATA (gebruik alleen indien relevant voor het verhaal):
${healthSnippets.join('. ')}

BELANGRIJKE GEZONDHEIDSRICHTLIJNEN:
- Gebruik ALLEEN de exacte waarden en beschrijvingen hierboven
- Geef GEEN medische interpretaties, adviezen of diagnoses
- Gebruik GEEN woorden als "gezond", "ongezond", "zorgwekkend", "normaal"
- Presenteer data als feiten, niet als beoordelingen
- Als gezondheidsdata niet relevant is voor het verhaal, laat het dan weg`;
  } catch (error) {
    console.error('Error creating health AI context:', error);
    return '';
  }
}

export default {
  getHealthContextForDate,
  generateHealthNarrativeSnippets,
  createHealthAIContext,
  HEALTH_DATA_PATTERNS,
  HEALTH_THRESHOLDS
};