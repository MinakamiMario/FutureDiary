/**
 * LEGACY AI NARRATIVE SERVICE - DEPRECATED
 * 
 * This service has been refactored into the new NarrativeAIService.
 * The new service is located in /src/services/ai/NarrativeAIService.js
 * 
 * This file now acts as a simple proxy to maintain backwards compatibility.
 * For new code, import directly from './ai/NarrativeAIService'
 * 
 * ✅ BEFORE: aiNarrativeService.js (37KB monolith)
 * ✅ AFTER: Clean NarrativeAIService with focused responsibility
 */

import narrativeAIService, {
  AI_MODEL_TYPES,
  generateNarrativeWithAI,
  getPreferredAIModel,
  setPreferredAIModel,
  testAIConnection
} from './ai/NarrativeAIService';

// Export the new service as default
export default narrativeAIService;

// Export all the named exports for backwards compatibility
export {
  AI_MODEL_TYPES,
  generateNarrativeWithAI,
  getPreferredAIModel,
  setPreferredAIModel,
  testAIConnection
};