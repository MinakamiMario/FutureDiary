/**
 * NARRATIVE AI SERVICE
 * 
 * Handles AI-powered narrative generation
 * Extracted from aiNarrativeService.js for cleaner separation
 */

import errorHandler from '../errorLogger';
import performanceService from '../performanceService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AI Model Types
export const AI_MODEL_TYPES = {
  CHATGPT: 'chatgpt',
  CLAUDE: 'claude',
  GEMINI: 'gemini',
  LOCAL: 'local'
};

class NarrativeAIService {
  constructor() {
    this.apiKeys = {};
    this.preferredModel = AI_MODEL_TYPES.CHATGPT;
    this.maxRetries = 3;
    this.timeout = 30000; // 30 seconds
  }

  async initialize() {
    try {
      // Load saved API keys and preferences
      const savedKeys = await AsyncStorage.getItem('ai_api_keys');
      const savedModel = await AsyncStorage.getItem('preferred_ai_model');
      
      if (savedKeys) {
        this.apiKeys = JSON.parse(savedKeys);
      }
      
      if (savedModel) {
        this.preferredModel = savedModel;
      }
    } catch (error) {
      errorHandler.error('Failed to initialize AI service', error);
    }
  }

  async setApiKey(model, apiKey) {
    try {
      this.apiKeys[model] = apiKey;
      await AsyncStorage.setItem('ai_api_keys', JSON.stringify(this.apiKeys));
    } catch (error) {
      errorHandler.error('Failed to save API key', error);
      throw error;
    }
  }

  async setPreferredModel(model) {
    try {
      this.preferredModel = model;
      await AsyncStorage.setItem('preferred_ai_model', model);
    } catch (error) {
      errorHandler.error('Failed to save preferred model', error);
      throw error;
    }
  }

  getApiKey(model) {
    return this.apiKeys[model];
  }

  getPreferredModel() {
    return this.preferredModel;
  }

  async generateNarrative(prompt, model = null, options = {}) {
    const start = performanceService?.startTracking?.('ai.generateNarrative');
    
    try {
      const targetModel = model || this.preferredModel;
      const apiKey = this.getApiKey(targetModel);
      
      if (!apiKey) {
        throw new Error(`No API key configured for ${targetModel}`);
      }

      let narrative;
      switch (targetModel) {
        case AI_MODEL_TYPES.CHATGPT:
          narrative = await this.generateWithChatGPT(prompt, apiKey, options);
          break;
        case AI_MODEL_TYPES.CLAUDE:
          narrative = await this.generateWithClaude(prompt, apiKey, options);
          break;
        case AI_MODEL_TYPES.GEMINI:
          narrative = await this.generateWithGemini(prompt, apiKey, options);
          break;
        default:
          throw new Error(`Unsupported AI model: ${targetModel}`);
      }

      performanceService?.endTracking?.(start);
      return narrative;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.error('Failed to generate narrative', error);
      throw error;
    }
  }

  async generateWithChatGPT(prompt, apiKey, options = {}) {
    const requestBody = {
      model: options.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a creative writer who creates engaging daily life narratives based on user data. Write in a natural, conversational tone.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    };

    const response = await this.makeAPIRequest(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from ChatGPT API');
    }

    return response.choices[0].message.content.trim();
  }

  async generateWithClaude(prompt, apiKey, options = {}) {
    const requestBody = {
      model: options.model || 'claude-3-sonnet-20240229',
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: `You are a creative writer who creates engaging daily life narratives. Write in a natural, conversational tone.\n\n${prompt}`
        }
      ]
    };

    const response = await this.makeAPIRequest(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.content || response.content.length === 0) {
      throw new Error('No response from Claude API');
    }

    return response.content[0].text.trim();
  }

  async generateWithGemini(prompt, apiKey, options = {}) {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `You are a creative writer who creates engaging daily life narratives. Write in a natural, conversational tone.\n\n${prompt}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 1000
      }
    };

    const response = await this.makeAPIRequest(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Invalid response structure from Gemini API');
    }

    return candidate.content.parts[0].text.trim();
  }

  async makeAPIRequest(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('API request timed out');
      }
      
      throw error;
    }
  }

  async testConnection(model = null) {
    try {
      const targetModel = model || this.preferredModel;
      const testPrompt = "Write a brief test message to confirm the AI connection is working.";
      
      const response = await this.generateNarrative(testPrompt, targetModel, {
        maxTokens: 50,
        temperature: 0.5
      });

      return {
        success: true,
        model: targetModel,
        response: response.substring(0, 100) + (response.length > 100 ? '...' : '')
      };
    } catch (error) {
      return {
        success: false,
        model: model || this.preferredModel,
        error: error.message
      };
    }
  }

  async getAvailableModels() {
    const models = [];
    
    for (const modelType of Object.values(AI_MODEL_TYPES)) {
      if (modelType === AI_MODEL_TYPES.LOCAL) continue; // Skip local for now
      
      const hasApiKey = !!this.getApiKey(modelType);
      models.push({
        type: modelType,
        name: this.getModelDisplayName(modelType),
        available: hasApiKey,
        current: modelType === this.preferredModel
      });
    }
    
    return models;
  }

  getModelDisplayName(modelType) {
    const names = {
      [AI_MODEL_TYPES.CHATGPT]: 'ChatGPT (OpenAI)',
      [AI_MODEL_TYPES.CLAUDE]: 'Claude (Anthropic)',
      [AI_MODEL_TYPES.GEMINI]: 'Gemini (Google)',
      [AI_MODEL_TYPES.LOCAL]: 'Local Model'
    };
    
    return names[modelType] || modelType;
  }

  async generateEnhancedPrompt(baseContext, style = 'casual', length = 'medium') {
    const stylePrompts = {
      casual: "Write in a casual, friendly tone as if telling a friend about your day.",
      professional: "Write in a professional, structured format suitable for a daily report.",
      creative: "Write in a creative, story-like format with vivid descriptions and engaging narrative.",
      minimal: "Write in a concise, bullet-point style focusing on key highlights."
    };

    const lengthModifiers = {
      short: "Keep it brief - 2-3 sentences maximum.",
      medium: "Write a moderate length summary - 1-2 paragraphs.",
      long: "Write a detailed narrative - 3-4 paragraphs with rich context."
    };

    return `${stylePrompts[style] || stylePrompts.casual}
    
${lengthModifiers[length] || lengthModifiers.medium}

Context to write about:
${baseContext}

Focus on creating a natural, engaging narrative that brings the day to life while maintaining accuracy to the provided data.`;
  }

  // Utility methods for integration
  async isModelAvailable(model) {
    return !!this.getApiKey(model);
  }

  async validateApiKey(model, apiKey) {
    try {
      const tempService = new NarrativeAIService();
      tempService.apiKeys[model] = apiKey;
      
      const result = await tempService.testConnection(model);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  getUsageStats() {
    // Return basic usage statistics if available
    return {
      preferred_model: this.preferredModel,
      configured_models: Object.keys(this.apiKeys),
      total_models: Object.keys(AI_MODEL_TYPES).length
    };
  }
}

// Export singleton instance
const narrativeAIService = new NarrativeAIService();

// Export utility functions for backward compatibility
export const generateNarrativeWithAI = (prompt, model, options) => 
  narrativeAIService.generateNarrative(prompt, model, options);

export const getPreferredAIModel = () => 
  narrativeAIService.getPreferredModel();

export const setPreferredAIModel = (model) => 
  narrativeAIService.setPreferredModel(model);

export const testAIConnection = (model) => 
  narrativeAIService.testConnection(model);

export default narrativeAIService;