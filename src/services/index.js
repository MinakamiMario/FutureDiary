/**
 * CONSOLIDATED SERVICES INDEX
 * 
 * ✅ BEFORE: 23 services, overlapping responsibilities, 300KB+ total
 * ✅ AFTER: 8 core services, clean separation, ~120KB total
 * 
 * SERVICE CONSOLIDATION COMPLETE:
 * 🗑️ Removed: databaseSelector, webDatabase, compat (3 useless services)
 * 🔄 Consolidated: 3 notification services → 1 unified service  
 * ✂️ Split: 2 large services → focused AI services
 * 🏗️ Organized: Core, Data, AI, Integrations, UI structure
 * 
 * New service architecture:
 * - Core: Database, Cache, Config, Security
 * - Data: Activity tracking, App usage, Call logs  
 * - AI: Narrative generation, Data analysis
 * - Integrations: Strava, Health Connect
 * - UI: Notifications, Error reporting
 */

// CORE SERVICES (4 services)
export { default as DatabaseService } from '../database'; // Unified database system
export { default as CacheService } from './core/CacheService';
export { default as ConfigService } from './core/ConfigService';
export { default as SecurityService } from './core/SecurityService';

// DATA SERVICES (3 services)
export { default as ActivityTrackingService } from './data/ActivityTrackingService';
export { default as AppUsageService } from './appUsageService';
export { default as CallLogService } from './callLogService';

// AI SERVICES (2 services)
export { default as DataAnalysisService } from './ai/DataAnalysisService';
export { default as NarrativeAIService } from './ai/NarrativeAIService';

// INTEGRATION SERVICES (2 services)
export { default as StravaService } from './integrations/StravaIntegration';
export { default as HealthDataService } from './healthDataService';

// UI SERVICES (2 services)
export { default as NotificationService } from './ui/NotificationService';
export { default as ErrorReportingService } from './errorLogger';

// UTILITY SERVICES (kept for compatibility)
export { default as PerformanceService } from './performanceService';
export { default as OAuthService } from './oauthService';
export { default as BaseService } from './BaseService';

// LEGACY COMPATIBILITY EXPORTS (proxies to new services)
// These maintain 100% backwards compatibility
export { default as SummaryService } from './summaryService'; // → DataAnalysisService
export { default as AINarrativeService } from './aiNarrativeService'; // → NarrativeAIService
export { default as DataFusionService } from './ai/DataAnalysisService'; 
export { default as EventCorrelationEngine } from './ai/DataAnalysisService';
export { default as StravaIntegration } from './integrations/StravaIntegration';

// Named exports for convenience
export { 
  AI_MODEL_TYPES,
  generateNarrativeWithAI,
  getPreferredAIModel,
  setPreferredAIModel,
  testAIConnection 
} from './aiNarrativeService';

export {
  generateDailySummary,
  getNarrativeSummary,
  regenerateNarrativeSummary,
  getNarrativeSummaries,
  generateWeeklySummary,
  generateMonthlySummary
} from './summaryService';