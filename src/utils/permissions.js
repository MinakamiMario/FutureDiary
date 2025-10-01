import { request, check, PERMISSIONS, RESULTS, requestMultiple } from 'react-native-permissions';
import { Alert, Platform } from 'react-native';
// import { request, check, PERMISSIONS, RESULTS } from './mockPermissions';

/**
 * Complete permissions manager for MinakamiApp
 * Handles all required permissions for data collection
 */

// Permission status helper
export const isPermissionGranted = (status) => {
  return status === RESULTS.GRANTED;
};

// Camera permission
export const requestCameraPermission = async () => {
  try {
    const result = await check(PERMISSIONS.ANDROID.CAMERA);
    
    if (result === RESULTS.DENIED) {
      const requestResult = await request(PERMISSIONS.ANDROID.CAMERA);
      return requestResult;
    }
    
    return result;
  } catch (error) {
    console.error('Error checking/requesting camera permission:', error);
    return RESULTS.UNAVAILABLE;
  }
};

// Location permissions (fine and coarse)
export const requestLocationPermissions = async () => {
  try {
    const permissions = [
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION
    ];

    // Check current status
    const statuses = await requestMultiple(permissions);
    
    // Check if background location is needed (Android 10+)
    if (Platform.Version >= 29) {
      const backgroundResult = await check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
      if (backgroundResult === RESULTS.DENIED) {
        Alert.alert(
          'Background Location',
          'Voor continue locatie tracking, geef toestemming voor "Altijd toestaan" in de volgende dialoog.',
          [{ text: 'OK', onPress: async () => {
            await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
          }}]
        );
      }
    }
    
    return statuses;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return { error: error.message };
  }
};

// Call log permission
export const requestCallLogPermission = async () => {
  try {
    const result = await check(PERMISSIONS.ANDROID.READ_CALL_LOG);
    
    if (result === RESULTS.DENIED) {
      return new Promise((resolve) => {
        Alert.alert(
          'Oproep Geschiedenis',
          'Voor het analyseren van je communicatiepatronen hebben we toegang nodig tot je oproepgeschiedenis.',
          [
            { text: 'Weiger', style: 'cancel', onPress: () => resolve(RESULTS.DENIED) },
            { text: 'Toestaan', onPress: async () => {
              const requestResult = await request(PERMISSIONS.ANDROID.READ_CALL_LOG);
              resolve(requestResult);
            }}
          ]
        );
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error requesting call log permission:', error);
    return RESULTS.UNAVAILABLE;
  }
};

// Phone state permission
export const requestPhoneStatePermission = async () => {
  try {
    const result = await check(PERMISSIONS.ANDROID.READ_PHONE_STATE);
    
    if (result === RESULTS.DENIED) {
      const requestResult = await request(PERMISSIONS.ANDROID.READ_PHONE_STATE);
      return requestResult;
    }
    
    return result;
  } catch (error) {
    console.error('Error requesting phone state permission:', error);
    return RESULTS.UNAVAILABLE;
  }
};

// Activity recognition permission
export const requestActivityRecognitionPermission = async () => {
  try {
    if (Platform.Version >= 29) {
      const result = await check(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION);
      
      if (result === RESULTS.DENIED) {
        return new Promise((resolve) => {
          Alert.alert(
            'Activiteit Herkenning',
            'Voor het herkennen van je bewegingsactiviteiten (lopen, fietsen, etc.) hebben we toegang nodig tot de activiteitssensoren.',
            [
              { text: 'Weiger', style: 'cancel', onPress: () => resolve(RESULTS.DENIED) },
              { text: 'Toestaan', onPress: async () => {
                const requestResult = await request(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION);
                resolve(requestResult);
              }}
            ]
          );
        });
      }
      
      return result;
    }
    
    return RESULTS.GRANTED; // Not needed on Android < 10
  } catch (error) {
    console.error('Error requesting activity recognition permission:', error);
    return RESULTS.UNAVAILABLE;
  }
};

// Notification permission (Android 13+)
export const requestNotificationPermission = async () => {
  try {
    if (Platform.Version >= 33) {
      const result = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      
      if (result === RESULTS.DENIED) {
        return new Promise((resolve) => {
          Alert.alert(
            'Notificaties',
            'Voor het ontvangen van dagelijkse samenvattingen en herinneringen hebben we toestemming nodig voor notificaties.',
            [
              { text: 'Weiger', style: 'cancel', onPress: () => resolve(RESULTS.DENIED) },
              { text: 'Toestaan', onPress: async () => {
                const requestResult = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
                resolve(requestResult);
              }}
            ]
          );
        });
      }
      
      return result;
    }
    
    return RESULTS.GRANTED; // Not needed on Android < 13
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return RESULTS.UNAVAILABLE;
  }
};

// Body sensors permission (for health data)
export const requestBodySensorsPermission = async () => {
  try {
    const result = await check(PERMISSIONS.ANDROID.BODY_SENSORS);
    
    if (result === RESULTS.DENIED) {
      return new Promise((resolve) => {
        Alert.alert(
          'Lichaamssensoren',
          'Voor het verzamelen van gezondheidsdata zoals hartslag hebben we toegang nodig tot de lichaamssensoren.',
          [
            { text: 'Weiger', style: 'cancel', onPress: () => resolve(RESULTS.DENIED) },
            { text: 'Toestaan', onPress: async () => {
              const requestResult = await request(PERMISSIONS.ANDROID.BODY_SENSORS);
              resolve(requestResult);
            }}
          ]
        );
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error requesting body sensors permission:', error);
    return RESULTS.UNAVAILABLE;
  }
};

// Request all core permissions at once
export const requestAllCorePermissions = async () => {
  try {
    console.log('🔐 Requesting all core permissions...');
    
    const corePermissions = [
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
      PERMISSIONS.ANDROID.READ_CALL_LOG,
      PERMISSIONS.ANDROID.READ_PHONE_STATE,
      PERMISSIONS.ANDROID.BODY_SENSORS
    ];

    // Add Android version specific permissions
    if (Platform.Version >= 29) {
      corePermissions.push(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION);
    }

    if (Platform.Version >= 33) {
      corePermissions.push(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
    }

    const results = await requestMultiple(corePermissions);
    
    console.log('🔐 Permission results:', results);
    
    // Request background location separately if foreground location is granted
    if (Platform.Version >= 29 && 
        (results[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.GRANTED || 
         results[PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION] === RESULTS.GRANTED)) {
      
      setTimeout(async () => {
        const backgroundResult = await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
        console.log('🔐 Background location result:', backgroundResult);
      }, 1000);
    }
    
    return results;
  } catch (error) {
    console.error('Error requesting core permissions:', error);
    return { error: error.message };
  }
};

// Check all permissions status
export const checkAllPermissionsStatus = async () => {
  try {
    const permissions = [
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
      PERMISSIONS.ANDROID.READ_CALL_LOG,
      PERMISSIONS.ANDROID.READ_PHONE_STATE,
      PERMISSIONS.ANDROID.BODY_SENSORS
    ];

    if (Platform.Version >= 29) {
      permissions.push(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION);
      permissions.push(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
    }

    if (Platform.Version >= 33) {
      permissions.push(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
    }

    const statuses = {};
    
    for (const permission of permissions) {
      statuses[permission] = await check(permission);
    }
    
    return statuses;
  } catch (error) {
    console.error('Error checking permissions status:', error);
    return { error: error.message };
  }
};

export { PERMISSIONS, RESULTS };