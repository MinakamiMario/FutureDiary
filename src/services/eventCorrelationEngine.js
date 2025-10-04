/**
 * LEGACY EVENT CORRELATION ENGINE - DEPRECATED
 * 
 * This service has been consolidated into the new DataAnalysisService.
 * The new service is located in /src/services/ai/DataAnalysisService.js
 * 
 * This file now acts as a simple proxy to maintain backwards compatibility.
 * For new code, import directly from './ai/DataAnalysisService'
 * 
 * ✅ BEFORE: eventCorrelationEngine.js (20KB)
 * ✅ AFTER: Clean DataAnalysisService with unified data analysis
 */

import DataAnalysisService from './ai/DataAnalysisService';

// Create wrapper methods for backwards compatibility
class LegacyEventCorrelationEngine {
  constructor() {
    this.dataAnalysisService = DataAnalysisService;
  }

  // Legacy method mapping to new service
  async detectPatterns(activities, timeWindow) {
    return this.dataAnalysisService.correlation.detectPatterns(activities, timeWindow);
  }

  async findEventChains(date) {
    return this.dataAnalysisService.correlation.findEventChains(date);
  }

  // Additional legacy methods that might be used
  initializeCorrelationRules() {
    // This is handled internally in the new service
    return this.dataAnalysisService.correlation.correlationRules;
  }

  initializeNarrativeTemplates() {
    // This is handled internally in the new service
    return this.dataAnalysisService.correlation.narrativeTemplates;
  }

  get correlationRules() {
    return this.dataAnalysisService.correlation.correlationRules;
  }

  get timeWindows() {
    return this.dataAnalysisService.correlation.timeWindows;
  }

  get narrativeTemplates() {
    return this.dataAnalysisService.correlation.narrativeTemplates;
  }

  // Method that was in original but not needed in new service
  calculateContextualConfidence(dataPoint, contextSources) {
    return 0.8; // Default confidence for backwards compatibility
  }

  // Additional utility methods
  extractEventsFromActivities(activities) {
    return this.dataAnalysisService.correlation.extractEventsFromActivities(activities);
  }

  findEventSequence(events, startIndex, requiredEvents, timeWindow) {
    return this.dataAnalysisService.correlation.findEventSequence(events, startIndex, requiredEvents, timeWindow);
  }

  eventMatchesType(event, requiredType) {
    return this.dataAnalysisService.correlation.eventMatchesType(event, requiredType);
  }

  generatePatternInsight(pattern, data) {
    return this.dataAnalysisService.correlation.generatePatternInsight(pattern, data);
  }

  generateDataQualityInsights(data) {
    return this.dataAnalysisService.correlation.generateDataQualityInsights(data);
  }

  assessDataCompleteness(data) {
    return this.dataAnalysisService.correlation.assessDataCompleteness(data);
  }
}

// Export singleton instance for backwards compatibility
export default new LegacyEventCorrelationEngine();