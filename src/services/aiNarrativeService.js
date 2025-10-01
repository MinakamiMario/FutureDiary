// aiNarrativeService.js - Service for generating stories with AI

import AsyncStorage from '@react-native-async-storage/async-storage';
import encryptionService from '../utils/encryptionService';
import oauthService from './oauthService';
import { getStyledAIPrompt, getStyleConfig, getNarrativeStyle } from '../utils/narrativeStyles';
import { getHealthContextForDate, createHealthAIContext } from '../utils/healthNarrativeIntegration';
import validationService from '../utils/validationService';
import securityService from './securityService';
import notificationService from './notificationService';
import notificationToastService from './notificationToastService';

// AI model types
export const AI_MODEL_TYPES = {
  TEMPLATE: 'template',     // Huidige sjabloon-gebaseerde methode
  CLAUDE: 'claude',       // Anthropic's Claude
  CHATGPT: 'chatgpt',     // OpenAI's ChatGPT (GPT-4o)
  GPT5_NANO: 'gpt5-nano', // OpenAI's GPT-5-nano (premium)
  WEBLLM: 'webllm',       // WebLLM by MLC AI (lokaal, gratis)
};

/**
 * Get user preference for AI model
 * @returns {Promise<string>} - AI model type
 */
export const getPreferredAIModel = async () => {
  try {
    const model = await AsyncStorage.getItem('preferredAIModel');
    return model || AI_MODEL_TYPES.TEMPLATE; // Default to template method
  } catch (error) {
    console.error('Error retrieving preferred AI model:', error);
    return AI_MODEL_TYPES.TEMPLATE;
  }
};

/**
 * Save user preference for AI model
 * @param {string} modelType - AI model type
 * @returns {Promise<void>}
 */
export const setPreferredAIModel = async (modelType) => {
  try {
    await AsyncStorage.setItem('preferredAIModel', modelType);
  } catch (error) {
    console.error('Error saving preferred AI model:', error);
  }
};

/**
 * Securely retrieve API key via encryptionService
 * @param {string} keyName - Name of the API key
 * @returns {Promise<string|null>} - API key or null
 */
const getSecureApiKey = async (keyName) => {
  try {
    // Only try encrypted storage in production
    const encryptedData = await AsyncStorage.getItem(`secure_${keyName}`);
    if (encryptedData) {
      try {
        await encryptionService.initialize();
        const decryptedKey = await encryptionService.decryptData(encryptedData);
        if (decryptedKey) {
          if (__DEV__) console.log(`✅ Successfully retrieved encrypted API key: ${keyName}`);
          return decryptedKey;
        }
      } catch (decryptError) {
        if (__DEV__) console.warn(`⚠️ Failed to decrypt API key: ${keyName}`, decryptError);
        // In production, don't fall back to plaintext storage
        if (!__DEV__) {
          console.error(`🔒 Security: Cannot retrieve encrypted key for ${keyName}`);
          return null;
        }
      }
    }

    // Development mode only: allow fallback for testing
    if (__DEV__) {
      const fallbackKey = await AsyncStorage.getItem(`fallback_${keyName}`);
      if (fallbackKey) {
        if (__DEV__) console.warn(`📋 DEV: Retrieved fallback API key: ${keyName}`);
        return fallbackKey;
      }
    }

    // Legacy migration: only in development
    if (__DEV__) {
      const legacyKey = await AsyncStorage.getItem(keyName);
      if (legacyKey) {
        if (__DEV__) console.log(`🔄 DEV: Migrating legacy API key to secure storage: ${keyName}`);
        const success = await setSecureApiKey(keyName, legacyKey);
        if (success) {
          await AsyncStorage.removeItem(keyName);
          return legacyKey;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Error retrieving secure API key ${keyName}:`, error);
    return null;
  }
};

/**
 * Securely store API key via encryptionService
 * @param {string} keyName - Name of the API key
 * @param {string} keyValue - Value of the API key
 * @returns {Promise<boolean>} - Success status
 */
const setSecureApiKey = async (keyName, keyValue) => {
  try {
    // Always attempt to initialize encryption service
    await encryptionService.initialize();
    
    // Use encrypted data storage with AsyncStorage as the actual storage mechanism
    const encryptedData = await encryptionService.encryptData(keyValue);
    if (encryptedData) {
      await AsyncStorage.setItem(`secure_${keyName}`, encryptedData);
      if (__DEV__) console.log(`✅ Successfully stored encrypted API key: ${keyName}`);
      
      // In development mode, also store fallback for testing
      if (__DEV__) {
        await AsyncStorage.setItem(`fallback_${keyName}`, keyValue);
        if (__DEV__) console.warn(`📋 DEV: Also stored fallback API key: ${keyName}`);
      }
      
      return true;
    } else {
      // In production, fail securely rather than use plaintext
      if (!__DEV__) {
        console.error(`🔒 Security: Cannot store API key without encryption for ${keyName}`);
        return false;
      }
      
      // Development mode only: allow fallback storage
      if (__DEV__) console.warn(`⚠️ DEV: Encryption failed, using plain storage for: ${keyName}`);
      await AsyncStorage.setItem(`fallback_${keyName}`, keyValue);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error storing secure API key ${keyName}:`, error);
    
    // In production, don't fall back to plaintext storage
    if (!__DEV__) {
      console.error(`🔒 Security: Failed to securely store API key ${keyName}`);
      return false;
    }
    
    // Development mode only: allow fallback storage
    if (__DEV__) console.warn(`⚠️ DEV: Attempting fallback storage for: ${keyName}`);
    try {
      await AsyncStorage.setItem(`fallback_${keyName}`, keyValue);
      return true;
    } catch (fallbackError) {
      console.error(`❌ DEV: Even fallback storage failed:`, fallbackError);
      return false;
    }
  }
};

/**
 * Check if authentication is available for the model (OAuth or API key)
 * @param {string} modelType - AI model type
 * @returns {boolean} - True if authentication is available
 */
export const isApiKeyAvailable = async (modelType) => {
  try {
    switch (modelType) {
      case AI_MODEL_TYPES.CLAUDE:
        const claudeKey = await getSecureApiKey('claude_api_key');
        return !!claudeKey;
      case AI_MODEL_TYPES.CHATGPT:
        // Check OAuth token eerst, dan API key
        const oauthAvailable = await oauthService.isLoggedIn('openai');
        if (oauthAvailable) {
          return true;
        }
        const openaiKey = await getSecureApiKey('openai_api_key');
        
        if (__DEV__) console.log('[isApiKeyAvailable] OpenAI key check:', openaiKey ? 'KEY FOUND' : 'NO KEY');
        
        // Demo mode: ChatGPT is always available (will use template mode internally)
        // This allows users to select ChatGPT during onboarding without requiring API key setup
        return true;
      case AI_MODEL_TYPES.GPT5_NANO:
        // GPT-5-nano gebruikt zelfde OpenAI API key maar met premium pricing
        const gpt5OauthAvailable = await oauthService.isLoggedIn('openai');
        if (gpt5OauthAvailable) {
          return true;
        }
        const gpt5Key = await getSecureApiKey('openai_api_key');
        
        if (__DEV__) console.log('[isApiKeyAvailable] GPT-5-nano key check:', gpt5Key ? 'KEY FOUND' : 'NO KEY');
        
        // Voor nu, return true als key bestaat
        // Model availability/quota check gebeurt tijdens daadwerkelijke generatie
        return !!gpt5Key;
      case AI_MODEL_TYPES.WEBLLM:
        // WebLLM is beschikbaar in browser context of React Native met WebView bridge
        const available = isWebLLMAvailable();
        if (!available) {
          if (__DEV__) console.info('[isApiKeyAvailable] WebLLM not available - no browser context or WebView bridge');
        }
        return available;
      case AI_MODEL_TYPES.TEMPLATE:
        return true; // Geen authenticatie nodig voor sjabloonmethode
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking authentication availability:', error);
    return false;
  }
};

/**
 * Securely store API key with validation
 * @param {string} keyType - Type of key ('claude_api_key' or 'openai_api_key')
 * @param {string} keyValue - API key value
 * @returns {Promise<boolean>} - Success status
 */
export const setApiKey = async (keyType, keyValue) => {
  // Validate API key format
  const validation = validationService.validateApiKey(keyValue);
  if (!validation.valid) {
    console.error('Invalid API key format:', validation.errors);
    return false;
  }

  // Store with rotation tracking
  const success = await setSecureApiKey(keyType, validation.value);
  if (success) {
    await securityService.rotateSecret(keyType, validation.value, { silent: true });
    
    // Send toast notification for successful key storage
    const serviceName = keyType.includes('claude') ? 'Claude AI' : 
                       keyType.includes('gpt5_nano') ? 'GPT-5-nano' : 'ChatGPT';
    notificationToastService.showAIConnected(serviceName);
    
    // Keep legacy notification for now
    await notificationService.showKeyStoredNotification(keyType);
    
    if (__DEV__) console.log(`✅ API key stored and rotation tracked: ${keyType}`);
  }
  return success;
};

/**
 * Remove API key with toast notification
 * @param {string} keyType - Type of key ('claude_api_key' or 'openai_api_key')
 * @returns {Promise<boolean>} - Success status
 */
export const removeApiKey = async (keyType) => {
  try {
    // Remove from encrypted storage
    await AsyncStorage.removeItem(`secure_${keyType}`);
    
    // Remove fallback in development
    if (__DEV__) {
      await AsyncStorage.removeItem(`fallback_${keyType}`);
    }
    
    // Clear security tracking
    await securityService.clearSecret(keyType);
    
    // Show disconnection toast
    const serviceName = keyType.includes('claude') ? 'Claude AI' : 
                       keyType.includes('gpt5_nano') ? 'GPT-5-nano' : 'ChatGPT';
    notificationToastService.showAIDisconnected(serviceName);
    
    if (__DEV__) console.log(`✅ API key removed: ${keyType}`);
    return true;
  } catch (error) {
    console.error(`❌ Error removing API key ${keyType}:`, error);
    return false;
  }
};

/**
 * Securely retrieve API key
 * @param {string} keyType - Type of key ('claude_api_key' or 'openai_api_key')
 * @returns {Promise<string|null>} - API key or null
 */
export const getApiKey = async (keyType) => {
  // Check rotation status
  const rotationStatus = await securityService.checkRotationStatus(keyType);
  if (rotationStatus.warning) {
    if (__DEV__) console.warn(`Security: ${keyType} should be rotated soon (${rotationStatus.daysUntilRotation} days remaining)`);
    
    // Send notification for rotation warning if close to deadline
    if (rotationStatus.daysUntilRotation <= 3) {
      await notificationService.showRotationWarning(keyType, rotationStatus.daysUntilRotation);
    }
  }

  return await getSecureApiKey(keyType);
};

/**
 * Check security status of API keys
 * @returns {Promise<Object>} - Security status report
 */
export const getSecurityStatus = async () => {
  return await securityService.getSecurityAudit();
};

/**
 * Get user's preferred story style with fallback to stored preference
 * @returns {Promise<string>} - User's preferred narrative style
 */
export const getUserStoryStyle = async () => {
  try {
    const style = await getNarrativeStyle();
    if (__DEV__) console.log(`[getUserStoryStyle] Retrieved style: ${style}`);
    return style;
  } catch (error) {
    console.error('Error getting user story style:', error);
    return 'standaard'; // Fallback to default
  }
};

/**
 * Generate narrative using user's preferred style
 * Convenience function that automatically uses user's stored style preference
 * @param {Array} activities - Activity data
 * @param {Array} locations - Location data
 * @param {Array} calls - Call data
 * @param {Array} appUsage - App usage data
 * @param {string|Date} date - The date
 * @param {string} [preferredModel] - Optional: force specific AI model
 * @returns {Promise<string>} - Generated story with user's preferred style
 */
export const generatePersonalizedNarrative = async (activities, locations, calls, appUsage, date, preferredModel = null) => {
  try {
    // Get user's preferred story style
    const userStyle = await getUserStoryStyle();
    
    if (__DEV__) console.log(`[generatePersonalizedNarrative] Using user's preferred style: ${userStyle}`);
    
    // Generate narrative with user's style
    return await generateNarrativeWithAI(
      activities, 
      locations, 
      calls, 
      appUsage, 
      date, 
      preferredModel, 
      userStyle
    );
  } catch (error) {
    console.error('Error generating personalized narrative:', error);
    // Fallback to default style
    return await generateNarrativeWithAI(
      activities, 
      locations, 
      calls, 
      appUsage, 
      date, 
      preferredModel, 
      'standaard'
    );
  }
};

/**
 * Generate prompt for AI model based on collected data
 * @param {Array} activities - Activity data
 * @param {Array} locations - Location data
 * @param {Array} calls - Call data
 * @param {Array} appUsage - App usage data
 * @param {string|Date} date - The date
 * @param {string} narrativeStyle - Desired narrative style
 * @param {Array} userNotes - User's personal notes
 * @returns {Promise<string>} - Generated prompt with health context
 */
export const generateAIPrompt = async (activities, locations, calls, appUsage, date, narrativeStyle = 'standard', userNotes = []) => {
  const formattedDate = new Date(date).toLocaleDateString('nl-NL', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Prepare activity data
  const totalSteps = activities.reduce((total, act) => total + (act.steps || 0), 0);
  const activityTypes = {};
  const sportsActivities = activities.filter(act => 
    act.type === 'workout' || 
    act.type === 'strava_workout' || 
    act.sport_type ||
    ['running', 'cycling', 'swimming', 'gym', 'yoga', 'tennis', 'football', 'basketball'].includes(act.type)
  );
  
  activities.forEach(act => {
    if (act.type) {
      activityTypes[act.type] = (activityTypes[act.type] || 0) + 1;
    }
  });
  
  // Sports-specific data
  const totalSportsDuration = sportsActivities.reduce((total, act) => total + (act.duration || 0), 0);
  const totalSportsCalories = sportsActivities.reduce((total, act) => total + (act.calories || 0), 0);
  const totalSportsDistance = sportsActivities.reduce((total, act) => total + (act.distance || 0), 0);
  const sportTypes = [...new Set(sportsActivities.map(act => act.sport_type || act.type).filter(Boolean))];
  
  // Prepare location data
  const locationNames = locations.map(loc => loc.name || loc.label || `${loc.latitude}, ${loc.longitude}`);
  
  // Prepare call data
  const incomingCalls = calls.filter(call => call.type === 'incoming').length;
  const outgoingCalls = calls.filter(call => call.type === 'outgoing').length;
  const missedCalls = calls.filter(call => call.type === 'missed').length;
  
  // Prepare app usage data
  let appUsageText = '';
  if (appUsage && appUsage.totalScreenTime > 0) {
    const totalMinutes = Math.floor(appUsage.totalScreenTime / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    let screenTimeText = hours > 0 ? `${hours} hours and ${minutes} minutes` : `${minutes} minutes`;
    appUsageText = `\nApp Usage:
- Total screen time: ${screenTimeText}
- Number of apps used: ${appUsage.appCount || 0}`;
    
    if (appUsage.topApps && appUsage.topApps.length > 0) {
      const topAppsText = appUsage.topApps.slice(0, 3).map(app => {
        const appTime = Math.floor((app.totalTime || app.duration || 0) / (1000 * 60));
        return `${app.appName || app.app_name} (${appTime} min)`;
      }).join(', ');
      appUsageText += `\n- Most used apps: ${topAppsText}`;
    }
    
    if (appUsage.categories && Object.keys(appUsage.categories).length > 0) {
      const topCategory = Object.entries(appUsage.categories)
        .sort(([,a], [,b]) => b.totalTime - a.totalTime)[0];
      if (topCategory) {
        const categoryTime = Math.floor(topCategory[1].totalTime / (1000 * 60));
        appUsageText += `\n- Top category: ${topCategory[0]} (${categoryTime} min)`;
      }
    }
  }
  
  // Build user notes section
  let userNotesSection = '';
  if (userNotes.length > 0) {
    const sortedNotes = userNotes.sort((a, b) => a.timestamp - b.timestamp);
    userNotesSection = `

User Personal Notes (MOST IMPORTANT - Focus the story on these):
${sortedNotes.map((note, index) => `${index + 1}. "${note.text}" (${new Date(note.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })})`).join('\n')}`;
  }

  // Get health context for this date
  const healthContext = await getHealthContextForDate(date);
  const healthAIContext = await createHealthAIContext(healthContext);

  // Build base prompt
  const basePrompt = `
Write a personal daily story in Dutch for a user based on their tracking data and personal notes.
The story should sound natural, personal, and focus on meaningful moments.

Date: ${formattedDate}${userNotesSection}

Tracking Data:
- Total steps: ${totalSteps}
- Activity types: ${Object.keys(activityTypes).map(type => `${type} (${activityTypes[type]}x)`).join(', ')}
- Locations visited (${locations.length}): ${locationNames.join(', ')}
- Phone calls: ${incomingCalls} incoming, ${outgoingCalls} outgoing, ${missedCalls} missed${appUsageText}${healthAIContext}

Instructions:
${userNotes.length > 0 ? `
- FOCUS PRIMARILY on the user's personal notes - these are the most important parts of their day
- Use tracking data as supporting context around the user's notes  
- Weave the personal notes naturally into a coherent story
- Make the user's own words and experiences the central focus
` : `
- Focus on interesting patterns and insights from the tracking data
- Create a meaningful narrative from the user's activities and movements
`}
- Write in Dutch, second person ("je"), warm and personal tone
- Keep it concise but meaningful (2-3 paragraphs maximum)
- No GPS coordinates or technical details
- CRITICAL: Do NOT invent, assume, or speculate about ANY details not explicitly provided
- ONLY use facts directly stated in the data above
- Do NOT add emotions, motivations, or explanations unless mentioned in user notes
- Make it feel like a personal diary entry, not a data report
- If information is missing, simply don't mention it rather than guessing`;

  // Apply style to prompt
  return getStyledAIPrompt(basePrompt, narrativeStyle);
};

/**
 * Generate story using Claude (Anthropic) with style configuration
 * @param {string} prompt - Prompt for Claude
 * @param {Object} styleConfig - Style configuration object
 * @returns {Promise<string>} - Generated story
 */
export const generateWithClaude = async (prompt, styleConfig = null) => {
  try {
    const claudeApiKey = await getSecureApiKey('claude_api_key');
    
    if (!claudeApiKey) {
      notificationToastService.showAIConfigRequired('Claude AI', () => {
        // This will be handled by UI components
        console.log('User requested Claude AI configuration');
      });
      throw new Error('Claude API key not found');
    }
    
    // Use style config or defaults
    const maxTokens = styleConfig?.maxTokens || 1000;
    const temperature = styleConfig?.temperature || 0.2;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Claude API error:', data.error);
      
      // Handle specific error types
      if (data.error.type === 'authentication_error') {
        notificationToastService.showAITokenExpired('Claude AI', () => {
          console.log('User requested Claude AI reconnection');
        });
      } else if (data.error.type === 'rate_limit_error') {
        notificationToastService.showAIRateLimited('Claude AI', 60);
      } else {
        notificationToastService.showAIDiaryError('Claude AI', data.error.message);
      }
      
      throw new Error(data.error.message || 'Error generating narrative with Claude');
    }
    
    return data.content[0].text;
  } catch (error) {
    console.error('Error using Claude API:', error);
    throw error;
  }
};

/**
 * Check if we're running in a browser context (not React Native)
 * @returns {boolean} - True if browser context
 */
export const isBrowserContext = () => {
  // Check for React Native specific globals
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return false;
  }
  
  // Check for Expo Go or React Native environment
  if (typeof global !== 'undefined' && global.__DEV__ !== undefined) {
    return false;
  }
  
  // Check for browser-specific features
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' && 
         typeof WebAssembly !== 'undefined';
};

// Global WebLLM bridge reference for React Native
let webLLMBridge = null;

/**
 * Set the WebLLM bridge instance (called from App component)
 * @param {Object} bridge - WebLLMBridge component reference
 */
export const setWebLLMBridge = (bridge) => {
  webLLMBridge = bridge;
  if (__DEV__) console.log('[aiNarrativeService] WebLLM bridge set:', !!bridge);
};

/**
 * Check if WebLLM is available (browser context or React Native with WebView bridge)
 * @returns {boolean} - True if WebLLM can be used
 */
export const isWebLLMAvailable = () => {
  // In browser context, check for WebLLM library
  if (isBrowserContext()) {
    return typeof window !== 'undefined' && window.webllm;
  }
  
  // In React Native, check for Expo Go / development mode
  if (__DEV__) {
    // Expo Go / development mode - WebLLM niet beschikbaar
    if (__DEV__) console.info('[isWebLLMAvailable] WebLLM disabled in Expo Go/Development mode');
    return false;
  }
  
  // In React Native production builds, check if WebView bridge is available
  if (!webLLMBridge) {
    if (__DEV__) console.info('[isWebLLMAvailable] WebLLM bridge not available');
    return false;
  }
  
  return true;
};

/**
 * Generate story using WebLLM (by MLC AI)
 * Works in both browser and React Native (via WebView bridge)
 * @param {string} prompt - Prompt for WebLLM model
 * @returns {Promise<string>} - Generated story
 */
export const generateWithWebLLM = async (prompt) => {
  try {
    // React Native with WebView bridge
    if (!isBrowserContext()) {
      if (!webLLMBridge) {
        throw new Error('WebLLM bridge not available - WebView may not be initialized');
      }
      
      if (__DEV__) console.log('[generateWithWebLLM] Using React Native WebView bridge');
      const result = await webLLMBridge.generateText(prompt);
      
      if (!result || typeof result !== 'string') {
        throw new Error('Invalid response from WebLLM bridge');
      }
      
      return result;
    }
    
    // Browser context (original implementation)
    if (__DEV__) console.log('[generateWithWebLLM] Using browser WebLLM');
    
    // Check if WebLLM is available in the browser
    if (typeof window === 'undefined' || !window.webllm) {
      throw new Error('WebLLM library not loaded in browser context');
    }
    
    const { CreateWebWorkerMLCEngine } = window.webllm;
    
    // Initialize WebLLM engine with a lightweight model
    const engine = await CreateWebWorkerMLCEngine(
      new Worker('/webllm-worker.js'),  // WebWorker for better performance
      'Llama-2-7b-chat-hf-q4f16_1-MLC', // Lightweight quantized model
      {
        initProgressCallback: (progress) => {
          if (__DEV__) console.log('WebLLM loading progress:', progress);
        }
      }
    );
    
    // Generate response
    const response = await engine.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates personal daily narratives in Dutch.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 800,
      stream: false
    });
    
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content;
    } else {
      throw new Error('No response generated by WebLLM');
    }
  } catch (error) {
    console.error('Error using WebLLM:', error);
    throw error;
  }
};

/**
 * Generate story using GPT-5-nano (OpenAI Premium)
 * Premium pricing: $0.05 per 1M input tokens, $0.40 per 1M output tokens
 * @param {string} prompt - Prompt for GPT-5-nano
 * @returns {Promise<string>} - Generated story
 */
export const generateWithGPT5Nano = async (prompt, styleConfig = null) => {
  try {
    // Try OAuth token first
    const oauthToken = await oauthService.getAccessToken('openai');
    let authHeader;
    
    if (oauthToken) {
      if (__DEV__) console.info('[GPT-5-nano] OAuth token gebruikt voor authenticatie');
      authHeader = `${oauthToken.tokenType} ${oauthToken.accessToken}`;
    } else {
      // Fallback naar API key
      if (__DEV__) console.info('[GPT-5-nano] OAuth token niet beschikbaar, probeer API key');
      const openaiApiKey = await getSecureApiKey('openai_api_key');
      
      if (!openaiApiKey) {
        notificationToastService.showAIConfigRequired('GPT-5-nano', () => {
          console.log('User requested GPT-5-nano configuration');
        });
        throw new Error('Geen OpenAI authenticatie beschikbaar. Log in of voeg API key toe.');
      }
      
      authHeader = `Bearer ${openaiApiKey}`;
    }
    
    // Use style config or defaults
    const maxTokens = styleConfig?.maxTokens || 1000;
    const temperature = styleConfig?.temperature || 0.2;
    const systemPrompt = styleConfig?.systemPrompt || 'Je bent een getalenteerde verhaalschrijver die persoonlijke dagboeken creëert in de tweede persoon ("jij"). Schrijf een natuurlijk, positief verhaal gebaseerd op de gegeven data.';
    
    // Premium model request met cost tracking
    const startTime = Date.now();
    const inputTokens = Math.ceil(prompt.length / 4); // Rough estimate: 1 token ≈ 4 characters
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        model: 'gpt-5-nano', // Future model name - will fallback to available model
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: 0.9
      })
    });
    
    const data = await response.json();
    const endTime = Date.now();
    
    if (data.error) {
      console.error('GPT-5-nano API error:', data.error);
      
      // Handle specific error types
      if (data.error.code === 'model_not_found') {
        // Model niet beschikbaar - fallback naar GPT-4o
        if (__DEV__) console.warn('[GPT-5-nano] Model niet beschikbaar, fallback naar ChatGPT');
        notificationToastService.showAIDiaryError('GPT-5-nano', 'Model niet beschikbaar, gebruikt ChatGPT fallback');
        return await generateWithChatGPT(prompt);
      } else if (data.error.code === 'invalid_api_key') {
        if (oauthToken) {
          // OAuth token expired, retry zonder token
          if (__DEV__) console.info('[GPT-5-nano] OAuth token lijkt ongeldig, herprobeert met API key');
          await oauthService.clearAccessToken('openai');
          return await generateWithGPT5Nano(prompt); // Retry met API key
        } else {
          notificationToastService.showAITokenExpired('GPT-5-nano', () => {
            console.log('User requested GPT-5-nano reconnection');
          });
        }
      } else if (data.error.code === 'rate_limit_exceeded') {
        notificationToastService.showAIRateLimited('GPT-5-nano', 60);
      } else if (data.error.code === 'insufficient_quota') {
        notificationToastService.showAIQuotaExceeded('GPT-5-nano', () => {
          console.log('User requested GPT-5-nano quota upgrade');
        });
      } else {
        notificationToastService.showAIDiaryError('GPT-5-nano', data.error.message);
      }
      
      throw new Error(data.error.message || 'Fout bij genereren verhaal met GPT-5-nano');
    }
    
    const generatedText = data.choices[0].message.content;
    const outputTokens = data.usage?.completion_tokens || Math.ceil(generatedText.length / 4);
    
    // Cost tracking voor premium model
    const inputCost = (inputTokens / 1000000) * 0.05;  // $0.05 per 1M input tokens
    const outputCost = (outputTokens / 1000000) * 0.40; // $0.40 per 1M output tokens
    const totalCost = inputCost + outputCost;
    const responseTime = endTime - startTime;
    
    // Log premium usage in development
    if (__DEV__) {
      console.log(`[GPT-5-nano] Premium usage:`, {
        inputTokens,
        outputTokens,
        inputCost: `$${inputCost.toFixed(6)}`,
        outputCost: `$${outputCost.toFixed(6)}`,
        totalCost: `$${totalCost.toFixed(6)}`,
        responseTime: `${responseTime}ms`
      });
    }
    
    // Store usage voor cost tracking (optional - implement if needed)
    try {
      await AsyncStorage.setItem('gpt5_nano_last_usage', JSON.stringify({
        timestamp: Date.now(),
        inputTokens,
        outputTokens,
        cost: totalCost,
        responseTime
      }));
    } catch (storageError) {
      if (__DEV__) console.warn('[GPT-5-nano] Could not store usage data:', storageError);
    }
    
    return generatedText;
  } catch (error) {
    console.error('Error using GPT-5-nano API:', error);
    throw error;
  }
};

/**
 * Generate story using ChatGPT (OpenAI)
 * @param {string} prompt - Prompt for ChatGPT
 * @returns {Promise<string>} - Generated story
 */
export const generateWithChatGPT = async (prompt, styleConfig = null) => {
  try {
    // Try OAuth token first
    const oauthToken = await oauthService.getAccessToken('openai');
    let authHeader;
    
    if (oauthToken) {
      if (__DEV__) console.info('[ChatGPT] Using OAuth token for authentication');
      authHeader = `${oauthToken.tokenType} ${oauthToken.accessToken}`;
    } else {
      // Fallback to API key
      if (__DEV__) console.info('[ChatGPT] OAuth token not available, trying API key');
      const openaiApiKey = await getSecureApiKey('openai_api_key');
      
      if (!openaiApiKey) {
        if (__DEV__) console.info('[ChatGPT] No API key available, using demo mode with template method');
        // Instead of throwing error, return null to indicate template method should be used
        // This allows ChatGPT to be selected during onboarding without requiring API key setup
        return null;
      }
      
      authHeader = `Bearer ${openaiApiKey}`;
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: styleConfig?.systemPrompt || 'Je bent een getalenteerde verhaalschrijver die persoonlijke dagboeken creëert in de tweede persoon ("jij"). Schrijf een natuurlijk, positief verhaal gebaseerd op de gegeven data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: styleConfig?.maxTokens || 1000,
        temperature: styleConfig?.temperature || 0.2
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API error:', data.error);
      
      // Handle specific error types
      if (data.error.code === 'invalid_api_key') {
        if (oauthToken) {
          // OAuth token expired, retry without token
          if (__DEV__) console.info('[ChatGPT] OAuth token seems invalid, clearing and retrying with API key');
          await oauthService.clearAccessToken('openai');
          return await generateWithChatGPT(prompt); // Retry with API key
        } else {
          notificationToastService.showAITokenExpired('ChatGPT', () => {
            console.log('User requested ChatGPT reconnection');
          });
        }
      } else if (data.error.code === 'rate_limit_exceeded') {
        notificationToastService.showAIRateLimited('ChatGPT', 60);
      } else if (data.error.code === 'insufficient_quota') {
        notificationToastService.showAIQuotaExceeded('ChatGPT', () => {
          console.log('User requested ChatGPT quota upgrade');
        });
      } else {
        notificationToastService.showAIDiaryError('ChatGPT', data.error.message);
      }
      
      throw new Error(data.error.message || 'Error generating narrative with ChatGPT');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error using OpenAI API:', error);
    throw error;
  }
};

/**
 * Generate story with chosen AI model
 * @param {Array} activities - Activity data
 * @param {Array} locations - Location data
 * @param {Array} calls - Call data
 * @param {Array} appUsage - App usage data
 * @param {string|Date} date - The date
 * @param {string} [preferredModel] - Optional: force specific model
 * @param {string} [narrativeStyle] - Optional: desired narrative style
 * @returns {Promise<string>} - Generated story
 */
export const generateNarrativeWithAI = async (activities, locations, calls, appUsage, date, preferredModel = null, narrativeStyle = 'standaard', userNotes = []) => {
  try {
    // Use specified model or get user preference
    const modelType = preferredModel || await getPreferredAIModel();
    
    // Get style configuration
    const styleConfig = getStyleConfig(narrativeStyle);
    
    if (__DEV__) {
      console.log(`[AI Narrative] Using style: ${narrativeStyle}`, {
        maxTokens: styleConfig.maxTokens,
        temperature: styleConfig.temperature,
        tone: styleConfig.tone,
        length: styleConfig.length
      });
    }
    
    // Special handling for WebLLM availability
    if (modelType === AI_MODEL_TYPES.WEBLLM && !isWebLLMAvailable()) {
      if (__DEV__) console.info('WebLLM selected but not available (no browser context or WebView bridge), falling back to template method');
      return null; // Return null to indicate template method should be used
    }
    
    // Check if API key is available
    const isKeyAvailable = await isApiKeyAvailable(modelType);
    if (!isKeyAvailable) {
      if (__DEV__) console.warn(`API key not available for ${modelType}, falling back to template method`);
      return null; // Return null to indicate template method should be used
    }
    
    // Generate prompt with enhanced Dutch narrative style and health context
    const prompt = await generateAIPrompt(activities, locations, calls, appUsage, date, narrativeStyle, userNotes);
    
    // Use appropriate model with style configuration
    let result;
    const serviceName = modelType === AI_MODEL_TYPES.CLAUDE ? 'Claude AI' : 
                       modelType === AI_MODEL_TYPES.CHATGPT ? 'ChatGPT' : 
                       modelType === AI_MODEL_TYPES.GPT5_NANO ? 'GPT-5-nano' :
                       modelType === AI_MODEL_TYPES.WEBLLM ? 'WebLLM' : null;
    
    switch (modelType) {
      case AI_MODEL_TYPES.CLAUDE:
        result = await generateWithClaude(prompt, styleConfig);
        break;
      case AI_MODEL_TYPES.CHATGPT:
        result = await generateWithChatGPT(prompt, styleConfig);
        break;
      case AI_MODEL_TYPES.GPT5_NANO:
        result = await generateWithGPT5Nano(prompt, styleConfig);
        break;
      case AI_MODEL_TYPES.WEBLLM:
        result = await generateWithWebLLM(prompt); // WebLLM doesn't use style config yet
        break;
      case AI_MODEL_TYPES.TEMPLATE:
      default:
        return null; // Return null to indicate template method should be used
    }
    
    // Show success toast if result was generated
    if (result && serviceName) {
      const wordCount = result.split(' ').length;
      notificationToastService.showAIDiaryGenerated(serviceName, wordCount);
    }
    
    return result;
  } catch (error) {
    console.error('Error generating narrative with AI:', error);
    return null; // Fall back to template method on errors
  }
};

export default {
  AI_MODEL_TYPES,
  getPreferredAIModel,
  setPreferredAIModel,
  isApiKeyAvailable,
  generateNarrativeWithAI,
  generatePersonalizedNarrative,
  getUserStoryStyle,
  generateWithClaude,
  generateWithChatGPT,
  generateWithGPT5Nano,
  generateWithWebLLM,
  setApiKey,
  getApiKey,
  removeApiKey
};