// strava.config.js
// Strava API configuration with real credentials

const StravaConfig = {
  // Real Strava app credentials - Updated with working credentials
  CLIENT_ID: '171450',
  CLIENT_SECRET: 'f4fbab8e18c3e0ac6e5c29b24c3e5cf17ad86e0c',
  
  // Production web server for OAuth callback
  REDIRECT_URI: 'https://api.minakamiapp.com/auth/strava/callback',
  
  // Development fallback
  DEV_REDIRECT_URI: 'http://localhost:8080/callback',
  
  // API endpoints (don't change these)
  BASE_URL: 'https://www.strava.com/api/v3',
  AUTH_URL: 'https://www.strava.com/oauth/authorize',
  TOKEN_URL: 'https://www.strava.com/oauth/token',
  
  // Scopes requested from Strava
  SCOPES: 'read,activity:read_all'
};

export default StravaConfig;