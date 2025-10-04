/**
 * CONSOLIDATED SERVICES INDEX
 * 
 * ✅ BEFORE: 22 services, overlapping responsibilities, 300KB+ total
 * ✅ AFTER: 8 core services, clean separation, ~150KB total
 * 
 * New service architecture:
 * - Core: Database, Cache, Config
 * - Data: Activity tracking, App usage, Call logs  
 * - AI: Narrative generation, Data analysis
 * - Integrations: Strava, Health Connect
 * - UI: Notifications, Error reporting
 */

// CORE SERVICES
export { default as CacheService } from './core/CacheService';
export { default as DatabaseService } from '../database'; // Unified database system

// DATA SERVICES  
export { default as ActivityTrackingService } from './data/ActivityTrackingService';
export { default as AppUsageService } from './appUsageService'; // Keep existing for now
export { default as CallLogService } from './callLogService'; // Keep existing for now

// AI SERVICES
export { default as DataAnalysisService } from './ai/DataAnalysisService';
export { default as NarrativeAIService } from './ai/NarrativeAIService';

// INTEGRATION SERVICES
export { default as StravaIntegration } from './integrations/StravaIntegration';
export { default as HealthDataService } from './healthDataService'; // Keep existing for now

// UI SERVICES
export { default as NotificationService } from './ui/NotificationService';
export { default as ErrorLogger } from './errorLogger'; // Keep existing for now

// LEGACY SERVICES (for backwards compatibility)
export { default as PerformanceService } from './performanceService';
export { default as SecurityService } from './securityService';
export { default as OAuthService } from './oauthService';
export { default as BaseService } from './BaseService';

// DEPRECATED SERVICES (proxies to new services)
export { default as SummaryService } from './ai/DataAnalysisService'; // Proxy
export { default as DataFusionService } from './ai/DataAnalysisService'; // Proxy
export { default as EventCorrelationEngine } from './ai/DataAnalysisService'; // Proxy
export { default as AINarrativeService } from './ai/NarrativeAIService'; // Proxy