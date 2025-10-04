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

class DataAnalysisService {
  constructor() {
    this.cache = new Map();
    this.analysisQueue = [];
    this.isProcessing = false;
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
}

// Export singleton instance
const dataAnalysisService = new DataAnalysisService();
export default dataAnalysisService;