import { useCallback, useState } from 'react';
import { Platform, Linking } from 'react-native';
import {
  requestActivityRecognitionPermission,
  requestLocationPermissionsSafe,
  requestCallLogPermission,
  requestNotificationPermission,
  isPermissionGranted,
  PERMISSIONS,
  RESULTS,
} from '../../../utils/permissions';
import { PermissionConfig } from '../types/onboarding.types';

export const usePermissionHandler = () => {
  const [permissionStatus, setPermissionStatus] = useState<{[key: string]: boolean}>({});
  const [permissionLoading, setPermissionLoading] = useState<{[key: string]: boolean}>({});
  const requestPermission = useCallback(async (permissionType: string): Promise<boolean> => {
    try {
      switch (permissionType) {
        case 'activity':
          const activityResult = await requestActivityRecognitionPermission();
          return isPermissionGranted(activityResult);
        
        case 'location':
          console.log('[ONBOARDING] Using SAFE location permission request');
          const locationResult = await requestLocationPermissionsSafe();
          console.log('[ONBOARDING] Safe location permission result:', locationResult);
          
          if (locationResult) {
            const fineLocationGranted = locationResult[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.GRANTED;
            const coarseLocationGranted = locationResult[PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION] === RESULTS.GRANTED;
            
            if (fineLocationGranted) {
              console.log('[ONBOARDING] Fine location granted - using precise location tracking');
              return true;
            } else if (coarseLocationGranted) {
              console.log('[ONBOARDING] Coarse location granted - using approximate location tracking');
              return true;
            }
          }
          console.log('[ONBOARDING] No location permissions granted');
          return false;
        
        case 'calls':
          if (Platform.OS === 'android') {
            const callResult = await requestCallLogPermission();
            return isPermissionGranted(callResult);
          }
          return true;
        
        case 'notifications':
          const notificationResult = await requestNotificationPermission();
          return isPermissionGranted(notificationResult);
        
        default:
          console.warn(`Unknown permission type: ${permissionType}`);
          return false;
      }
    } catch (error) {
      console.error(`[ONBOARDING] Permission error for ${permissionType}:`, error);
      
      const errorObj = error as any;
      if (errorObj.code === 'E_PERMISSION_DENIED') {
        console.log(`Permission ${permissionType} was denied by user`);
      } else if (errorObj.code === 'E_PERMISSION_UNAVAILABLE') {
        console.log(`Permission ${permissionType} is not available on this device`);
      } else {
        console.log(`Unexpected error requesting permission ${permissionType}:`, errorObj.message);
      }
      
      return false;
    }
  }, []);

  const openSystemLocationSettings = useCallback(async (): Promise<void> => {
    console.log('[ONBOARDING] Opening system location settings');
    try {
      await Linking.openSettings();
      console.log('[ONBOARDING] System settings opened successfully');
    } catch (error) {
      console.error('[ONBOARDING] Failed to open system settings:', error);
      const errorObj = error as any;
      throw new Error(`Kan systeem instellingen niet openen: ${errorObj.message}`);
    }
  }, []);

  const checkAllPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const permissions = ['notifications', 'location', 'activity', 'calls'];
      const results = await Promise.all(
        permissions.map(async (permission) => {
          if (permission === 'calls' && Platform.OS !== 'android') {
            return true; // iOS doesn't have call log permissions
          }
          return await requestPermission(permission);
        })
      );
      
      const allGranted = results.every(result => result);
      
      // Update status state
      permissions.forEach((permission, index) => {
        setPermissionStatus(prev => ({
          ...prev,
          [permission]: results[index]
        }));
      });
      
      return allGranted;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }, [requestPermission]);

  const handlePermissionToggle = useCallback(async (permissionKey: string): Promise<void> => {
    console.log(`[ONBOARDING] Permission toggle started: ${permissionKey}`);
    
    let functionCompleted = false;
    const crashDetectionTimeout = setTimeout(() => {
      if (!functionCompleted) {
        console.error(`[ONBOARDING] CRASH DETECTED: Function did not complete for ${permissionKey}`);
      }
    }, 15000);
    
    try {
      setPermissionLoading(prev => ({ ...prev, [permissionKey]: true }));
      
      const currentValue = permissionStatus[permissionKey] || false;
      
      if (!currentValue) {
        console.log(`[ONBOARDING] Requesting permission: ${permissionKey}`);
        
        if (permissionKey === 'location') {
          console.log('[ONBOARDING] Using SYSTEM SETTINGS approach for location permission');
          await openSystemLocationSettings();
          setPermissionStatus(prev => ({ ...prev, [permissionKey]: true }));
          console.log(`[ONBOARDING] System settings opened for ${permissionKey}`);
        } else {
          const granted = await requestPermission(permissionKey);
          console.log(`[ONBOARDING] Permission result for ${permissionKey}: ${granted}`);
          
          if (granted) {
            console.log(`[ONBOARDING] Updating state for ${permissionKey} to true`);
            setPermissionStatus(prev => ({ ...prev, [permissionKey]: true }));
          } else {
            console.log(`[ONBOARDING] Permission denied for ${permissionKey}`);
          }
        }
      } else {
        console.log(`[ONBOARDING] Disabling permission: ${permissionKey}`);
        setPermissionStatus(prev => ({ ...prev, [permissionKey]: false }));
      }
    } catch (error) {
      console.error(`[ONBOARDING] ERROR in permission toggle:`, error);
      throw error;
    } finally {
      functionCompleted = true;
      clearTimeout(crashDetectionTimeout);
      
      setTimeout(() => {
        setPermissionLoading(prev => ({ ...prev, [permissionKey]: false }));
      }, 300);
      
      console.log(`[ONBOARDING] Permission toggle completed: ${permissionKey}`);
    }
  }, [permissionStatus, requestPermission, openSystemLocationSettings]);

  return {
    permissionStatus,
    permissionLoading,
    requestPermission,
    openSystemSettings: openSystemLocationSettings,
    checkAllPermissions,
    handlePermissionToggle,
  };
};