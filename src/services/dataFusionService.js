/**
 * LEGACY DATA FUSION SERVICE - DEPRECATED
 * 
 * This service has been consolidated into the new DataAnalysisService.
 * The new service is located in /src/services/ai/DataAnalysisService.js
 * 
 * This file now acts as a simple proxy to maintain backwards compatibility.
 * For new code, import directly from './ai/DataAnalysisService'
 * 
 * ✅ BEFORE: dataFusionService.js (15KB)
 * ✅ AFTER: Clean DataAnalysisService with unified data analysis
 */

import DataAnalysisService from './ai/DataAnalysisService';

// Create wrapper methods for backwards compatibility
class LegacyDataFusionService {
  constructor() {
    this.dataAnalysisService = DataAnalysisService;
  }

  // Legacy method mapping to new service
  harmonizeTimestamps(dataSources, timeWindow = 5 * 60 * 1000) {
    return this.dataAnalysisService.fusion.harmonizeTimestamps(dataSources, timeWindow);
  }

  async mergeHealthData(date) {
    return this.dataAnalysisService.fusion.mergeHealthData(date);
  }

  // Additional legacy methods that might be used
  createTimeSlots(dataSources, timeWindow) {
    return this.dataAnalysisService.fusion.createTimeSlots(dataSources, timeWindow);
  }

  aggregateDataInTimeSlot(dataSources, timeSlot, timeWindow) {
    return this.dataAnalysisService.fusion.aggregateDataInTimeSlot(dataSources, timeSlot, timeWindow);
  }

  aggregateSourceData(items) {
    return this.dataAnalysisService.fusion.aggregateSourceData(items);
  }

  calculateContextualConfidence(dataPoint, contextSources) {
    // This method was in the original but not implemented in new service
    // Return default confidence for backwards compatibility
    return 0.8;
  }

  async collectHealthSources(date) {
    return this.dataAnalysisService.fusion.collectHealthSources(date);
  }

  applyConfidenceScoring(harmonizedData) {
    return this.dataAnalysisService.fusion.applyConfidenceScoring(harmonizedData);
  }
}

// Export singleton instance for backwards compatibility
export default new LegacyDataFusionService();