// src/services/oauthService.js
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import encryptionService from '../utils/encryptionService';

// BELANGRIJK: OpenAI heeft nog geen publieke OAuth2 API voor consumer apps
// Deze implementatie is een proof-of-concept die de structuur toont
// Voor nu simuleren we een succesvolle OAuth flow voor demo doeleinden

const OPENAI_CONFIG = {
  // Placeholder configuratie - OpenAI OAuth is nog niet publiek beschikbaar
  clientId: 'demo-client-id',
  redirectUri: 'com.minakami.personaltracker://oauth/callback',
  scopes: ['api'],
  responseType: 'code',
  // Deze endpoints bestaan nog niet echt bij OpenAI
  authorizationEndpoint: 'https://example.com/demo-oauth',
  tokenEndpoint: 'https://example.com/demo-token',
};

class OAuthService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await encryptionService.initialize();
      this.isInitialized = true;
      if (__DEV__) console.info('[OAuthService] Initialized successfully');
    } catch (error) {
      console.error('[OAuthService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start OpenAI "OAuth" flow (Demo versie met API key prompt)
   * OPMERKING: OpenAI heeft nog geen publieke OAuth, dus we gebruiken een web-gebaseerde API key input
   */
  async loginWithOpenAI() {
    try {
      await this.initialize();
      
      if (__DEV__) console.info('[OAuthService] Starting OpenAI demo login flow...');
      
      // Open de OpenAI platform URL in de browser
      const url = 'https://platform.openai.com/api-keys';
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          
          // In een echte implementatie zou je een deep link callback afwachten
          // Voor nu geven we een gids hoe de gebruiker handmatig een API key kan invoeren
          return {
            success: false,
            message: 'Open de app-instellingen en voer je OpenAI API key handmatig in',
            needsApiKey: true,
            guide: 'Ga naar Instellingen > AI Instellingen > OpenAI API Key'
          };
        } else {
          return {
            success: false,
            message: 'Kan OpenAI platform niet openen',
            error: 'URL not supported'
          };
        }
      } catch (error) {
        console.error('[OAuthService] Error opening URL:', error);
        return {
          success: false,
          message: 'Fout bij openen van OpenAI platform',
          error: error
        };
      }
    } catch (error) {
      console.error('[OAuthService] OpenAI login error:', error);
      return {
        success: false,
        message: error.message || 'Er is een fout opgetreden bij het inloggen',
        error: error
      };
    }
  }


  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(authCode) {
    try {
      const response = await fetch(OPENAI_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: OPENAI_CONFIG.clientId,
          code: authCode,
          redirect_uri: OPENAI_CONFIG.redirectUri,
          code_verifier: await this.getCodeVerifier(),
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[OAuthService] Token exchange error:', error);
      throw error;
    }
  }

  /**
   * Generate PKCE code challenge voor security
   */
  async generateCodeChallenge() {
    // Voor nu een eenvoudige implementatie
    // In productie zou je een echte PKCE challenge genereren
    const codeVerifier = this.generateRandomString(128);
    await AsyncStorage.setItem('oauth_code_verifier', codeVerifier);
    
    // Voor demo purposes, return gewoon de verifier als challenge
    return codeVerifier;
  }

  async getCodeVerifier() {
    return await AsyncStorage.getItem('oauth_code_verifier');
  }

  generateRandomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Store access token securely
   */
  async storeAccessToken(provider, tokenData) {
    try {
      const tokenInfo = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope,
        tokenType: tokenData.token_type || 'Bearer',
        provider: provider,
        createdAt: Date.now()
      };

      // Encrypt en sla op
      const encryptedToken = await encryptionService.encryptData(tokenInfo);
      if (encryptedToken) {
        await AsyncStorage.setItem(`oauth_token_${provider}`, encryptedToken);
        if (__DEV__) console.info(`[OAuthService] ${provider} token stored securely`);
        return true;
      } else {
        throw new Error('Token encryption failed');
      }
    } catch (error) {
      console.error('[OAuthService] Error storing access token:', error);
      throw error;
    }
  }

  /**
   * Get stored access token
   */
  async getAccessToken(provider) {
    try {
      const encryptedToken = await AsyncStorage.getItem(`oauth_token_${provider}`);
      if (!encryptedToken) {
        return null;
      }

      const tokenInfo = await encryptionService.decryptData(encryptedToken);
      if (!tokenInfo) {
        if (__DEV__) console.warn(`[OAuthService] Failed to decrypt ${provider} token`);
        return null;
      }

      // Check if token is expired
      if (tokenInfo.expiresAt && Date.now() > tokenInfo.expiresAt) {
        if (__DEV__) console.info(`[OAuthService] ${provider} token expired, attempting refresh...`);
        
        if (tokenInfo.refreshToken) {
          return await this.refreshAccessToken(provider, tokenInfo.refreshToken);
        } else {
          // Token expired and no refresh token
          await this.clearAccessToken(provider);
          return null;
        }
      }

      return tokenInfo;
    } catch (error) {
      console.error(`[OAuthService] Error getting ${provider} access token:`, error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(provider, refreshToken) {
    try {
      if (provider !== 'openai') {
        throw new Error(`Refresh not implemented for ${provider}`);
      }

      const response = await fetch(OPENAI_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: OPENAI_CONFIG.clientId,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = await response.json();
      await this.storeAccessToken(provider, tokenData);
      
      return await this.getAccessToken(provider);
    } catch (error) {
      console.error(`[OAuthService] Error refreshing ${provider} token:`, error);
      await this.clearAccessToken(provider);
      return null;
    }
  }

  /**
   * Clear stored access token
   */
  async clearAccessToken(provider) {
    try {
      await AsyncStorage.removeItem(`oauth_token_${provider}`);
      if (__DEV__) console.info(`[OAuthService] ${provider} token cleared`);
    } catch (error) {
      console.error(`[OAuthService] Error clearing ${provider} token:`, error);
    }
  }

  /**
   * Check if user is logged in via OAuth
   */
  async isLoggedIn(provider) {
    const token = await this.getAccessToken(provider);
    return token !== null;
  }

  /**
   * Logout from OAuth provider
   */
  async logout(provider) {
    try {
      await this.clearAccessToken(provider);
      // Clear PKCE verifier as well
      await AsyncStorage.removeItem('oauth_code_verifier');
      
      return {
        success: true,
        message: `Succesvol uitgelogd bij ${provider}`
      };
    } catch (error) {
      console.error(`[OAuthService] Logout error for ${provider}:`, error);
      return {
        success: false,
        message: 'Er is een fout opgetreden bij het uitloggen'
      };
    }
  }
}

// Singleton instance
const oauthService = new OAuthService();
export default oauthService;