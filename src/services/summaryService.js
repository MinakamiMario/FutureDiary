/**
 * LEGACY SUMMARY SERVICE - DEPRECATED
 * 
 * This service has been refactored into the new DataAnalysisService.
 * The new service is located in /src/services/ai/DataAnalysisService.js
 * 
 * This file now acts as a simple proxy to maintain backwards compatibility.
 * For new code, import directly from './ai/DataAnalysisService'
 * 
 * ✅ BEFORE: summaryService.js (60KB monolith)
 * ✅ AFTER: Clean DataAnalysisService with unified data analysis
 */

import dataAnalysisService from './ai/DataAnalysisService';

// Create wrapper methods for backwards compatibility
class LegacySummaryService {
  constructor() {
    this.dataAnalysisService = dataAnalysisService;
  }

  // Legacy method mapping to new service
  async generateDailySummary(date, options = {}) {
    return this.dataAnalysisService.generateDailySummary(date, options);
  }

  async getNarrativeSummary(date) {
    const summary = await this.dataAnalysisService.generateDailySummary(date, { includeNarrative: true });
    return summary?.narrative?.content || null;
  }

  async regenerateNarrativeSummary(date) {
    const summary = await this.dataAnalysisService.generateDailySummary(date, { 
      includeNarrative: true,
      forceRefresh: true 
    });
    return summary?.narrative?.content || null;
  }

  async getNarrativeSummaries(startDate, endDate) {
    // Get multiple daily summaries
    const summaries = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const narrative = await this.getNarrativeSummary(new Date(d));
      if (narrative) {
        summaries.push({
          date: d.toISOString().split('T')[0],
          narrative
        });
      }
    }
    
    return summaries;
  }

  async generateWeeklySummary(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const dailyData = await this.dataAnalysisService.getDailyData(startDate);
    const weeklyStats = await this.dataAnalysisService.generateDailyStats(dailyData);
    
    return {
      period: 'week',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      stats: weeklyStats,
      summary: `Weekly summary from ${startDate.toDateString()} to ${endDate.toDateString()}`
    };
  }

  async generateMonthlySummary(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const dailyData = await this.dataAnalysisService.getDailyData(startDate);
    const monthlyStats = await this.dataAnalysisService.generateDailyStats(dailyData);
    
    return {
      period: 'month',
      year,
      month,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      stats: monthlyStats,
      summary: `Monthly summary for ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    };
  }
}

// Create singleton instance for backwards compatibility
const legacySummaryService = new LegacySummaryService();

// Export the legacy service as default
export default legacySummaryService;

// Export the methods for named imports
export const generateDailySummary = (date, options) => legacySummaryService.generateDailySummary(date, options);
export const getNarrativeSummary = (date) => legacySummaryService.getNarrativeSummary(date);
export const regenerateNarrativeSummary = (date) => legacySummaryService.regenerateNarrativeSummary(date);
export const getNarrativeSummaries = (startDate, endDate) => legacySummaryService.getNarrativeSummaries(startDate, endDate);
export const generateWeeklySummary = (startDate) => legacySummaryService.generateWeeklySummary(startDate);
export const generateMonthlySummary = (year, month) => legacySummaryService.generateMonthlySummary(year, month);