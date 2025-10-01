// src/services/dataFusionService.js
// Advanced data fusion with timestamp harmonization and confidence boosting

import samsungHealthService from './samsungHealthService';
import stravaService from './stravaService';
import activityService from './activityService';
import locationService from './locationService';
import appUsageService from './appUsageService';
import callLogService from './callLogService';
import databaseService from './database';
import errorHandler from './errorLogger';

class DataFusionService {
  constructor() {
    this.shadowValidationLogs = [];
    this.dataLineage = new Map();
    this.eventCorrelations = new Map();
  }

  // 1. TIMESTAMP HARMONIZATION
  harmonizeTimestamps(dataSources, timeWindow = 5 * 60 * 1000) { // 5 minute window
    const harmonizedData = {};
    const timeSlots = this.createTimeSlots(dataSources, timeWindow);
    
    timeSlots.forEach(slot => {
      const slotData = this.aggregateDataInTimeSlot(dataSources, slot, timeWindow);
      harmonizedData[slot.timestamp] = slotData;
    });
    
    return harmonizedData;
  }

  createTimeSlots(dataSources, timeWindow) {
    const allTimestamps = [];
    
    // Collect all timestamps from all sources
    Object.values(dataSources).forEach(source => {
      if (source && source.data) {
        source.data.forEach(item => {
          if (item.timestamp) {
            allTimestamps.push(item.timestamp);
          }
        });
      }
    });
    
    // Create time slots
    const sortedTimestamps = [...new Set(allTimestamps)].sort();
    const timeSlots = [];
    
    for (let i = 0; i < sortedTimestamps.length; i++) {
      const currentTime = sortedTimestamps[i];
      const slotStart = Math.floor(currentTime / timeWindow) * timeWindow;
      const slotEnd = slotStart + timeWindow;
      
      if (!timeSlots.find(slot => slot.start === slotStart)) {
        timeSlots.push({
          timestamp: slotStart,
          start: slotStart,
          end: slotEnd
        });
      }
    }
    
    return timeSlots;
  }

  aggregateDataInTimeSlot(dataSources, timeSlot, timeWindow) {
    const slotData = {
      timestamp: timeSlot.timestamp,
      sources: {},
      confidence: {},
      lineage: []
    };

    Object.entries(dataSources).forEach(([sourceName, sourceData]) => {
      if (sourceData && sourceData.data) {
        const itemsInSlot = sourceData.data.filter(item => 
          item.timestamp >= timeSlot.start && item.timestamp < timeSlot.end
        );
        
        if (itemsInSlot.length > 0) {
          slotData.sources[sourceName] = this.aggregateSourceData(itemsInSlot);
          slotData.lineage.push({
            source: sourceName,
            count: itemsInSlot.length,
            timeRange: {
              start: Math.min(...itemsInSlot.map(i => i.timestamp)),
              end: Math.max(...itemsInSlot.map(i => i.timestamp))
            }
          });
        }
      }
    });

    return slotData;
  }

  aggregateSourceData(items) {
    const aggregated = {
      count: items.length,
      values: {}
    };

    // Aggregate different data types
    items.forEach(item => {
      Object.entries(item).forEach(([key, value]) => {
        if (key === 'timestamp') return;
        
        if (typeof value === 'number') {
          if (!aggregated.values[key]) {
            aggregated.values[key] = { sum: 0, avg: 0, min: value, max: value, count: 0 };
          }
          aggregated.values[key].sum += value;
          aggregated.values[key].count++;
          aggregated.values[key].avg = aggregated.values[key].sum / aggregated.values[key].count;
          aggregated.values[key].min = Math.min(aggregated.values[key].min, value);
          aggregated.values[key].max = Math.max(aggregated.values[key].max, value);
        } else {
          if (!aggregated.values[key]) {
            aggregated.values[key] = [];
          }
          if (!aggregated.values[key].includes(value)) {
            aggregated.values[key].push(value);
          }
        }
      });
    });

    return aggregated;
  }

  // 2. CONFIDENCE BOOSTERS BASED ON CONTEXT
  calculateContextualConfidence(dataPoint, contextSources) {
    let baseConfidence = this.getBaseConfidence(dataPoint.source);
    let confidenceBoost = 0;
    const boostReasons = [];

    // Location-based confidence boosting
    if (contextSources.location) {
      const locationBoost = this.calculateLocationConfidenceBoost(dataPoint, contextSources.location);
      confidenceBoost += locationBoost.boost;
      if (locationBoost.reason) boostReasons.push(locationBoost.reason);
    }

    // Cross-source validation boost
    if (contextSources.validation) {
      const validationBoost = this.calculateValidationBoost(dataPoint, contextSources.validation);
      confidenceBoost += validationBoost.boost;
      if (validationBoost.reason) boostReasons.push(validationBoost.reason);
    }

    // Time-pattern consistency boost
    const patternBoost = this.calculatePatternBoost(dataPoint);
    confidenceBoost += patternBoost.boost;
    if (patternBoost.reason) boostReasons.push(patternBoost.reason);

    const finalConfidence = Math.min(0.99, baseConfidence + confidenceBoost);

    return {
      confidence: finalConfidence,
      baseConfidence,
      boost: confidenceBoost,
      reasons: boostReasons
    };
  }

  calculateLocationConfidenceBoost(dataPoint, locationData) {
    const boosts = [];
    
    // Gym + workout = confidence boost
    if (dataPoint.type === 'workout' && this.isAtGym(locationData)) {
      boosts.push({ boost: 0.15, reason: 'Workout at gym location' });
    }
    
    // Home + sleep = confidence boost
    if (dataPoint.type === 'sleep' && this.isAtHome(locationData)) {
      boosts.push({ boost: 0.10, reason: 'Sleep at home location' });
    }
    
    // Walking + outdoor location = confidence boost
    if (dataPoint.type === 'steps' && this.isOutdoor(locationData)) {
      boosts.push({ boost: 0.08, reason: 'Steps in outdoor location' });
    }

    const totalBoost = boosts.reduce((sum, b) => sum + b.boost, 0);
    const combinedReasons = boosts.map(b => b.reason).join(', ');

    return {
      boost: totalBoost,
      reason: combinedReasons || null
    };
  }

  calculateValidationBoost(dataPoint, validationSources) {
    let totalBoost = 0;
    const reasons = [];

    validationSources.forEach(source => {
      const deviation = this.calculateDeviation(dataPoint.value, source.value);
      
      if (deviation < 0.1) { // Less than 10% deviation
        totalBoost += 0.12;
        reasons.push(`Validated by ${source.name} (${Math.round(deviation * 100)}% deviation)`);
      } else if (deviation < 0.2) { // Less than 20% deviation
        totalBoost += 0.06;
        reasons.push(`Partially validated by ${source.name} (${Math.round(deviation * 100)}% deviation)`);
      }
    });

    return {
      boost: Math.min(0.2, totalBoost), // Cap at 20% boost
      reason: reasons.join(', ') || null
    };
  }

  calculatePatternBoost(dataPoint) {
    // Check if this data point fits historical patterns
    const historicalPattern = this.getHistoricalPattern(dataPoint.type, dataPoint.timestamp);
    
    if (!historicalPattern) {
      return { boost: 0, reason: null };
    }

    const deviation = Math.abs(dataPoint.value - historicalPattern.average) / historicalPattern.average;
    
    if (deviation < 0.15) { // Within 15% of historical average
      return { 
        boost: 0.08, 
        reason: `Consistent with historical pattern (${Math.round(deviation * 100)}% deviation)` 
      };
    } else if (deviation > 0.5) { // More than 50% deviation
      return { 
        boost: -0.05, 
        reason: `Unusual compared to historical pattern (${Math.round(deviation * 100)}% deviation)` 
      };
    }

    return { boost: 0, reason: null };
  }

  // 3. SHADOW VALIDATION SYSTEM
  async performShadowValidation(primaryData, shadowSources) {
    const validationResults = {
      timestamp: Date.now(),
      primarySource: primaryData.source,
      validations: [],
      anomalies: [],
      overallHealth: 'good'
    };

    for (const shadowSource of shadowSources) {
      try {
        const shadowData = await this.getShadowData(shadowSource, primaryData.timestamp);
        const validation = this.compareDataSources(primaryData, shadowData);
        
        validationResults.validations.push(validation);
        
        // Log significant deviations
        if (validation.deviation > 0.3) {
          const anomaly = {
            timestamp: primaryData.timestamp,
            primaryValue: primaryData.value,
            shadowValue: shadowData.value,
            deviation: validation.deviation,
            shadowSource: shadowSource.name,
            severity: validation.deviation > 0.5 ? 'high' : 'medium'
          };
          
          validationResults.anomalies.push(anomaly);
          this.logShadowValidationAnomaly(anomaly);
        }
        
      } catch (error) {
        errorHandler.error(`Shadow validation failed for ${shadowSource.name}`, error, 'DataFusionService');
      }
    }

    // Determine overall data health
    const highDeviations = validationResults.anomalies.filter(a => a.severity === 'high').length;
    if (highDeviations > 0) {
      validationResults.overallHealth = 'poor';
    } else if (validationResults.anomalies.length > 2) {
      validationResults.overallHealth = 'fair';
    }

    // Store validation results for analysis
    this.shadowValidationLogs.push(validationResults);
    
    return validationResults;
  }

  compareDataSources(primary, shadow) {
    const deviation = Math.abs(primary.value - shadow.value) / Math.max(primary.value, shadow.value, 1);
    
    return {
      shadowSource: shadow.source,
      primaryValue: primary.value,
      shadowValue: shadow.value,
      deviation: deviation,
      agreement: deviation < 0.2 ? 'good' : deviation < 0.4 ? 'fair' : 'poor',
      timestamp: primary.timestamp
    };
  }

  logShadowValidationAnomaly(anomaly) {
    if (__DEV__) {
      console.warn('🔍 Shadow Validation Anomaly:', {
        severity: anomaly.severity,
        deviation: `${Math.round(anomaly.deviation * 100)}%`,
        primary: anomaly.primaryValue,
        shadow: `${anomaly.shadowSource}: ${anomaly.shadowValue}`,
        time: new Date(anomaly.timestamp).toLocaleTimeString()
      });
    }

    // Store for analysis dashboard
    this.storeShadowValidationLog(anomaly);
  }

  async storeShadowValidationLog(anomaly) {
    try {
      await databaseService.executeQuery(
        `INSERT INTO shadow_validation_logs (
          timestamp, primary_value, shadow_source, shadow_value, 
          deviation, severity, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          anomaly.timestamp,
          anomaly.primaryValue,
          anomaly.shadowSource,
          anomaly.shadowValue,
          anomaly.deviation,
          anomaly.severity,
          Date.now()
        ]
      );
    } catch (error) {
      if (__DEV__) console.log('Failed to store shadow validation log:', error);
    }
  }

  // 4. DATA LINEAGE TRACKING
  trackDataLineage(dataPoint, sources) {
    const lineage = {
      id: this.generateLineageId(dataPoint),
      timestamp: dataPoint.timestamp,
      type: dataPoint.type,
      value: dataPoint.value,
      primarySource: dataPoint.source,
      confidence: dataPoint.confidence,
      contributors: [],
      transformations: [],
      createdAt: Date.now()
    };

    // Track all contributing sources
    sources.forEach(source => {
      lineage.contributors.push({
        source: source.name,
        value: source.value,
        weight: source.weight || 0,
        confidence: source.confidence || 0.5
      });
    });

    // Track any transformations applied
    if (dataPoint.transformations) {
      lineage.transformations = dataPoint.transformations;
    }

    this.dataLineage.set(lineage.id, lineage);
    return lineage.id;
  }

  getDataLineage(dataPointId) {
    return this.dataLineage.get(dataPointId);
  }

  generateDataLineageReport(date) {
    const report = {
      date: date,
      totalDataPoints: 0,
      sourceBreakdown: {},
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
      transformationTypes: {},
      dataQuality: 'good'
    };

    this.dataLineage.forEach(lineage => {
      const lineageDate = new Date(lineage.timestamp).toDateString();
      const targetDate = new Date(date).toDateString();
      
      if (lineageDate === targetDate) {
        report.totalDataPoints++;
        
        // Source breakdown
        if (!report.sourceBreakdown[lineage.primarySource]) {
          report.sourceBreakdown[lineage.primarySource] = 0;
        }
        report.sourceBreakdown[lineage.primarySource]++;
        
        // Confidence distribution
        if (lineage.confidence >= 0.8) report.confidenceDistribution.high++;
        else if (lineage.confidence >= 0.6) report.confidenceDistribution.medium++;
        else report.confidenceDistribution.low++;
        
        // Transformation types
        lineage.transformations.forEach(transform => {
          if (!report.transformationTypes[transform.type]) {
            report.transformationTypes[transform.type] = 0;
          }
          report.transformationTypes[transform.type]++;
        });
      }
    });

    // Determine data quality
    const lowConfidenceRatio = report.confidenceDistribution.low / report.totalDataPoints;
    if (lowConfidenceRatio > 0.3) report.dataQuality = 'poor';
    else if (lowConfidenceRatio > 0.15) report.dataQuality = 'fair';

    return report;
  }

  generateLineageId(dataPoint) {
    return `${dataPoint.type}_${dataPoint.timestamp}_${dataPoint.source}`;
  }

  // Helper methods
  getBaseConfidence(source) {
    const confidenceMap = {
      'samsung_health': 0.95,
      'strava': 0.90,
      'activity_service': 0.75,
      'location_service': 0.85,
      'app_usage': 0.99,
      'call_logs': 0.99
    };
    return confidenceMap[source] || 0.50;
  }

  calculateDeviation(value1, value2) {
    if (value1 === 0 && value2 === 0) return 0;
    const max = Math.max(Math.abs(value1), Math.abs(value2));
    return Math.abs(value1 - value2) / max;
  }

  isAtGym(locationData) {
    if (!locationData || !locationData.name) return false;
    const gymKeywords = ['gym', 'fitness', 'sportschool', 'fitnes', 'sport'];
    return gymKeywords.some(keyword => 
      locationData.name.toLowerCase().includes(keyword)
    );
  }

  isAtHome(locationData) {
    if (!locationData) return false;
    return locationData.type === 'home' || locationData.name?.toLowerCase().includes('thuis');
  }

  isOutdoor(locationData) {
    if (!locationData) return false;
    return locationData.type === 'outdoor' || locationData.accuracy < 50; // High GPS accuracy suggests outdoor
  }

  getHistoricalPattern(dataType, timestamp) {
    // This would typically query historical data
    // For now, return null to indicate no pattern available
    return null;
  }

  async getShadowData(shadowSource, timestamp) {
    // Implementation would depend on the shadow source
    // This is a placeholder that would be implemented per source
    return { source: shadowSource.name, value: 0, timestamp };
  }
}

export default new DataFusionService();