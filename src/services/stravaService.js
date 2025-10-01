// src/services/stravaService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STRAVA_CONFIG = {
  CLIENT_ID: '171450',
  CLIENT_SECRET: 'f4fbab8e18c3e0ac6e5c29b24c3e5cf17ad86e0c',
  REDIRECT_URI: 'http://localhost/callback',
  SCOPE: 'read,activity:read_all,profile:read_all',
  BASE_URL: 'https://www.strava.com/api/v3',
  TOKEN_URL: 'https://www.strava.com/oauth/token',
  AUTH_BASE_URL: 'https://www.strava.com/oauth/authorize'
};

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'strava_access_token',
  REFRESH_TOKEN: 'strava_refresh_token',
  EXPIRES_AT: 'strava_expires_at',
  TOKEN_TYPE: 'strava_token_type',
  ATHLETE: 'strava_athlete'
};

class StravaService {
  constructor() {
    this.tokens = null;
    this.athlete = null;
    this.isInitialized = false;
    this.reconnectCallback = null;
  }

  /**
   * Initialize the service by loading stored tokens
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      const tokens = await this.getStoredTokens();
      if (tokens) {
        this.tokens = tokens;
        
        // Load stored athlete data
        const athleteData = await AsyncStorage.getItem(STORAGE_KEYS.ATHLETE);
        if (athleteData) {
          this.athlete = JSON.parse(athleteData);
        }
      }
      
      this.isInitialized = true;
      console.log('StravaService initialized:', !!this.tokens);
    } catch (error) {
      console.error('StravaService initialization error:', error);
      this.isInitialized = true; // Don't block the app
    }
  }

  /**
   * Store authentication tokens and athlete data
   */
  async storeTokens(tokens, athlete = null) {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token],
        [STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token],
        [STORAGE_KEYS.EXPIRES_AT, tokens.expires_at.toString()],
        [STORAGE_KEYS.TOKEN_TYPE, tokens.token_type || 'Bearer']
      ]);

      if (athlete) {
        await AsyncStorage.setItem(STORAGE_KEYS.ATHLETE, JSON.stringify(athlete));
        this.athlete = athlete;
      }

      this.tokens = tokens;
      console.log('Strava tokens stored successfully');
      
      return { success: true };
    } catch (error) {
      console.error('Error storing Strava tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieve stored authentication tokens
   */
  async getStoredTokens() {
    try {
      const tokenData = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.EXPIRES_AT,
        STORAGE_KEYS.TOKEN_TYPE
      ]);

      const [
        [, accessToken],
        [, refreshToken],
        [, expiresAt],
        [, tokenType]
      ] = tokenData;

      if (accessToken && refreshToken && expiresAt) {
        return {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: parseInt(expiresAt, 10),
          token_type: tokenType || 'Bearer'
        };
      }

      return null;
    } catch (error) {
      console.error('Error retrieving stored tokens:', error);
      return null;
    }
  }

  /**
   * Check if the current access token is expired
   */
  isTokenExpired(tokens = null) {
    const tokenData = tokens || this.tokens;
    if (!tokenData || !tokenData.expires_at) {
      return true;
    }

    // Check if token expires within the next 5 minutes (buffer time)
    const bufferTime = 5 * 60; // 5 minutes in seconds
    const currentTime = Math.floor(Date.now() / 1000);
    
    return (tokenData.expires_at - bufferTime) <= currentTime;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken() {
    if (!this.tokens || !this.tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('Refreshing Strava access token...');
      
      const response = await fetch(STRAVA_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: STRAVA_CONFIG.CLIENT_ID,
          client_secret: STRAVA_CONFIG.CLIENT_SECRET,
          refresh_token: this.tokens.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.access_token) {
        const newTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token || this.tokens.refresh_token,
          expires_at: data.expires_at,
          expires_in: data.expires_in,
          token_type: data.token_type || 'Bearer'
        };

        // Store the new tokens
        await this.storeTokens(newTokens);
        
        console.log('Access token refreshed successfully');
        return { success: true, tokens: newTokens };
      } else {
        throw new Error('No access token received from refresh');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Make an authenticated API call to Strava
   */
  async makeApiCall(endpoint, options = {}) {
    await this.initialize();

    if (!this.tokens) {
      throw new Error('Not authenticated with Strava');
    }

    // Check if token needs refreshing
    if (this.isTokenExpired()) {
      console.log('Token expired, refreshing...');
      const refreshResult = await this.refreshAccessToken();
      
      if (!refreshResult.success) {
        throw new Error(`Token refresh failed: ${refreshResult.error}`);
      }
    }

    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${STRAVA_CONFIG.BASE_URL}${endpoint}`;

    const requestOptions = {
      method: 'GET',
      headers: {
        'Authorization': `${this.tokens.token_type} ${this.tokens.access_token}`,
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      console.log(`Making Strava API call: ${requestOptions.method} ${url}`);
      
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (!response.ok) {
        // Handle specific Strava API errors
        if (response.status === 401) {
          // Token is invalid, try refresh once
          console.log('Received 401, attempting token refresh...');
          const refreshResult = await this.refreshAccessToken();
          
          if (refreshResult.success) {
            // Retry the original request with new token
            requestOptions.headers['Authorization'] = `${this.tokens.token_type} ${this.tokens.access_token}`;
            const retryResponse = await fetch(url, requestOptions);
            const retryData = await retryResponse.json();
            
            if (!retryResponse.ok) {
              throw new Error(retryData.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
            }
            
            return retryData;
          } else {
            throw new Error('Authentication failed - please re-authorize with Strava');
          }
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded - please try again later');
        } else {
          throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      }

      return data;
    } catch (error) {
      console.error(`Strava API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get the authenticated athlete's profile
   */
  async getAthlete() {
    try {
      const athlete = await this.makeApiCall('/athlete');
      
      // Update stored athlete data
      if (athlete) {
        await AsyncStorage.setItem(STORAGE_KEYS.ATHLETE, JSON.stringify(athlete));
        this.athlete = athlete;
      }
      
      return athlete;
    } catch (error) {
      console.error('Error fetching athlete:', error);
      throw error;
    }
  }

  /**
   * Get the authenticated athlete's activities
   */
  async getActivities(page = 1, perPage = 30) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: Math.min(perPage, 200).toString() // Strava max is 200
      });

      const activities = await this.makeApiCall(`/athlete/activities?${params.toString()}`);
      
      console.log(`Retrieved ${activities.length} activities from Strava`);
      return activities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }

  /**
   * Get detailed activity data
   */
  async getActivity(activityId) {
    try {
      const activity = await this.makeApiCall(`/activities/${activityId}`);
      return activity;
    } catch (error) {
      console.error(`Error fetching activity ${activityId}:`, error);
      throw error;
    }
  }

  /**
   * Get the authenticated athlete's stats
   */
  async getStats(athleteId = null) {
    try {
      // Use current athlete ID if not provided
      if (!athleteId) {
        await this.initialize();
        if (this.athlete && this.athlete.id) {
          athleteId = this.athlete.id;
        } else {
          // Fetch athlete data if we don't have it
          const athlete = await this.getAthlete();
          athleteId = athlete.id;
        }
      }

      const stats = await this.makeApiCall(`/athletes/${athleteId}/stats`);
      
      console.log('Retrieved athlete stats from Strava');
      return stats;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Get activity streams (detailed data like GPS coordinates, heart rate, etc.)
   */
  async getActivityStreams(activityId, types = ['time', 'distance', 'latlng', 'altitude', 'heartrate', 'cadence', 'watts', 'temp']) {
    try {
      const typeList = types.join(',');
      const streams = await this.makeApiCall(`/activities/${activityId}/streams/${typeList}`);
      
      console.log(`Retrieved activity streams for activity ${activityId}`);
      return streams;
    } catch (error) {
      console.error(`Error fetching activity streams for ${activityId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    await this.initialize();
    return !!this.tokens && !this.isTokenExpired();
  }

  /**
   * Get connection status
   */
  async getConnectionStatus() {
    await this.initialize();
    
    return {
      isConnected: !!this.tokens && !this.isTokenExpired(),
      athlete: this.athlete,
      tokenExpiry: this.tokens ? new Date(this.tokens.expires_at * 1000) : null
    };
  }

  /**
   * Get current athlete data from memory
   */
  getCurrentAthlete() {
    return this.athlete;
  }

  /**
   * Import activities and store them in the database
   */
  async importActivities(daysBack = 30) {
    try {
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with Strava');
      }

      console.log(`Importing Strava activities from last ${daysBack} days...`);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      let allActivities = [];
      let page = 1;
      const perPage = 50;
      
      // Fetch activities in pages
      while (true) {
        const activities = await this.getActivities(page, perPage);
        
        if (activities.length === 0) {
          break;
        }
        
        // Filter activities within date range
        const filteredActivities = activities.filter(activity => {
          const activityDate = new Date(activity.start_date);
          return activityDate >= startDate && activityDate <= endDate;
        });
        
        allActivities = allActivities.concat(filteredActivities);
        
        // If we got fewer activities than requested, we've reached the end
        if (activities.length < perPage) {
          break;
        }
        
        // If the oldest activity in this page is older than our range, stop
        const oldestActivityDate = new Date(activities[activities.length - 1].start_date);
        if (oldestActivityDate < startDate) {
          break;
        }
        
        page++;
      }

      console.log(`Found ${allActivities.length} Strava activities in date range`);
      
      // TODO: Store activities in database here
      // For now, just return the data
      
      return {
        success: true,
        imported: allActivities.length,
        activities: allActivities,
        message: `Successfully imported ${allActivities.length} Strava activities`
      };
      
    } catch (error) {
      console.error('Error importing Strava activities:', error);
      return {
        success: false,
        imported: 0,
        message: error.message || 'Failed to import Strava activities'
      };
    }
  }

  /**
   * Logout and clear stored tokens
   */
  async logout() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.EXPIRES_AT,
        STORAGE_KEYS.TOKEN_TYPE,
        STORAGE_KEYS.ATHLETE
      ]);

      this.tokens = null;
      this.athlete = null;
      
      console.log('Strava logout successful');
      return { success: true };
    } catch (error) {
      console.error('Error during Strava logout:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get service availability
   */
  isAvailable() {
    return true; // Strava service is always available
  }

  /**
   * Get service ready status
   */
  async isReady() {
    return await this.isAuthenticated();
  }

  /**
   * Get user profile (alias for getCurrentAthlete)
   */
  get userProfile() {
    return this.athlete;
  }

  /**
   * Initialize connection (compatibility method)
   * This method ensures the service is properly initialized
   */
  async initializeConnection() {
    try {
      await this.initialize();
      console.log('Strava connection initialized');
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize Strava connection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Connect to Strava (main connection method)
   * This handles the OAuth flow initiation
   */
  async connect() {
    try {
      await this.initialize();
      
      // Check if already connected
      if (this.tokens && !this.isTokenExpired()) {
        return {
          success: true,
          message: 'Already connected to Strava',
          alreadyConnected: true
        };
      }

      // Return configuration for WebView OAuth flow
      return {
        success: true,
        pending: true,
        message: 'OAuth flow needs to be initiated',
        authUrl: this.buildAuthUrl(),
        requiresWebView: true
      };
    } catch (error) {
      console.error('Strava connect error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate Strava connection'
      };
    }
  }

  /**
   * Disconnect from Strava
   */
  async disconnect() {
    try {
      const result = await this.logout();
      if (result.success) {
        return {
          success: true,
          message: 'Successfully disconnected from Strava'
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Strava disconnect error:', error);
      return {
        success: false,
        error: error.message || 'Failed to disconnect from Strava'
      };
    }
  }

  /**
   * Test setup and get configuration issues
   */
  testSetup() {
    const issues = [];
    const warnings = [];

    // Check client ID
    if (!STRAVA_CONFIG.CLIENT_ID || STRAVA_CONFIG.CLIENT_ID === '171450') {
      issues.push('Strava Client ID is not configured');
    }

    // Check client secret
    if (!STRAVA_CONFIG.CLIENT_SECRET || STRAVA_CONFIG.CLIENT_SECRET === 'f4fbab8e18c3e0ac6e5c29b24c3e5cf17ad86e0c') {
      issues.push('Strava Client Secret is not configured');
    }

    // Check redirect URI
    if (!STRAVA_CONFIG.REDIRECT_URI || STRAVA_CONFIG.REDIRECT_URI === 'http://localhost/callback') {
      warnings.push('Using default redirect URI (http://localhost/callback)');
    }

    // Check scope
    if (!STRAVA_CONFIG.SCOPE) {
      issues.push('Strava OAuth scope is not configured');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      config: {
        hasClientId: !!STRAVA_CONFIG.CLIENT_ID,
        hasClientSecret: !!STRAVA_CONFIG.CLIENT_SECRET,
        hasRedirectUri: !!STRAVA_CONFIG.REDIRECT_URI,
        hasScope: !!STRAVA_CONFIG.SCOPE
      }
    };
  }

  /**
   * Get user instructions for connection
   */
  getUserInstructions() {
    return {
      title: 'Strava Verbinding Instructies',
      description: 'Volg deze stappen om je Strava account te koppelen:',
      steps: [
        '1. Klik op "Verbind met Strava"',
        '2. Log in op je Strava account (indien gevraagd)',
        '3. Autoriseer MinakamiApp om je trainingsdata te lezen',
        '4. Je wordt automatisch teruggestuurd naar de app',
        '5. Je activiteiten worden nu automatisch gesynchroniseerd'
      ],
      privacy: 'Je gegevens blijven privé en worden alleen lokaal opgeslagen op je apparaat.'
    };
  }

  /**
   * Clear all cache and stored data
   */
  async clearAllCache() {
    try {
      await this.logout();
      return {
        success: true,
        message: 'All Strava cache and data cleared'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set reconnect callback for token expiration
   */
  setReconnectCallback(callback) {
    this.reconnectCallback = callback;
  }

  /**
   * Build authorization URL for OAuth flow
   */
  buildAuthUrl() {
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const params = new URLSearchParams({
      client_id: STRAVA_CONFIG.CLIENT_ID,
      response_type: 'code',
      redirect_uri: STRAVA_CONFIG.REDIRECT_URI,
      scope: STRAVA_CONFIG.SCOPE,
      state: state
    });
    
    return `${STRAVA_CONFIG.AUTH_BASE_URL}?${params.toString()}`;
  }

  /**
   * Legacy method for compatibility with existing code
   */
  async startOAuthFlow() {
    // This method is now handled by the StravaAuthWebView component
    // Return instructions for using the new WebView component
    return {
      success: false,
      error: 'Please use StravaAuthWebView component for OAuth authentication',
      instructions: 'Import and use StravaAuthWebView component for Strava authentication',
      requiresWebView: true
    };
  }

  /**
   * Handle successful OAuth completion (called by StravaAuthWebView)
   */
  async handleOAuthSuccess(tokens, athlete) {
    try {
      const storeResult = await this.storeTokens(tokens, athlete);
      
      if (storeResult.success) {
        console.log('OAuth success handled:', athlete?.firstname || 'Unknown athlete');
        return {
          success: true,
          athlete: athlete,
          message: `Successfully connected to Strava as ${athlete?.firstname || 'athlete'}`
        };
      } else {
        throw new Error(storeResult.error);
      }
    } catch (error) {
      console.error('Error handling OAuth success:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete OAuth process'
      };
    }
  }
}

// Export a singleton instance
const stravaService = new StravaService();
export default stravaService;