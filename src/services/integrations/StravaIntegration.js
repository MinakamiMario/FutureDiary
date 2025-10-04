/**
 * STRAVA INTEGRATION SERVICE
 * 
 * Handles all Strava-related functionality
 * Extracted from stravaService.js for better organization
 */

import errorHandler from '../errorLogger';
import performanceService from '../performanceService';
import databaseService from '../../database';
import AsyncStorage from '@react-native-async-storage/async-storage';

class StravaIntegration {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://www.strava.com/api/v3';
  }

  async initialize() {
    try {
      // Load saved tokens and config
      const savedTokens = await AsyncStorage.getItem('strava_tokens');
      const savedConfig = await AsyncStorage.getItem('strava_config');
      
      if (savedTokens) {
        const tokens = JSON.parse(savedTokens);
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        this.tokenExpiry = tokens.tokenExpiry;
      }
      
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
      }
    } catch (error) {
      errorHandler.logError('Failed to initialize Strava integration', error);
    }
  }

  async setCredentials(clientId, clientSecret) {
    try {
      this.clientId = clientId;
      this.clientSecret = clientSecret;
      
      await AsyncStorage.setItem('strava_config', JSON.stringify({
        clientId,
        clientSecret
      }));
    } catch (error) {
      errorHandler.logError('Failed to save Strava credentials', error);
      throw error;
    }
  }

  async authenticate(authCode) {
    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: authCode,
          grant_type: 'authorization_code'
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      await this.saveTokens();
      
      return {
        success: true,
        athlete: data.athlete
      };
    } catch (error) {
      errorHandler.logError('Strava authentication failed', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      await this.saveTokens();
      
      return true;
    } catch (error) {
      errorHandler.logError('Token refresh failed', error);
      throw error;
    }
  }

  async saveTokens() {
    try {
      await AsyncStorage.setItem('strava_tokens', JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry
      }));
    } catch (error) {
      errorHandler.logError('Failed to save Strava tokens', error);
    }
  }

  async ensureValidToken() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    // Check if token is expired (with 5 minute buffer)
    if (this.tokenExpiry && Date.now() > (this.tokenExpiry - 300000)) {
      await this.refreshAccessToken();
    }
  }

  async makeApiRequest(endpoint, options = {}) {
    await this.ensureValidToken();

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be invalid, try to refresh
        await this.refreshAccessToken();
        // Retry the request
        return this.makeApiRequest(endpoint, options);
      }
      throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getActivities(page = 1, perPage = 30) {
    const start = performanceService?.startTracking?.('strava.getActivities');

    try {
      const activities = await this.makeApiRequest(`/athlete/activities?page=${page}&per_page=${perPage}`);
      
      performanceService?.endTracking?.(start);
      return activities;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to get Strava activities', error);
      throw error;
    }
  }

  async getActivity(activityId) {
    const start = performanceService?.startTracking?.('strava.getActivity');

    try {
      const activity = await this.makeApiRequest(`/activities/${activityId}`);
      
      performanceService?.endTracking?.(start);
      return activity;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to get Strava activity', error);
      throw error;
    }
  }

  async syncActivities(limit = 50) {
    const start = performanceService?.startTracking?.('strava.syncActivities');

    try {
      const activities = await this.getActivities(1, limit);
      const syncedActivities = [];

      for (const stravaActivity of activities) {
        // Check if we already have this activity
        const existingActivity = await databaseService.findActivityByStravaId(stravaActivity.id.toString());
        
        if (!existingActivity) {
          // Convert Strava activity to our format
          const activity = this.convertStravaActivity(stravaActivity);
          const result = await databaseService.addActivity(activity);
          syncedActivities.push(result);
        }
      }

      performanceService?.endTracking?.(start);
      return {
        total_fetched: activities.length,
        new_activities: syncedActivities.length,
        activities: syncedActivities
      };
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      errorHandler.logError('Failed to sync Strava activities', error);
      throw error;
    }
  }

  convertStravaActivity(stravaActivity) {
    return {
      type: 'exercise',
      start_time: new Date(stravaActivity.start_date).getTime(),
      end_time: new Date(stravaActivity.start_date).getTime() + (stravaActivity.elapsed_time * 1000),
      duration: stravaActivity.elapsed_time * 1000, // Convert to milliseconds
      details: stravaActivity.name,
      source: 'strava',
      metadata: {
        strava_id: stravaActivity.id,
        description: stravaActivity.description,
        gear_id: stravaActivity.gear_id,
        trainer: stravaActivity.trainer,
        commute: stravaActivity.commute
      },
      calories: stravaActivity.calories,
      distance: stravaActivity.distance,
      sport_type: stravaActivity.sport_type || stravaActivity.type,
      strava_id: stravaActivity.id.toString(),
      heart_rate_avg: stravaActivity.average_heartrate,
      heart_rate_max: stravaActivity.max_heartrate,
      elevation_gain: stravaActivity.total_elevation_gain
    };
  }

  async getAthleteProfile() {
    try {
      return await this.makeApiRequest('/athlete');
    } catch (error) {
      errorHandler.logError('Failed to get athlete profile', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const profile = await this.getAthleteProfile();
      const stats = await this.makeApiRequest(`/athletes/${profile.id}/stats`);
      return stats;
    } catch (error) {
      errorHandler.logError('Failed to get Strava stats', error);
      throw error;
    }
  }

  isAuthenticated() {
    return !!(this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry);
  }

  async disconnect() {
    try {
      // Revoke the token
      if (this.accessToken) {
        await fetch('https://www.strava.com/oauth/deauthorize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      // Clear local tokens
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiry = null;

      await AsyncStorage.removeItem('strava_tokens');
      
      return true;
    } catch (error) {
      errorHandler.logError('Failed to disconnect from Strava', error);
      throw error;
    }
  }

  getAuthUrl(redirectUri, scope = 'read,activity:read_all') {
    if (!this.clientId) {
      throw new Error('Client ID not configured');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope
    });

    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  getConnectionStatus() {
    return {
      authenticated: this.isAuthenticated(),
      hasTokens: !!(this.accessToken && this.refreshToken),
      tokenExpiry: this.tokenExpiry,
      configured: !!(this.clientId && this.clientSecret)
    };
  }
}

const stravaIntegration = new StravaIntegration();
export default stravaIntegration;