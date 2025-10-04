import React, { createContext, useContext, useState, useCallback } from 'react';
import HealthDataService from '../services/healthDataService';

const HealthDataContext = createContext();

export const useHealthData = () => {
  const context = useContext(HealthDataContext);
  if (!context) {
    throw new Error('useHealthData must be used within a HealthDataProvider');
  }
  return context;
};

export const HealthDataProvider = ({ children }) => {
  const [healthStats, setHealthStats] = useState({
    steps: 0,
    calories: 0,
    distance: 0,
    activeMinutes: 0,
    heartRate: 0,
    isTracking: false,
  });
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);
  const [error, setError] = useState(null);

  const fetchHealthStats = useCallback(async (forceRefresh = false) => {
    try {
      // Cache for 5 minutes to avoid unnecessary API calls
      if (!forceRefresh && Date.now() - lastFetch < 300000 && healthStats.isTracking) {
        return healthStats;
      }

      setLoading(true);
      setError(null);
      
      const realStats = await HealthDataService.getHealthStats();
      const newStats = {
        steps: realStats.daily?.steps || 0,
        calories: realStats.daily?.calories || 0,
        distance: realStats.daily?.distance || 0,
        activeMinutes: realStats.daily?.activeMinutes || 0,
        heartRate: realStats.daily?.heartRate || 0,
        isTracking: true
      };
      
      setHealthStats(newStats);
      setLastFetch(Date.now());
      return newStats;
    } catch (err) {
      console.log('Error loading health stats:', err);
      setError(err);
      // Keep current stats or defaults on error
      return healthStats;
    } finally {
      setLoading(false);
    }
  }, [healthStats, lastFetch]);

  const refreshHealthStats = useCallback(() => {
    return fetchHealthStats(true);
  }, [fetchHealthStats]);

  return (
    <HealthDataContext.Provider 
      value={{ 
        healthStats, 
        loading, 
        error,
        fetchHealthStats, 
        refreshHealthStats 
      }}
    >
      {children}
    </HealthDataContext.Provider>
  );
};