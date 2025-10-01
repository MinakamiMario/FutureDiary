// utils/healthThresholds.js
// Health data threshold monitoring with safe, factual notifications

import { getHealthSettings } from './healthSettings';

/**
 * Check heart rate thresholds and return factual observations
 */
export async function checkHeartRateThresholds(avgHeartRate, maxHeartRate) {
  try {
    const settings = await getHealthSettings();
    
    if (!settings.heartRateThresholds.enabled || !avgHeartRate) {
      return null;
    }
    
    const observations = [];
    
    // Factual threshold observations (no medical interpretation)
    if (avgHeartRate > settings.heartRateThresholds.restingMax) {
      observations.push({
        type: 'heart_rate_above_resting_threshold',
        value: avgHeartRate,
        threshold: settings.heartRateThresholds.restingMax,
        message: `Hartslag was ${avgHeartRate} BPM (boven ingestelde drempel van ${settings.heartRateThresholds.restingMax} BPM)`
      });
    }
    
    if (maxHeartRate && maxHeartRate < settings.heartRateThresholds.activeMin) {
      observations.push({
        type: 'heart_rate_below_active_threshold', 
        value: maxHeartRate,
        threshold: settings.heartRateThresholds.activeMin,
        message: `Maximale hartslag was ${maxHeartRate} BPM (onder ingestelde activiteitsdrempel van ${settings.heartRateThresholds.activeMin} BPM)`
      });
    }
    
    return observations.length > 0 ? observations : null;
  } catch (error) {
    console.error('Error checking heart rate thresholds:', error);
    return null;
  }
}

/**
 * Check sleep thresholds and return factual observations
 */
export async function checkSleepThresholds(sleepHours) {
  try {
    const settings = await getHealthSettings();
    
    if (!settings.sleepThresholds.enabled || !sleepHours) {
      return null;
    }
    
    const observations = [];
    
    // Factual threshold observations (no medical interpretation)
    if (sleepHours < settings.sleepThresholds.minimumHours) {
      observations.push({
        type: 'sleep_below_minimum',
        value: sleepHours,
        threshold: settings.sleepThresholds.minimumHours,
        message: `Sliep ${sleepHours} uur (onder ingestelde minimum van ${settings.sleepThresholds.minimumHours} uur)`
      });
    }
    
    if (sleepHours > settings.sleepThresholds.maximumHours) {
      observations.push({
        type: 'sleep_above_maximum',
        value: sleepHours,
        threshold: settings.sleepThresholds.maximumHours,
        message: `Sliep ${sleepHours} uur (boven ingestelde maximum van ${settings.sleepThresholds.maximumHours} uur)`
      });
    }
    
    return observations.length > 0 ? observations : null;
  } catch (error) {
    console.error('Error checking sleep thresholds:', error);
    return null;
  }
}

/**
 * Check steps thresholds and return factual observations
 */
export async function checkStepsThresholds(totalSteps) {
  try {
    const settings = await getHealthSettings();
    
    if (!settings.stepsThresholds.enabled || !totalSteps) {
      return null;
    }
    
    const observations = [];
    
    // Factual threshold observations (no medical interpretation)
    if (totalSteps < settings.stepsThresholds.minimumDaily) {
      observations.push({
        type: 'steps_below_minimum',
        value: totalSteps,
        threshold: settings.stepsThresholds.minimumDaily,
        message: `Zette ${totalSteps.toLocaleString()} stappen (onder ingestelde minimum van ${settings.stepsThresholds.minimumDaily.toLocaleString()} stappen)`
      });
    }
    
    if (totalSteps >= settings.stepsThresholds.dailyGoal) {
      observations.push({
        type: 'steps_goal_reached',
        value: totalSteps,
        threshold: settings.stepsThresholds.dailyGoal,
        message: `Bereikte ${totalSteps.toLocaleString()} stappen (dagelijks doel: ${settings.stepsThresholds.dailyGoal.toLocaleString()} stappen)`
      });
    }
    
    return observations.length > 0 ? observations : null;
  } catch (error) {
    console.error('Error checking steps thresholds:', error);
    return null;
  }
}

/**
 * Get all health threshold observations for given health context
 */
export async function getHealthThresholdObservations(healthContext) {
  try {
    if (!healthContext.has_health_data) {
      return [];
    }
    
    const observations = [];
    
    // Check heart rate thresholds
    if (healthContext.heart_rate) {
      const hrObservations = await checkHeartRateThresholds(
        healthContext.heart_rate.average,
        healthContext.heart_rate.maximum
      );
      if (hrObservations) {
        observations.push(...hrObservations);
      }
    }
    
    // Check sleep thresholds
    if (healthContext.sleep) {
      const sleepObservations = await checkSleepThresholds(healthContext.sleep.duration_hours);
      if (sleepObservations) {
        observations.push(...sleepObservations);
      }
    }
    
    // Check steps thresholds
    if (healthContext.steps) {
      const stepsObservations = await checkStepsThresholds(healthContext.steps.total);
      if (stepsObservations) {
        observations.push(...stepsObservations);
      }
    }
    
    return observations;
  } catch (error) {
    console.error('Error getting health threshold observations:', error);
    return [];
  }
}

/**
 * Generate factual threshold notification messages
 */
export function generateThresholdNotifications(observations) {
  if (!observations || observations.length === 0) {
    return [];
  }
  
  return observations.map(obs => ({
    type: obs.type,
    message: obs.message,
    value: obs.value,
    threshold: obs.threshold,
    timestamp: Date.now(),
    category: 'health_threshold'
  }));
}

export default {
  checkHeartRateThresholds,
  checkSleepThresholds,
  checkStepsThresholds,
  getHealthThresholdObservations,
  generateThresholdNotifications
};