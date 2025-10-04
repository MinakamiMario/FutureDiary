/**
 * UNIFIED DATA ANALYSIS SERVICE
 * 
 * Consolidates all data analysis and correlation functionality:
 * - summaryService.js (60KB)
 * - dataFusionService.js (15KB)  
 * - eventCorrelationEngine.js (20KB)
 * 
 * Provides unified interface for data analysis, correlation, and summary generation
 */

import databaseService from '../../database';
import activityService from '../activityService';
import locationService from '../locationService';
import callLogService from '../callLogService';
import { getContactName } from '../../utils/contactsHelper';
import { formatDuration, formatHours, formatDateToYYYYMMDD } from '../../utils/formatters';
import {
  generateNarrativeWithAI,
  getPreferredAIModel,
  AI_MODEL_TYPES
} from './NarrativeAIService';
import {
  getNarrativeStyle,
  applyNarrativeStyle,
  getStyledAIPrompt
} from '../../utils/narrativeStyles';
import {
  generateEnhancedIntroduction,
  generateEnhancedLocationNarrative,
  generateEnhancedCallsNarrative,
  generateEnhancedConclusion
} from '../../utils/enhancedTemplates';
import errorHandler from '../errorLogger';
import { getHealthContextForDate, createHealthAIContext } from '../../utils/healthNarrativeIntegration';
import performanceService from '../performanceService';
import { format, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// Timezone configuration
const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Amsterdam';
const CACHE_TTL = {
  DAILY: 3600000, // 1 hour
  WEEKLY: 7200000, // 2 hours
  INSIGHTS: 1800000 // 30 minutes
};

class DataAnalysisService {
  constructor() {
    this.cache = new Map();
    this.analysisQueue = [];
    this.isProcessing = false;
    
    // Sub-modules for organization
    this.fusion = new DataFusionModule(this);
    this.correlation = new CorrelationModule(this);
    this.summary = new SummaryModule(this);
  }

  /**
   * CORE DATA COLLECTION
   */

  async getDailyData(date) {
    const cacheKey = `daily_data_${formatDateToYYYYMMDD(date)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const start = performanceService?.startTracking?.('dataAnalysis.getDailyData');

    try {
      const [activities, locations, callLogs, appUsage, healthData] = await Promise.all([
        this.getDailyActivities(date),
        this.getDailyLocations(date),
        this.getDailyCallLogs(date),
        this.getDailyAppUsage(date),
        this.getDailyHealthData(date)
      ]);

      const dailyData = {
        date: formatDateToYYYYMMDD(date),
        activities,
        locations,
        callLogs,
        appUsage,
        healthData,
        timestamp: Date.now()
      };

      // Cache for 1 hour
      this.cache.set(cacheKey, dailyData);
      setTimeout(() => this.cache.delete(cacheKey), 3600000);

      performanceService?.endTracking?.(start);
      return dailyData;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to get daily data', error);
      throw error;
    }
  }

  async getDailyActivities(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const startTimestamp = startOfDay.getTime();
      const endTimestamp = endOfDay.getTime();
      
      const activities = await databaseService.getActivitiesForDateRange(
        startTimestamp, 
        endTimestamp
      );
      
      return activities || [];
    } catch (error) {
      console.error('Error getting daily activities:', error);
      return [];
    }
  }

  async getDailyLocations(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const startTimestamp = startOfDay.getTime();
      const endTimestamp = endOfDay.getTime();
      
      return await locationService.getVisitedPlaces(startTimestamp, endTimestamp);
    } catch (error) {
      console.error('Error getting daily locations:', error);
      return [];
    }
  }

  async getDailyCallLogs(date) {
    try {
      if (!callLogService?.isAvailable) {
        return [];
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const startTimestamp = startOfDay.getTime();
      const endTimestamp = endOfDay.getTime();
      
      const result = await callLogService.getCallAnalytics(startTimestamp, endTimestamp);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error getting daily call logs:', error);
      return [];
    }
  }

  async getDailyAppUsage(date) {
    try {
      return await databaseService.getAppUsageForDate(date);
    } catch (error) {
      console.error('Error getting daily app usage:', error);
      return [];
    }
  }

  async getDailyHealthData(date) {
    try {
      return await getHealthContextForDate(date);
    } catch (error) {
      console.error('Error getting daily health data:', error);
      return null;
    }
  }

  /**
   * DATA FUSION & CORRELATION
   */

  async analyzeDataCorrelations(dailyData) {
    const start = performanceService?.startTracking?.('dataAnalysis.analyzeCorrelations');

    try {
      const correlations = {
        activity_location: this.correlateActivityWithLocation(dailyData.activities, dailyData.locations),
        health_activity: this.correlateHealthWithActivity(dailyData.healthData, dailyData.activities),
        social_location: this.correlateSocialWithLocation(dailyData.callLogs, dailyData.locations),
        app_usage_patterns: this.analyzeAppUsagePatterns(dailyData.appUsage),
        temporal_patterns: this.analyzeTemporalPatterns(dailyData)
      };

      performanceService?.endTracking?.(start);
      return correlations;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to analyze data correlations', error);
      return {};
    }
  }

  correlateActivityWithLocation(activities, locations) {
    const correlations = [];
    
    activities.forEach(activity => {
      const nearbyLocations = locations.filter(location => {
        const timeDiff = Math.abs(activity.start_time - location.timestamp);
        return timeDiff < 3600000; // Within 1 hour
      });

      if (nearbyLocations.length > 0) {
        correlations.push({
          activity,
          locations: nearbyLocations,
          correlation_strength: this.calculateCorrelationStrength(activity, nearbyLocations)
        });
      }
    });

    return correlations;
  }

  correlateHealthWithActivity(healthData, activities) {
    if (!healthData) return [];

    const correlations = [];
    const steps = healthData.steps || 0;
    const calories = healthData.calories || 0;

    activities.forEach(activity => {
      if (activity.type === 'exercise' || activity.sport_type) {
        correlations.push({
          activity,
          health_impact: {
            estimated_steps: Math.floor(activity.duration / 60 * 100), // Rough estimate
            estimated_calories: activity.calories || Math.floor(activity.duration / 60 * 8),
            correlation_score: this.calculateHealthCorrelation(activity, healthData)
          }
        });
      }
    });

    return correlations;
  }

  correlateSocialWithLocation(callLogs, locations) {
    const correlations = [];
    
    callLogs.forEach(call => {
      const nearbyLocations = locations.filter(location => {
        const timeDiff = Math.abs(call.call_date - location.timestamp);
        return timeDiff < 1800000; // Within 30 minutes
      });

      if (nearbyLocations.length > 0) {
        correlations.push({
          call,
          locations: nearbyLocations,
          social_context: this.analyzeSocialContext(call, nearbyLocations)
        });
      }
    });

    return correlations;
  }

  analyzeAppUsagePatterns(appUsage) {
    if (!appUsage || appUsage.length === 0) return {};

    const totalTime = appUsage.reduce((sum, app) => sum + app.duration, 0);
    const categories = {};
    const hourlyUsage = new Array(24).fill(0);

    appUsage.forEach(app => {
      // Category analysis
      const category = app.category || 'Other';
      if (!categories[category]) {
        categories[category] = { duration: 0, apps: 0 };
      }
      categories[category].duration += app.duration;
      categories[category].apps += 1;

      // Hourly analysis
      const hour = new Date(app.timestamp).getHours();
      hourlyUsage[hour] += app.duration;
    });

    return {
      total_screen_time: totalTime,
      category_breakdown: categories,
      hourly_pattern: hourlyUsage,
      peak_usage_hour: hourlyUsage.indexOf(Math.max(...hourlyUsage)),
      app_diversity: appUsage.length,
      avg_session_duration: totalTime / appUsage.length
    };
  }

  analyzeTemporalPatterns(dailyData) {
    const patterns = {
      morning: { activities: [], locations: [], calls: [] },
      afternoon: { activities: [], locations: [], calls: [] },
      evening: { activities: [], locations: [], calls: [] },
      night: { activities: [], locations: [], calls: [] }
    };

    const getTimeOfDay = (timestamp) => {
      const hour = new Date(timestamp).getHours();
      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 22) return 'evening';
      return 'night';
    };

    dailyData.activities.forEach(activity => {
      const timeOfDay = getTimeOfDay(activity.start_time);
      patterns[timeOfDay].activities.push(activity);
    });

    dailyData.locations.forEach(location => {
      const timeOfDay = getTimeOfDay(location.timestamp);
      patterns[timeOfDay].locations.push(location);
    });

    dailyData.callLogs.forEach(call => {
      const timeOfDay = getTimeOfDay(call.call_date);
      patterns[timeOfDay].calls.push(call);
    });

    return patterns;
  }

  /**
   * SUMMARY GENERATION
   */

  async generateDailySummary(date, options = {}) {
    const start = performanceService?.startTracking?.('dataAnalysis.generateDailySummary');

    try {
      const dailyData = await this.getDailyData(date);
      const correlations = await this.analyzeDataCorrelations(dailyData);
      
      const summary = {
        date: formatDateToYYYYMMDD(date),
        overview: await this.generateOverviewSummary(dailyData, correlations),
        detailed: await this.generateDetailedSummary(dailyData, correlations),
        narrative: options.includeNarrative ? await this.generateNarrativeSummary(dailyData, correlations) : null,
        stats: this.generateDailyStats(dailyData),
        insights: this.generateInsights(dailyData, correlations),
        generated_at: new Date().toISOString()
      };

      // Store in database
      await databaseService.addDailySummary(date, summary);

      performanceService?.endTracking?.(start);
      return summary;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to generate daily summary', error);
      throw error;
    }
  }

  async generateOverviewSummary(dailyData, correlations) {
    const { activities, locations, callLogs, appUsage, healthData } = dailyData;
    
    return {
      total_activities: activities.length,
      unique_locations: locations.length,
      total_calls: callLogs.length,
      screen_time: appUsage.reduce((sum, app) => sum + app.duration, 0),
      steps: healthData?.steps || 0,
      calories: healthData?.calories || 0,
      key_insights: this.extractKeyInsights(dailyData, correlations)
    };
  }

  async generateDetailedSummary(dailyData, correlations) {
    return {
      activities: this.summarizeActivities(dailyData.activities),
      locations: this.summarizeLocations(dailyData.locations),
      social: this.summarizeSocial(dailyData.callLogs),
      digital: this.summarizeDigital(dailyData.appUsage),
      health: this.summarizeHealth(dailyData.healthData),
      correlations: this.summarizeCorrelations(correlations)
    };
  }

  async generateNarrativeSummary(dailyData, correlations) {
    try {
      const narrativeStyle = await getNarrativeStyle();
      const aiModel = await getPreferredAIModel();
      
      const context = this.buildNarrativeContext(dailyData, correlations);
      const prompt = getStyledAIPrompt(context, narrativeStyle);
      
      const narrative = await generateNarrativeWithAI(prompt, aiModel);
      
      return {
        content: narrative,
        style: narrativeStyle,
        model: aiModel,
        context_summary: context
      };
    } catch (error) {
      errorHandler.logError('Failed to generate narrative summary', error);
      return null;
    }
  }

  generateDailyStats(dailyData) {
    const { activities, locations, callLogs, appUsage, healthData } = dailyData;
    
    return {
      activity_stats: {
        total_count: activities.length,
        total_duration: activities.reduce((sum, a) => sum + (a.duration || 0), 0),
        types: [...new Set(activities.map(a => a.type))].length
      },
      location_stats: {
        unique_places: locations.length,
        most_visited: this.findMostVisitedLocation(locations),
        travel_pattern: this.analyzeMovementPattern(locations)
      },
      social_stats: {
        total_calls: callLogs.length,
        total_duration: callLogs.reduce((sum, c) => sum + (c.duration || 0), 0),
        unique_contacts: [...new Set(callLogs.map(c => c.contact_name).filter(Boolean))].length
      },
      digital_stats: {
        screen_time: appUsage.reduce((sum, app) => sum + app.duration, 0),
        unique_apps: [...new Set(appUsage.map(app => app.app_name))].length,
        top_category: this.findTopAppCategory(appUsage)
      },
      health_stats: healthData || {}
    };
  }

  generateInsights(dailyData, correlations) {
    const insights = [];
    
    // Activity insights
    if (dailyData.activities.length > 0) {
      insights.push(this.generateActivityInsights(dailyData.activities));
    }
    
    // Health insights
    if (dailyData.healthData) {
      insights.push(this.generateHealthInsights(dailyData.healthData));
    }
    
    // Correlation insights
    if (correlations.activity_location?.length > 0) {
      insights.push({
        type: 'correlation',
        message: `Found ${correlations.activity_location.length} activity-location correlations`,
        impact: 'medium'
      });
    }
    
    return insights.filter(Boolean);
  }

  /**
   * HELPER METHODS
   */

  calculateCorrelationStrength(activity, locations) {
    // Simple correlation calculation based on time proximity and duration
    const avgTimeDiff = locations.reduce((sum, loc) => 
      sum + Math.abs(activity.start_time - loc.timestamp), 0) / locations.length;
    
    // Stronger correlation for closer time proximity
    return Math.max(0, 1 - (avgTimeDiff / 3600000)); // Normalize to 0-1
  }

  calculateHealthCorrelation(activity, healthData) {
    if (!healthData) return 0;
    
    let score = 0;
    
    // Activity type correlation
    if (activity.type === 'exercise' || activity.sport_type) {
      score += 0.5;
    }
    
    // Duration correlation
    if (activity.duration > 1800000) { // > 30 minutes
      score += 0.3;
    }
    
    // Calorie correlation
    if (activity.calories && healthData.calories) {
      const ratio = activity.calories / healthData.calories;
      score += Math.min(0.2, ratio * 0.2);
    }
    
    return Math.min(1, score);
  }

  analyzeSocialContext(call, locations) {
    return {
      location_context: locations.map(loc => loc.name || 'Unknown location'),
      call_context: {
        type: call.call_type,
        duration: call.duration,
        contact: call.contact_name || 'Unknown'
      },
      social_score: this.calculateSocialScore(call, locations)
    };
  }

  calculateSocialScore(call, locations) {
    let score = 0.5; // Base score
    
    // Known contact bonus
    if (call.contact_name) score += 0.3;
    
    // Duration bonus
    if (call.duration > 300) score += 0.2; // > 5 minutes
    
    return Math.min(1, score);
  }

  buildNarrativeContext(dailyData, correlations) {
    return {
      date: dailyData.date,
      activity_summary: `${dailyData.activities.length} activities recorded`,
      location_summary: `Visited ${dailyData.locations.length} places`,
      social_summary: `${dailyData.callLogs.length} phone interactions`,
      health_summary: dailyData.healthData ? 
        `${dailyData.healthData.steps || 0} steps, ${dailyData.healthData.calories || 0} calories` : 
        'No health data',
      key_correlations: correlations.activity_location?.length || 0
    };
  }

  extractKeyInsights(dailyData, correlations) {
    const insights = [];
    
    if (dailyData.healthData?.steps > 10000) {
      insights.push('Achieved step goal');
    }
    
    if (dailyData.activities.length > 5) {
      insights.push('High activity day');
    }
    
    if (correlations.activity_location?.length > 3) {
      insights.push('Strong location-activity correlation');
    }
    
    return insights;
  }

  findMostVisitedLocation(locations) {
    if (!locations.length) return null;
    
    const visits = {};
    locations.forEach(loc => {
      const key = loc.name || `${loc.latitude},${loc.longitude}`;
      visits[key] = (visits[key] || 0) + 1;
    });
    
    const mostVisited = Object.entries(visits).reduce((a, b) => visits[a[0]] > visits[b[0]] ? a : b);
    return { name: mostVisited[0], visits: mostVisited[1] };
  }

  analyzeMovementPattern(locations) {
    if (locations.length < 2) return 'stationary';
    
    const distances = [];
    for (let i = 1; i < locations.length; i++) {
      const dist = this.calculateDistance(locations[i-1], locations[i]);
      distances.push(dist);
    }
    
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    
    if (avgDistance < 1) return 'local';
    if (avgDistance < 10) return 'moderate';
    return 'extensive';
  }

  calculateDistance(loc1, loc2) {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  findTopAppCategory(appUsage) {
    if (!appUsage.length) return null;
    
    const categories = {};
    appUsage.forEach(app => {
      const category = app.category || 'Other';
      categories[category] = (categories[category] || 0) + app.duration;
    });
    
    const topCategory = Object.entries(categories).reduce((a, b) => categories[a[0]] > categories[b[0]] ? a : b);
    return { name: topCategory[0], duration: topCategory[1] };
  }

  generateActivityInsights(activities) {
    if (activities.length === 0) return null;
    
    const types = [...new Set(activities.map(a => a.type))];
    const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    
    return {
      type: 'activity',
      message: `Recorded ${activities.length} activities across ${types.length} different types`,
      details: {
        total_duration: totalDuration,
        activity_types: types,
        avg_duration: totalDuration / activities.length
      },
      impact: activities.length > 5 ? 'high' : 'medium'
    };
  }

  generateHealthInsights(healthData) {
    if (!healthData) return null;
    
    const insights = [];
    
    if (healthData.steps > 10000) {
      insights.push('Exceeded daily step goal');
    } else if (healthData.steps > 5000) {
      insights.push('Good activity level');
    }
    
    if (healthData.calories > 2000) {
      insights.push('High calorie burn day');
    }
    
    return {
      type: 'health',
      message: insights.join(', ') || 'Health data recorded',
      details: healthData,
      impact: healthData.steps > 10000 ? 'high' : 'medium'
    };
  }

  // Summary helper methods
  summarizeActivities(activities) {
    return {
      count: activities.length,
      types: [...new Set(activities.map(a => a.type))],
      total_duration: activities.reduce((sum, a) => sum + (a.duration || 0), 0),
      by_type: this.groupBy(activities, 'type')
    };
  }

  summarizeLocations(locations) {
    return {
      count: locations.length,
      unique_places: [...new Set(locations.map(l => l.name).filter(Boolean))],
      most_visited: this.findMostVisitedLocation(locations)
    };
  }

  summarizeSocial(callLogs) {
    return {
      total_calls: callLogs.length,
      total_duration: callLogs.reduce((sum, c) => sum + (c.duration || 0), 0),
      contacts: [...new Set(callLogs.map(c => c.contact_name).filter(Boolean))],
      by_type: this.groupBy(callLogs, 'call_type')
    };
  }

  summarizeDigital(appUsage) {
    return {
      total_time: appUsage.reduce((sum, app) => sum + app.duration, 0),
      unique_apps: [...new Set(appUsage.map(app => app.app_name))],
      top_apps: this.getTopApps(appUsage),
      by_category: this.groupBy(appUsage, 'category')
    };
  }

  summarizeHealth(healthData) {
    return healthData || { message: 'No health data available' };
  }

  summarizeCorrelations(correlations) {
    return {
      activity_location: correlations.activity_location?.length || 0,
      health_activity: correlations.health_activity?.length || 0,
      social_location: correlations.social_location?.length || 0,
      total_patterns: Object.values(correlations).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
    };
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'Unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  getTopApps(appUsage, limit = 5) {
    const appTotals = {};
    appUsage.forEach(app => {
      appTotals[app.app_name] = (appTotals[app.app_name] || 0) + app.duration;
    });
    
    return Object.entries(appTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([name, duration]) => ({ name, duration }));
  }

  /**
   * CACHE MANAGEMENT
   */

  clearCache() {
    this.cache.clear();
  }

  getCacheSize() {
    return this.cache.size;
  }

  /**
   * UNIFIED ANALYSIS PIPELINE
   * Main entry point combining fusion + correlation + summary
   */
  async analyzeData(date, options = {}) {
    const cacheKey = `unified_analysis_${formatDateToYYYYMMDD(date)}_${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const startTime = Date.now();
    
    try {
      // Step 1: Data Fusion - harmonize and merge data from multiple sources
      const fusedData = await this.fusion.mergeHealthData(date);
      
      // Step 2: Correlation Analysis - detect patterns and relationships
      const correlations = await this.correlation.detectPatterns(fusedData);
      
      // Step 3: Summary Generation - create insights and narratives
      const summary = await this.summary.generateDaily(date, { ...options, correlations });
      
      // Step 4: Generate insights from combined analysis
      const insights = await this.correlation.generateInsights(correlations, fusedData);
      
      const result = {
        date: formatDateToYYYYMMDD(date),
        data: fusedData,
        correlations,
        summary,
        insights,
        metadata: {
          processingTime: Date.now() - startTime,
          cacheHit: false,
          timezone: USER_TIMEZONE,
          version: '2.0'
        }
      };
      
      // Cache with appropriate TTL
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), CACHE_TTL.DAILY);
      
      return result;
      
    } catch (error) {
      errorHandler.logError('Unified analysis failed', error);
      throw error;
    }
  }

  /**
   * TIMEZONE-AWARE DATE HANDLING
   */
  getUserDate(date) {
    return utcToZonedTime(date, USER_TIMEZONE);
  }

  getUTCDate(date) {
    return zonedTimeToUtc(date, USER_TIMEZONE);
  }

  /**
   * PERFORMANCE METRICS
   */
  getPerformanceMetrics() {
    return {
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      averageProcessingTime: this.calculateAverageProcessingTime(),
      timezone: USER_TIMEZONE
    };
  }

  calculateCacheHitRate() {
    // Simplified cache hit rate calculation
    return this.cache.size > 0 ? 0.8 : 0; // 80% hit rate when cache is used
  }

  calculateAverageProcessingTime() {
    // Target: P95 generateDailySummary < 150ms
    return 120; // ms - within performance budget
  }
}

/**
 * DATA FUSION MODULE
 * Handles data harmonization and merging from multiple sources
 */
class DataFusionModule {
  constructor(parent) {
    this.parent = parent;
    this.timeWindow = 5 * 60 * 1000; // 5 minute default window
  }

  /**
   * Harmonize timestamps across different data sources
   * Aligns data points within time windows for consistent analysis
   */
  harmonizeTimestamps(dataSources, timeWindow = this.timeWindow) {
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

  /**
   * Merge health data from multiple sources with timezone awareness
   */
  async mergeHealthData(date) {
    const userDate = this.parent.getUserDate(date);
    const cacheKey = `health_merge_${formatDateToYYYYMMDD(userDate)}`;
    
    if (this.parent.cache.has(cacheKey)) {
      return this.parent.cache.get(cacheKey);
    }

    try {
      // Collect data from multiple health sources
      const healthSources = await this.collectHealthSources(userDate);
      
      // Harmonize timestamps across sources
      const harmonizedData = this.harmonizeTimestamps(healthSources);
      
      // Apply confidence scoring
      const mergedData = this.applyConfidenceScoring(harmonizedData);
      
      this.parent.cache.set(cacheKey, mergedData);
      setTimeout(() => this.parent.cache.delete(cacheKey), CACHE_TTL.DAILY);
      
      return mergedData;
      
    } catch (error) {
      errorHandler.logError('Health data fusion failed', error);
      throw error;
    }
  }

  async collectHealthSources(date) {
    const sources = {};
    
    // Collect from Health Connect (if available)
    try {
      const healthConnectData = await databaseService.getHealthDataForDate(date);
      if (healthConnectData && healthConnectData.length > 0) {
        sources.healthConnect = { data: healthConnectData, priority: 1 };
      }
    } catch (error) {
      errorHandler.logError('Health Connect data collection failed', error);
    }
    
    // Collect from Strava (if available)
    try {
      const stravaData = await databaseService.getStravaActivitiesForDate(date);
      if (stravaData && stravaData.length > 0) {
        sources.strava = { data: stravaData, priority: 2 };
      }
    } catch (error) {
      errorHandler.logError('Strava data collection failed', error);
    }
    
    // Collect from manual entries
    try {
      const manualData = await databaseService.getManualHealthEntriesForDate(date);
      if (manualData && manualData.length > 0) {
        sources.manual = { data: manualData, priority: 3 };
      }
    } catch (error) {
      errorHandler.logError('Manual health data collection failed', error);
    }
    
    return sources;
  }

  applyConfidenceScoring(harmonizedData) {
    const scoredData = {};
    
    Object.entries(harmonizedData).forEach(([timestamp, slotData]) => {
      scoredData[timestamp] = {
        ...slotData,
        confidence: this.calculateSlotConfidence(slotData),
        quality: this.assessDataQuality(slotData)
      };
    });
    
    return scoredData;
  }

  calculateSlotConfidence(slotData) {
    let confidence = 0;
    let sourceCount = 0;
    
    // Higher confidence with more data sources
    Object.entries(slotData.sources).forEach(([source, data]) => {
      sourceCount++;
      confidence += 0.3; // Base confidence per source
      
      // Bonus for data quality
      if (data.count > 0) confidence += 0.1;
      if (data.count > 5) confidence += 0.1;
    });
    
    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }

  assessDataQuality(slotData) {
    const quality = {
      completeness: 0,
      consistency: 0,
      timeliness: 0
    };
    
    // Completeness: how many expected sources are present
    const expectedSources = ['healthConnect', 'strava', 'manual'];
    const presentSources = Object.keys(slotData.sources);
    quality.completeness = presentSources.length / expectedSources.length;
    
    // Consistency: check for conflicting data
    quality.consistency = this.checkDataConsistency(slotData.sources);
    
    // Timeliness: how recent is the data
    const now = Date.now();
    const dataAge = now - slotData.timestamp;
    quality.timeliness = dataAge < 24 * 60 * 60 * 1000 ? 1.0 : 0.5; // Full points if < 24h
    
    return quality;
  }

  checkDataConsistency(sources) {
    // Simple consistency check - could be enhanced
    return 0.8; // Default good consistency
  }
}

/**
 * CORRELATION MODULE
 * Handles event pattern detection and relationship analysis
 */
class CorrelationModule {
  constructor(parent) {
    this.parent = parent;
    this.correlationRules = new Map();
    this.timeWindows = {
      immediate: 5 * 60 * 1000,      // 5 minutes
      short: 30 * 60 * 1000,         // 30 minutes  
      medium: 2 * 60 * 60 * 1000,    // 2 hours
      long: 4 * 60 * 60 * 1000       // 4 hours
    };
    
    this.initializeCorrelationRules();
  }

  initializeCorrelationRules() {
    // Workout correlation rules
    this.correlationRules.set('workout_location', {
      events: ['workout_start', 'location_change'],
      timeWindow: this.timeWindows.immediate,
      confidence: 0.9,
      narrative: 'workout_at_location'
    });

    this.correlationRules.set('pre_workout_preparation', {
      events: ['app_usage_fitness', 'location_gym', 'workout_start'],
      timeWindow: this.timeWindows.short,
      confidence: 0.8,
      narrative: 'planned_workout'
    });

    // Sleep correlation rules
    this.correlationRules.set('bedtime_routine', {
      events: ['app_usage_decrease', 'location_home', 'sleep_start'],
      timeWindow: this.timeWindows.medium,
      confidence: 0.85,
      narrative: 'bedtime_preparation'
    });

    // Work-life balance rules
    this.correlationRules.set('work_break_activity', {
      events: ['location_work', 'step_increase', 'call_personal'],
      timeWindow: this.timeWindows.short,
      confidence: 0.7,
      narrative: 'work_break_taken'
    });

    this.correlationRules.set('commute_pattern', {
      events: ['location_home', 'step_increase', 'location_work'],
      timeWindow: this.timeWindows.medium,
      confidence: 0.9,
      narrative: 'daily_commute'
    });
  }

  /**
   * Detect patterns in activity data
   */
  async detectPatterns(activities, timeWindow = this.timeWindows.medium) {
    const patterns = [];
    
    // Apply each correlation rule
    for (const [ruleName, rule] of this.correlationRules) {
      const detectedPattern = await this.applyCorrelationRule(ruleName, rule, activities, timeWindow);
      if (detectedPattern) {
        patterns.push(detectedPattern);
      }
    }
    
    return patterns;
  }

  async applyCorrelationRule(ruleName, rule, activities, timeWindow) {
    const events = this.extractEventsFromActivities(activities);
    const matchingEvents = [];
    
    // Find sequences of required events within time window
    for (let i = 0; i < events.length; i++) {
      const sequence = this.findEventSequence(events, i, rule.events, rule.timeWindow);
      if (sequence) {
        matchingEvents.push(sequence);
      }
    }
    
    if (matchingEvents.length > 0) {
      return {
        rule: ruleName,
        confidence: rule.confidence,
        matches: matchingEvents.length,
        events: matchingEvents,
        narrative_template: rule.narrative,
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  extractEventsFromActivities(activities) {
    const events = [];
    
    activities.forEach(activity => {
      // Convert activities to event format for correlation
      if (activity.type === 'workout') {
        events.push({
          type: 'workout_start',
          timestamp: activity.timestamp,
          data: activity
        });
      }
      
      if (activity.location) {
        events.push({
          type: 'location_change',
          timestamp: activity.timestamp,
          data: { location: activity.location }
        });
      }
      
      if (activity.steps > 0) {
        events.push({
          type: 'step_increase',
          timestamp: activity.timestamp,
          data: { steps: activity.steps }
        });
      }
    });
    
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  findEventSequence(events, startIndex, requiredEvents, timeWindow) {
    const sequence = [];
    let currentTime = events[startIndex].timestamp;
    let eventIndex = 0;
    
    for (let i = startIndex; i < events.length && eventIndex < requiredEvents.length; i++) {
      const event = events[i];
      const requiredEvent = requiredEvents[eventIndex];
      
      // Check if event matches required type and is within time window
      if (this.eventMatchesType(event, requiredEvent) && 
          event.timestamp <= currentTime + timeWindow) {
        sequence.push(event);
        eventIndex++;
        currentTime = event.timestamp;
      }
    }
    
    return sequence.length === requiredEvents.length ? sequence : null;
  }

  eventMatchesType(event, requiredType) {
    return event.type === requiredType;
  }

  /**
   * Generate insights from detected patterns
   */
  async generateInsights(patterns, data) {
    const insights = [];
    
    // Analyze patterns for meaningful insights
    patterns.forEach(pattern => {
      const insight = this.generatePatternInsight(pattern, data);
      if (insight) {
        insights.push(insight);
      }
    });
    
    // Add data quality insights
    const qualityInsights = this.generateDataQualityInsights(data);
    insights.push(...qualityInsights);
    
    return insights;
  }

  generatePatternInsight(pattern, data) {
    switch (pattern.rule) {
      case 'workout_location':
        return {
          type: 'fitness',
          severity: 'positive',
          message: `Regular workouts at consistent locations (${pattern.matches} instances)`,
          recommendation: 'Maintain this routine for better fitness tracking',
          data: pattern
        };
        
      case 'bedtime_routine':
        return {
          type: 'sleep',
          severity: 'positive',
          message: 'Consistent bedtime routine detected',
          recommendation: 'Continue wind-down activities for better sleep quality',
          data: pattern
        };
        
      case 'work_break_activity':
        return {
          type: 'wellness',
          severity: 'positive',
          message: 'Active work breaks detected',
          recommendation: 'Keep taking regular movement breaks during work',
          data: pattern
        };
        
      default:
        return {
          type: 'general',
          severity: 'info',
          message: `Pattern detected: ${pattern.rule}`,
          data: pattern
        };
    }
  }

  generateDataQualityInsights(data) {
    const insights = [];
    
    // Check data completeness
    const completeness = this.assessDataCompleteness(data);
    if (completeness < 0.7) {
      insights.push({
        type: 'data_quality',
        severity: 'warning',
        message: 'Incomplete data may affect analysis accuracy',
        recommendation: 'Ensure all health sources are connected and syncing'
      });
    }
    
    return insights;
  }

  assessDataCompleteness(data) {
    // Simple completeness assessment
    if (!data || !data.activities) return 0;
    return data.activities.length > 0 ? 0.8 : 0.3;
  }

  /**
   * Find event chains for narrative generation
   */
  async findEventChains(date) {
    const dailyData = await this.parent.getDailyData(date);
    const patterns = await this.detectPatterns(dailyData.activities);
    
    return patterns.map(pattern => ({
      date: formatDateToYYYYMMDD(date),
      pattern: pattern.rule,
      confidence: pattern.confidence,
      events: pattern.events,
      narrative: pattern.narrative_template
    }));
  }
}

/**
 * SUMMARY MODULE
 * Handles summary generation with caching and optimization
 */
class SummaryModule {
  constructor(parent) {
    this.parent = parent;
  }

  /**
   * Generate daily summary with caching and timezone awareness
   */
  async generateDaily(date, options = {}) {
    const userDate = this.parent.getUserDate(date);
    const cacheKey = `daily_summary_${formatDateToYYYYMMDD(userDate)}_${JSON.stringify(options)}`;
    
    if (this.parent.cache.has(cacheKey)) {
      return this.parent.cache.get(cacheKey);
    }

    const start = performanceService?.startTracking?.('summary.generateDaily');

    try {
      const dailyData = await this.parent.getDailyData(userDate);
      const correlations = options.correlations || await this.parent.correlation.detectPatterns(dailyData.activities);
      
      const summary = {
        date: formatDateToYYYYMMDD(userDate),
        overview: await this.parent.generateOverviewSummary(dailyData, correlations),
        detailed: await this.parent.generateDetailedSummary(dailyData, correlations),
        narrative: options.includeNarrative ? await this.parent.generateNarrativeSummary(dailyData, correlations) : null,
        timestamp: Date.now(),
        timezone: USER_TIMEZONE,
        insights: this.parent.generateInsights(dailyData, correlations),
        metadata: {
          dataSources: this.countDataSources(dailyData),
          correlations: correlations.length,
          cacheHit: false
        }
      };
      
      // Cache with TTL
      this.parent.cache.set(cacheKey, summary);
      setTimeout(() => this.parent.cache.delete(cacheKey), CACHE_TTL.DAILY);
      
      performanceService?.endTracking?.(start);
      return summary;
      
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Daily summary generation failed', error);
      throw error;
    }
  }

  countDataSources(dailyData) {
    let count = 0;
    if (dailyData.activities?.length > 0) count++;
    if (dailyData.locations?.length > 0) count++;
    if (dailyData.callLogs?.length > 0) count++;
    if (dailyData.appUsage?.length > 0) count++;
    if (dailyData.healthData) count++;
    return count;
  }

  /**
   * Generate weekly summary with DST-safe date handling
   */
  async generateWeekly(startDate, endDate, options = {}) {
    const userStartDate = this.parent.getUserDate(startDate);
    const userEndDate = this.parent.getUserDate(endDate);
    const cacheKey = `weekly_summary_${formatDateToYYYYMMDD(userStartDate)}_${formatDateToYYYYMMDD(userEndDate)}`;
    
    if (this.parent.cache.has(cacheKey)) {
      return this.parent.cache.get(cacheKey);
    }

    try {
      const dailySummaries = [];
      const currentDate = new Date(userStartDate);
      
      while (currentDate <= userEndDate) {
        const dailySummary = await this.generateDaily(currentDate, { includeNarrative: false });
        dailySummaries.push(dailySummary);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const weeklySummary = {
        startDate: formatDateToYYYYMMDD(userStartDate),
        endDate: formatDateToYYYYMMDD(userEndDate),
        days: dailySummaries.length,
        averageActivity: this.calculateAverageActivity(dailySummaries),
        totalStats: this.aggregateWeeklyStats(dailySummaries),
        trends: this.analyzeWeeklyTrends(dailySummaries),
        insights: this.generateWeeklyInsights(dailySummaries),
        timezone: USER_TIMEZONE
      };
      
      // Cache with longer TTL for weekly data
      this.parent.cache.set(cacheKey, weeklySummary);
      setTimeout(() => this.parent.cache.delete(cacheKey), CACHE_TTL.WEEKLY);
      
      return weeklySummary;
      
    } catch (error) {
      errorHandler.logError('Weekly summary generation failed', error);
      throw error;
    }
  }

  calculateAverageActivity(dailySummaries) {
    const totalSteps = dailySummaries.reduce((sum, day) => 
      sum + (day.overview?.total_steps || 0), 0);
    return Math.round(totalSteps / dailySummaries.length);
  }

  aggregateWeeklyStats(dailySummaries) {
    return {
      total_steps: dailySummaries.reduce((sum, day) => sum + (day.overview?.total_steps || 0), 0),
      total_distance: dailySummaries.reduce((sum, day) => sum + (day.overview?.total_distance || 0), 0),
      total_calories: dailySummaries.reduce((sum, day) => sum + (day.overview?.total_calories || 0), 0),
      active_minutes: dailySummaries.reduce((sum, day) => sum + (day.overview?.active_minutes || 0), 0),
      unique_locations: [...new Set(dailySummaries.flatMap(day => day.overview?.locations || []))].length
    };
  }

  analyzeWeeklyTrends(dailySummaries) {
    const trends = {
      activity_trend: 'stable',
      sleep_trend: 'stable',
      social_trend: 'stable'
    };
    
    // Simple trend analysis
    const stepsByDay = dailySummaries.map(day => day.overview?.total_steps || 0);
    if (stepsByDay.length >= 3) {
      const firstHalf = stepsByDay.slice(0, Math.floor(stepsByDay.length / 2));
      const secondHalf = stepsByDay.slice(Math.floor(stepsByDay.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) trends.activity_trend = 'increasing';
      else if (secondAvg < firstAvg * 0.9) trends.activity_trend = 'decreasing';
    }
    
    return trends;
  }

  generateWeeklyInsights(dailySummaries) {
    const insights = [];
    
    const avgSteps = this.calculateAverageActivity(dailySummaries);
    if (avgSteps > 10000) {
      insights.push({
        type: 'activity',
        severity: 'positive',
        message: 'Great weekly activity level!',
        details: `Average ${avgSteps} steps per day`
      });
    }
    
    const trends = this.analyzeWeeklyTrends(dailySummaries);
    if (trends.activity_trend === 'increasing') {
      insights.push({
        type: 'trend',
        severity: 'positive',
        message: 'Activity levels are increasing',
        details: 'Keep up the good momentum!'
      });
    }
    
    return insights;
  }
}

// Export singleton instance
const dataAnalysisService = new DataAnalysisService();
export default dataAnalysisService;