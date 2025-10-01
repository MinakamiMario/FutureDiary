// src/services/locationService.js
// Real location service using react-native-get-location only

import { AppState, Platform } from 'react-native';
import GetLocation from 'react-native-get-location';
import databaseService from './database';
import errorHandler from './errorLogger';
import { BaseService } from './BaseService';
import platformDetector from '../utils/platformDetector';

// Location tracking constants
const LOCATION_INTERVAL = 300000; // 5 minutes
const SIGNIFICANT_DISTANCE = 100; // 100 meters
const LOCATION_TRACKING = 'locationTracking';

class LocationService extends BaseService {
  constructor() {
    super('LocationService');
    
    this.isTracking = false;
    this.lastLocation = null;
    this.locationTrackingInterval = null;
    this.platformInfo = null;
    
    // Initialize platform detection
    this.initializePlatform();
  }

  /**
   * Initialize platform detection
   */
  async initializePlatform() {
    try {
      this.platformInfo = await platformDetector.detectPlatform();
    } catch (error) {
      console.warn('Platform detection failed in Location service:', error);
      this.platformInfo = { isEmulator: false, shouldUseMockData: false };
    }
  }

  /**
   * Get current location using react-native-get-location
   */
  async getCurrentPositionAsync(options = {}) {
    try {
      // Ensure platform detection is complete
      if (!this.platformInfo) {
        await this.initializePlatform();
      }

      // On emulator, provide mock location
      if (this.platformInfo?.shouldUseMockData) {
        return {
          coords: {
            latitude: 52.3676 + (Math.random() - 0.5) * 0.01, // Amsterdam area
            longitude: 4.9041 + (Math.random() - 0.5) * 0.01,
            accuracy: 10 + Math.random() * 20,
            altitude: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        };
      }

      // Real device - get actual location
      const location = await GetLocation.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy || false,
        timeout: options.timeout || 15000,
      });
      
      return {
        coords: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude || null,
          heading: location.heading || null,
          speed: location.speed || null
        },
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Location service error: ${error.message}`);
    }
  }

  /**
   * Check if location services are enabled
   */
  async hasServicesEnabledAsync() {
    // For react-native-get-location, we try to get location to check if enabled
    try {
      await GetLocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Request location permissions
   */
  async requestForegroundPermissionsAsync() {
    try {
      // Try to get location - this will trigger permission request
      await GetLocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
      });
      return { status: 'granted' };
    } catch (error) {
      if (error.message.includes('denied') || error.message.includes('permission')) {
        return { status: 'denied' };
      }
      return { status: 'undetermined' };
    }
  }

  /**
   * Background permissions (not needed for react-native-get-location)
   */
  async requestBackgroundPermissionsAsync() {
    return { status: 'granted' };
  }

  /**
   * Get current permission status
   */
  async getForegroundPermissionsAsync() {
    try {
      await GetLocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
      });
      return { status: 'granted' };
    } catch (error) {
      return { status: 'denied' };
    }
  }

  async getBackgroundPermissionsAsync() {
    return { status: 'granted' };
  }

  /**
   * Start location tracking with interval-based updates
   */
  async startLocationUpdatesAsync(taskName, options = {}) {
    try {
      if (this.isTracking) {
        console.log('Location tracking already active');
        return;
      }

      // Check if location services are enabled
      const enabled = await this.hasServicesEnabledAsync();
      if (!enabled) {
        throw new Error('Location services are disabled');
      }

      // Check permissions
      const permissionStatus = await this.getForegroundPermissionsAsync();
      if (permissionStatus.status !== 'granted') {
        const requestResult = await this.requestForegroundPermissionsAsync();
        if (requestResult.status !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      this.isTracking = true;
      
      // Get initial location
      try {
        const initialLocation = await this.getCurrentPositionAsync();
        await this.handleLocationUpdate(initialLocation);
      } catch (error) {
        console.warn('Could not get initial location:', error);
      }

      // Start interval-based location tracking
      this.locationTrackingInterval = setInterval(async () => {
        try {
          const location = await this.getCurrentPositionAsync();
          await this.handleLocationUpdate(location);
        } catch (error) {
          console.warn('Location update failed:', error);
        }
      }, options.timeInterval || LOCATION_INTERVAL);

      console.log('Location tracking started with interval:', options.timeInterval || LOCATION_INTERVAL);
      
    } catch (error) {
      this.isTracking = false;
      errorHandler.error('Failed to start location tracking', error, 'LocationService');
      throw error;
    }
  }

  /**
   * Stop location tracking
   */
  async stopLocationUpdatesAsync(taskName) {
    try {
      if (!this.isTracking) {
        console.log('Location tracking not active');
        return;
      }

      if (this.locationTrackingInterval) {
        clearInterval(this.locationTrackingInterval);
        this.locationTrackingInterval = null;
      }

      this.isTracking = false;
      console.log('Location tracking stopped');
      
    } catch (error) {
      errorHandler.error('Failed to stop location tracking', error, 'LocationService');
    }
  }

  /**
   * Handle location update
   */
  async handleLocationUpdate(location) {
    try {
      if (!location || !location.coords) {
        return;
      }

      // Check if this is a significant location change
      if (this.lastLocation && this.getDistance(this.lastLocation, location.coords) < SIGNIFICANT_DISTANCE) {
        return; // Skip if movement is too small
      }

      this.lastLocation = location.coords;

      // Try to get place name (simplified version without geocoding)
      const placeName = await this.getPlaceName(location.coords);
      
      // Save to database
      await databaseService.addLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp || Date.now(),
        place_name: placeName,
        source: 'location_service'
      });

      if (__DEV__) {
        console.log('Location saved:', {
          lat: location.coords.latitude.toFixed(6),
          lng: location.coords.longitude.toFixed(6),
          place: placeName
        });
      }

    } catch (error) {
      errorHandler.error('Failed to handle location update', error, 'LocationService');
    }
  }

  /**
   * Get place name (simplified without reverse geocoding)
   */
  async getPlaceName(coords) {
    try {
      // For now, just return coordinates as place name
      // In a real app, you'd use a geocoding service here
      return `Location ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    } catch (error) {
      return `Location ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  getDistance(coord1, coord2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Get current location (wrapper for compatibility)
   */
  async getCurrentLocation() {
    try {
      const location = await this.getCurrentPositionAsync();
      return location.coords;
    } catch (error) {
      errorHandler.error('Failed to get current location', error, 'LocationService');
      return null;
    }
  }

  /**
   * Check if location tracking is active
   */
  isLocationTrackingActive() {
    return this.isTracking;
  }

  /**
   * Request location permissions with user-friendly messages
   */
  async requestLocationPermissions() {
    try {
      const foregroundResult = await this.requestForegroundPermissionsAsync();
      
      if (foregroundResult.status !== 'granted') {
        throw new Error('Location permission is required for this feature');
      }

      return {
        success: true,
        permissions: ['location']
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if location services are available
   */
  async checkLocationServicesAvailability() {
    try {
      const enabled = await this.hasServicesEnabledAsync();
      const permissions = await this.getForegroundPermissionsAsync();
      
      return {
        servicesEnabled: enabled,
        permissionGranted: permissions.status === 'granted',
        available: enabled && permissions.status === 'granted'
      };
    } catch (error) {
      return {
        servicesEnabled: false,
        permissionGranted: false,
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Start tracking with error handling
   */
  async startTracking() {
    try {
      await this.startLocationUpdatesAsync(LOCATION_TRACKING, {
        timeInterval: LOCATION_INTERVAL,
        distanceInterval: SIGNIFICANT_DISTANCE
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop tracking
   */
  async stopTracking() {
    try {
      await this.stopLocationUpdatesAsync(LOCATION_TRACKING);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get visited places - delegate to database service
   */
  async getVisitedPlaces(startTime, endTime, limit = 10) {
    try {
      return await databaseService.getVisitedPlaces(startTime, endTime, limit);
    } catch (error) {
      errorHandler.error('Failed to get visited places', error, 'LocationService');
      return [];
    }
  }
}

export default new LocationService();