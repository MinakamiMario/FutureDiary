/**
 * Unified Database System - MinakamiApp
 * 
 * Refactored from single 102KB monolith to clean repository pattern.
 * 
 * Architecture:
 * - Core: DatabaseConnection, DatabaseMigrations
 * - Repositories: Domain-specific data access objects
 * - Single export for backwards compatibility
 */

import databaseConnection from './core/DatabaseConnection';
import databaseMigrations from './core/DatabaseMigrations';
import activityRepository from './repositories/ActivityRepository';
import locationRepository from './repositories/LocationRepository';
import appUsageRepository from './repositories/AppUsageRepository';
import narrativeRepository from './repositories/NarrativeRepository';
import callLogRepository from './repositories/CallLogRepository';

/**
 * Legacy DatabaseService interface for backwards compatibility
 * Delegates to appropriate repositories while maintaining same API
 */
class DatabaseService {
  constructor() {
    this.activityRepository = activityRepository;
    this.locationRepository = locationRepository;
    this.appUsageRepository = appUsageRepository;
    this.narrativeRepository = narrativeRepository;
    this.callLogRepository = callLogRepository;
    this.connection = databaseConnection;
    this.migrations = databaseMigrations;
    
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.migrations.initializeDatabase();
    this.initialized = true;
  }

  // Legacy method delegation for backwards compatibility
  async requestStoragePermissions() {
    return this.connection.requestStoragePermissions();
  }

  async execAsync(query, params) {
    return this.connection.execAsync(query, params);
  }

  async getAll(query, params) {
    return this.connection.getAll(query, params);
  }

  async run(query, params) {
    return this.connection.run(query, params);
  }

  async getFirst(query, params) {
    return this.connection.getFirst(query, params);
  }

  // ACTIVITY METHODS - delegate to ActivityRepository
  async addActivity(activity) {
    return this.activityRepository.addActivity(activity);
  }

  async getActivitiesForDateRange(startDate, endDate) {
    return this.activityRepository.getActivitiesForDateRange(startDate, endDate);
  }

  async getActivitiesForDate(date) {
    return this.activityRepository.getActivitiesForDate(date);
  }

  async getRecentActivities(limit = 10) {
    return this.activityRepository.getRecentActivities(limit);
  }

  async getActivityById(id) {
    return this.activityRepository.getActivityById(id);
  }

  async updateActivity(id, updates) {
    return this.activityRepository.updateActivity(id, updates);
  }

  async deleteActivity(id) {
    return this.activityRepository.deleteActivity(id);
  }

  async getActivitiesByType(type, limit) {
    return this.activityRepository.getActivitiesByType(type, limit);
  }

  async getStravaActivities() {
    return this.activityRepository.getStravaActivities();
  }

  async findActivityByStravaId(stravaId) {
    return this.activityRepository.findActivityByStravaId(stravaId);
  }

  // LOCATION METHODS - delegate to LocationRepository
  async addLocation(location) {
    return this.locationRepository.addLocation(location);
  }

  async getLocationsForDateRange(startDate, endDate) {
    return this.locationRepository.getLocationsForDateRange(startDate, endDate);
  }

  async getRecentLocations(limit) {
    return this.locationRepository.getRecentLocations(limit);
  }

  async findNearbyLocation(latitude, longitude, radiusMeters) {
    return this.locationRepository.findNearbyLocation(latitude, longitude, radiusMeters);
  }

  async updateLocationVisit(id, timestamp) {
    return this.locationRepository.updateLocationVisit(id, timestamp);
  }

  async updateLocationName(id, name) {
    return this.locationRepository.updateLocationName(id, name);
  }

  async getMostVisitedLocations(limit) {
    return this.locationRepository.getMostVisitedLocations(limit);
  }

  // APP USAGE METHODS - delegate to AppUsageRepository
  async addAppUsage(usage) {
    return this.appUsageRepository.addAppUsage(usage);
  }

  async getAppUsageForDate(date) {
    return this.appUsageRepository.getAppUsageForDate(date);
  }

  async getAppUsageForDateRange(startDate, endDate) {
    return this.appUsageRepository.getAppUsageForDateRange(startDate, endDate);
  }

  async getTopAppsForDate(date, limit) {
    return this.appUsageRepository.getTopAppsForDate(date, limit);
  }

  async getAppUsageStats(date) {
    return this.appUsageRepository.getAppUsageStats(date);
  }

  // NARRATIVE METHODS - delegate to NarrativeRepository
  async addNarrativeSummary(date, summary) {
    return this.narrativeRepository.addNarrativeSummary(date, summary);
  }

  async getNarrativeSummary(date) {
    return this.narrativeRepository.getNarrativeSummary(date);
  }

  async addDailySummary(date, summaryData) {
    return this.narrativeRepository.addDailySummary(date, summaryData);
  }

  async getDailySummary(date) {
    return this.narrativeRepository.getDailySummary(date);
  }

  async addUserNote(date, noteText) {
    return this.narrativeRepository.addUserNote(date, noteText);
  }

  async getUserNotesForDate(date) {
    return this.narrativeRepository.getUserNotesForDate(date);
  }

  async getRecentUserNotes(limit) {
    return this.narrativeRepository.getRecentUserNotes(limit);
  }

  async updateUserNote(id, noteText) {
    return this.narrativeRepository.updateUserNote(id, noteText);
  }

  async deleteUserNote(id) {
    return this.narrativeRepository.deleteUserNote(id);
  }

  // CALL LOG METHODS - delegate to CallLogRepository
  async addCallLog(callLog) {
    return this.callLogRepository.addCallLog(callLog);
  }

  async getCallLogsForDate(date) {
    return this.callLogRepository.getCallLogsForDate(date);
  }

  async getCallLogsForDateRange(startDate, endDate) {
    return this.callLogRepository.getCallLogsForDateRange(startDate, endDate);
  }

  async getRecentCallLogs(limit) {
    return this.callLogRepository.getRecentCallLogs(limit);
  }

  async getCallLogsByType(callType, limit) {
    return this.callLogRepository.getCallLogsByType(callType, limit);
  }

  async markCallLogAsAnalyzed(id) {
    return this.callLogRepository.markCallLogAsAnalyzed(id);
  }

  async getUnanalyzedCallLogs(limit) {
    return this.callLogRepository.getUnanalyzedCallLogs(limit);
  }

  // Additional repository access for advanced usage
  get repositories() {
    return {
      activity: this.activityRepository,
      location: this.locationRepository,
      appUsage: this.appUsageRepository,
      narrative: this.narrativeRepository,
      callLog: this.callLogRepository,
    };
  }
}

// Export singleton instance for backwards compatibility
const databaseService = new DatabaseService();

// Also export individual repositories for direct access
export {
  databaseService as default,
  activityRepository,
  locationRepository,
  appUsageRepository,
  narrativeRepository,
  callLogRepository,
  databaseConnection,
  databaseMigrations,
};

// Export the main instance as the default
export { databaseService as DatabaseService };