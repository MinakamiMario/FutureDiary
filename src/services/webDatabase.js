// src/services/webDatabase.js - Web-compatible database using localStorage
import { BaseService } from './BaseService';
import { formatDateToYYYYMMDD } from '../utils/formatters';

class WebDatabaseService extends BaseService {
  constructor() {
    super('WebDatabaseService');
    this.dbName = 'minakami_web_db';
    this.version = 1;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      await this.ensureInitialized();
      
      // Initialize tables if they don't exist
      await this.initializeTables();
      
      this.isInitialized = true;
      if (__DEV__) console.log('✅ Web Database initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Web Database initialization failed:', error);
      throw error;
    }
  }

  async initializeTables() {
    const tables = [
      'locations', 'activities', 'call_logs', 'daily_summaries', 
      'error_logs', 'performance_metrics', 'app_settings'
    ];

    for (const table of tables) {
      if (!this.getTableData(table)) {
        this.setTableData(table, []);
      }
    }
  }

  // localStorage wrapper methods
  getTableData(tableName) {
    try {
      const data = localStorage.getItem(`${this.dbName}_${tableName}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error reading table ${tableName}:`, error);
      return null;
    }
  }

  setTableData(tableName, data) {
    try {
      localStorage.setItem(`${this.dbName}_${tableName}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error writing table ${tableName}:`, error);
      return false;
    }
  }

  // Generic execute query method
  async executeQuery(query, params = []) {
    // For web, we'll simulate SQL operations with array operations
    // This is a simplified implementation for demo purposes
    
    try {
      // Parse simple queries (this is a basic implementation)
      if (query.includes('SELECT COUNT(*) as count FROM locations')) {
        const locations = this.getTableData('locations') || [];
        return [{ count: locations.length }];
      }
      
      if (query.includes('SELECT COUNT(*) as count FROM activities')) {
        const activities = this.getTableData('activities') || [];
        return [{ count: activities.length }];
      }
      
      if (query.includes('SELECT COUNT(*) as count FROM call_logs')) {
        const callLogs = this.getTableData('call_logs') || [];
        return [{ count: callLogs.length }];
      }

      // Default empty result
      return [];
    } catch (error) {
      console.error('Query execution error:', error);
      return [];
    }
  }

  // Location methods
  async saveLocation(locationData) {
    try {
      const locations = this.getTableData('locations') || [];
      const newLocation = {
        id: Date.now(),
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy || 0,
        altitude: locationData.altitude || 0,
        speed: locationData.speed || 0,
        timestamp: locationData.timestamp || Date.now(),
        address: locationData.address || '',
        created_at: Date.now()
      };
      
      locations.push(newLocation);
      this.setTableData('locations', locations);
      
      return { success: true, id: newLocation.id };
    } catch (error) {
      console.error('Error saving location:', error);
      return { success: false, error: error.message };
    }
  }

  async getLocations(startDate, endDate) {
    try {
      const locations = this.getTableData('locations') || [];
      return locations.filter(location => {
        const locationDate = new Date(location.timestamp);
        return locationDate >= new Date(startDate) && locationDate <= new Date(endDate);
      });
    } catch (error) {
      console.error('Error getting locations:', error);
      return [];
    }
  }

  // Activity methods
  async saveActivity(activityData) {
    try {
      const activities = this.getTableData('activities') || [];
      const newActivity = {
        id: Date.now(),
        type: activityData.type || activityData.activity_type || 'unknown',
        confidence: activityData.confidence || 0,
        steps: activityData.steps || 0,
        distance: activityData.distance || 0,
        calories: activityData.calories || 0,
        start_time: activityData.start_time || activityData.timestamp || Date.now(),
        duration: activityData.duration || 0,
        created_at: Date.now()
      };
      
      activities.push(newActivity);
      this.setTableData('activities', activities);
      
      return { success: true, id: newActivity.id };
    } catch (error) {
      console.error('Error saving activity:', error);
      return { success: false, error: error.message };
    }
  }

  async getActivities(startDate, endDate) {
    try {
      const activities = this.getTableData('activities') || [];
      return activities.filter(activity => {
        const activityDate = new Date(activity.start_time || activity.timestamp);
        return activityDate >= new Date(startDate) && activityDate <= new Date(endDate);
      });
    } catch (error) {
      console.error('Error getting activities:', error);
      return [];
    }
  }

  // Call log methods
  async saveCallLog(callData) {
    try {
      const callLogs = this.getTableData('call_logs') || [];
      const newCall = {
        id: Date.now(),
        phone_number: callData.phoneNumber || '',
        contact_name: callData.contactName || '',
        call_type: callData.callType || 'unknown',
        call_date: callData.callDate || Date.now(),
        duration: callData.duration || 0,
        created_at: Date.now()
      };
      
      callLogs.push(newCall);
      this.setTableData('call_logs', callLogs);
      
      return { success: true, id: newCall.id };
    } catch (error) {
      console.error('Error saving call log:', error);
      return { success: false, error: error.message };
    }
  }

  async getCallLogs(startDate, endDate) {
    try {
      const callLogs = this.getTableData('call_logs') || [];
      return callLogs.filter(call => {
        const callDate = new Date(call.call_date);
        return callDate >= new Date(startDate) && callDate <= new Date(endDate);
      });
    } catch (error) {
      console.error('Error getting call logs:', error);
      return [];
    }
  }

  // Daily summary methods
  async saveDailySummary(summaryData) {
    try {
      const summaries = this.getTableData('daily_summaries') || [];
      const dateStr = formatDateToYYYYMMDD(new Date(summaryData.date));
      
      // Remove existing summary for the same date
      const filteredSummaries = summaries.filter(s => s.date !== dateStr);
      
      const newSummary = {
        id: Date.now(),
        date: dateStr,
        total_locations: summaryData.totalLocations || 0,
        total_activities: summaryData.totalActivities || 0,
        total_calls: summaryData.totalCalls || 0,
        steps: summaryData.steps || 0,
        distance: summaryData.distance || 0,
        calories: summaryData.calories || 0,
        narrative: summaryData.narrative || '',
        mood_score: summaryData.moodScore || 5,
        created_at: Date.now()
      };
      
      filteredSummaries.push(newSummary);
      this.setTableData('daily_summaries', filteredSummaries);
      
      return { success: true, id: newSummary.id };
    } catch (error) {
      console.error('Error saving daily summary:', error);
      return { success: false, error: error.message };
    }
  }

  async getDailySummary(date) {
    try {
      const summaries = this.getTableData('daily_summaries') || [];
      const dateStr = formatDateToYYYYMMDD(new Date(date));
      return summaries.find(s => s.date === dateStr) || null;
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return null;
    }
  }

  // Dashboard methods
  async getDashboardData() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const locations = await this.getLocations(startOfDay, endOfDay);
      const activities = await this.getActivities(startOfDay, endOfDay);
      const callLogs = await this.getCallLogs(startOfDay, endOfDay);

      const totalSteps = activities.reduce((sum, activity) => sum + (activity.steps || 0), 0);
      const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
      const totalCalories = activities.reduce((sum, activity) => sum + (activity.calories || 0), 0);

      return {
        locationsCount: locations.length,
        activitiesCount: activities.length,
        callsCount: callLogs.length,
        totalSteps,
        totalDistance,
        totalCalories,
        lastUpdate: Date.now()
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return {
        locationsCount: 0,
        activitiesCount: 0,
        callsCount: 0,
        totalSteps: 0,
        totalDistance: 0,
        totalCalories: 0,
        lastUpdate: Date.now()
      };
    }
  }

  // Trends methods
  async getTrends(days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const summaries = this.getTableData('daily_summaries') || [];
      const trends = summaries.filter(summary => {
        const summaryDate = new Date(summary.date);
        return summaryDate >= startDate && summaryDate <= endDate;
      }).map(summary => ({
        date: summary.date,
        steps: summary.steps || 0,
        distance: summary.distance || 0,
        calories: summary.calories || 0,
        locations: summary.total_locations || 0,
        activities: summary.total_activities || 0,
        calls: summary.total_calls || 0
      }));

      return trends;
    } catch (error) {
      console.error('Error getting trends:', error);
      return [];
    }
  }

  // Cleanup method
  async cleanup() {
    // For web version, we keep data in localStorage
    // Could implement data retention policies here
    if (__DEV__) console.log('Web database cleanup completed');
  }
}

// Singleton instance
const webDatabaseService = new WebDatabaseService();
export default webDatabaseService;