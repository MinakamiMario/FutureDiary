// src/utils/AppContext.js - Adding imports step by step
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { saveSettings, loadSettings } from './settingsStorage';
import databaseService from '../services/database';
import activityService from '../services/activityService';
import locationService from '../services/locationService';
import callLogService from '../services/callLogService';
import samsungHealthService from '../services/samsungHealthService';
import { generateDailySummary } from '../services/summaryService';
import errorHandler from '../services/errorLogger';
import stravaService from '../services/stravaService';
import eventCorrelationEngine from '../services/eventCorrelationEngine';
// import appUsageService from '../services/appUsageService'; // TEMPORARILY DISABLED - causes import error
// import dataFusionService from '../services/dataFusionService'; // TEMPORARILY DISABLED - causes import error

// Creëer de context
const AppContext = createContext();

// Custom hook om gemakkelijk toegang te krijgen tot de context
export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  // Basic app state
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    trackLocation: true,
    trackActivity: true,
    trackCalls: true,
    allowNotifications: true,
    dailyNotifications: true,
    weeklyNotifications: true,
    darkMode: false,
    isOnboarded: false,
    stepGoal: 10000,
    privacySettings: {
      shareAnalytics: false,
      storeEncrypted: true,
      encryptCallData: true,
      retentionPeriod: 90
    },
    samsungHealthEnabled: false,
    samsungHealthAutoSync: true,
    samsungHealthPermissions: []
  });
  
  const [activityStats, setActivityStats] = useState({
    todaySteps: 0,
    activeTime: 0,
    currentActivity: 'unknown',
    recentActivities: [],
    activityGoals: {
      steps: 10000,
      activeMinutes: 30
    }
  });
  
  const [locationStats, setLocationStats] = useState({
    frequentPlaces: [],
    currentLocation: null,
    recentVisits: []
  });
  
  const [callStats, setCallStats] = useState({
    frequentContacts: [],
    recentCalls: [],
    callSummary: null
  });
  
  const [dailySummary, setDailySummary] = useState(null);
  const [weeklyTrends, setWeeklyTrends] = useState(null);

  // Load settings on startup
  useEffect(() => {
    async function loadAppSettings() {
      try {
        const savedSettings = await loadSettings();
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...savedSettings }));
          
          // Start activity monitoring if enabled
          if (savedSettings.trackActivity) {
            console.log('Starting activity monitoring...');
            await activityService.startMonitoring();
          }
          
          // Start location tracking if enabled
          if (savedSettings.trackLocation) {
            console.log('Starting location tracking...');
            await locationService.startTracking();
          }
          
          // Initialize Samsung Health if enabled
          if (savedSettings.samsungHealthEnabled) {
            console.log('Initializing Samsung Health...');
            try {
              const initResult = await samsungHealthService.initialize();
              if (initResult.success && savedSettings.samsungHealthAutoSync) {
                console.log('Starting Samsung Health auto-sync...');
                samsungHealthService.syncAllHealthData();
              }
            } catch (error) {
              console.log('Samsung Health initialization failed:', error);
            }
          }
        }
      } catch (error) {
        errorHandler.error('Fout bij laden instellingen', error, 'AppContext');
      }
    }
    
    loadAppSettings();
  }, []);

  // Settings update function
  const updateSettings = useCallback(async (newSettings) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings);
      return { success: true };
    } catch (error) {
      errorHandler.error('Fout bij updaten instellingen', error, 'AppContext');
      return { success: false, error };
    }
  }, [settings]);

  // Basic dashboard stats loader
  const loadDashboardStats = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Basic implementation without service dependencies
      console.log('Loading basic dashboard stats...');
      return { success: true };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Basic refresh function
  const refreshStats = useCallback(async (statType) => {
    setIsLoading(true);
    
    try {
      console.log(`Refreshing ${statType} stats...`);
      return { success: true };
    } catch (error) {
      console.error(`Refresh ${statType} error:`, error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Context value
  const contextValue = useMemo(() => ({
    isLoading,
    settings,
    updateSettings,
    activityStats,
    locationStats,
    callStats,
    dailySummary,
    weeklyTrends,
    loadDashboardStats,
    refreshStats
  }), [
    isLoading,
    settings,
    updateSettings,
    activityStats,
    locationStats,
    callStats,
    dailySummary,
    weeklyTrends,
    loadDashboardStats,
    refreshStats
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};