import { request, check, PERMISSIONS, RESULTS, requestMultiple } from 'react-native-permissions';
import { Alert, Platform, Linking } from 'react-native';

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

// Helper functie om gebruiker naar exacte locatie instellingen te sturen
const requestPreciseLocationSettings = async () => {
  return new Promise((resolve) => {
    Alert.alert(
      'Exacte Locatie Vereist',
      'Voor nauwkeurige locatie tracking moet je "Exacte locatie" inschakelen in de instellingen.\n\n' +
      '1. Tik op "Naar Instellingen"\n' +
      '2. Tik op "Locatie"\n' +
      '3. Schakel "Gebruik exacte locatie" in\n' +
      '4. Keer terug naar de app',
      [
        { 
          text: 'Naar Instellingen', 
          onPress: async () => {
            try {
              // Open de app-specifieke instellingen
              await Linking.openSettings();
              resolve(true);
            } catch (error) {
              console.error('Error opening settings:', error);
              resolve(false);
            }
          }
        },
        { 
          text: 'Overslaan', 
          style: 'cancel',
          onPress: () => resolve(false)
        }
      ],
      { cancelable: false }
    );
  });
};

// SUPER SAFE location permission - speciaal voor onboarding grijze scherm probleem
export const requestLocationPermissionsSafe = async () => {
  console.log('[PERMISSIONS] Starting SAFE location permission request');
  
  try {
    // Stap 1: Check huidige status
    const fineLocationResult = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    const coarseLocationResult = await check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION);
    
    console.log(`[PERMISSIONS] Current status - Fine: ${fineLocationResult}, Coarse: ${coarseLocationResult}`);
    
    // Als alles al granted is, return direct
    if (fineLocationResult === RESULTS.GRANTED || coarseLocationResult === RESULTS.GRANTED) {
      console.log('[PERMISSIONS] Location permission already granted');
      return { 
        [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]: fineLocationResult,
        [PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION]: coarseLocationResult
      };
    }
    
    // Stap 2: Gebruik requestMultiple voor atomische permission requests
    console.log('[PERMISSIONS] Requesting both location permissions simultaneously');
    
    // Wacht even voordat we het systeem UI laten verschijnen - voorkomt race conditions
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const results = await requestMultiple([
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION
    ]);
    
    console.log('[PERMISSIONS] Location permission results:', results);
    
    // Wacht even na permission request - laat systeem UI weer verdwijnen
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return results;
    
  } catch (error) {
    console.error('[PERMISSIONS] CRITICAL ERROR in safe location permission:', error);
    
    // Return een safe fallback
    return {
      [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]: RESULTS.DENIED,
      [PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION]: RESULTS.DENIED
    };
  }
};

// Location permissions (fine and coarse) - met exacte locatie ondersteuning
export const requestLocationPermissions = async () => {
  try {
    console.log('📍 Requesting location permissions...');
    
    const permissions = [
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION
    ];

    // Vraag eerst de basis locatie permissies
    const statuses = await requestMultiple(permissions);
    console.log('📍 Basis locatie permissies:', statuses);
    
    // Controleer of fine location is toegestaan
    const fineLocationStatus = statuses[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION];
    
    if (fineLocationStatus === RESULTS.GRANTED) {
      // Voor Android 12+ (API 31+), controleer of exacte locatie is ingeschakeld
      if (Platform.Version >= 31) {
        // Wacht even zodat de gebruiker de eerste prompt kan verwerken
        setTimeout(async () => {
          const shouldShowPreciseLocationPrompt = await requestPreciseLocationSettings();
          console.log('📍 Exacte locatie prompt resultaat:', shouldShowPreciseLocationPrompt);
        }, 2000);
      }
      
      // Vraag om achtergrond locatie (Android 10+)
      if (Platform.Version >= 29) {
        setTimeout(async () => {
          const backgroundResult = await check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
          console.log('📍 Achtergrond locatie status:', backgroundResult);
          
          if (backgroundResult === RESULTS.DENIED) {
            Alert.alert(
              'Achtergrond Locatie',
              'Voor continue locatie tracking, geef toestemming voor "Altijd toestaan" in de volgende dialoog.',
              [{ text: 'OK', onPress: async () => {
                const bgResult = await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
                console.log('📍 Achtergrond locatie resultaat:', bgResult);
              }}]
            );
          }
        }, 3000);
      }
    }
    
    return statuses;
  } catch (error) {
    console.error('📍 Error requesting location permissions:', error);
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

// Notification permission (Android 13+) - SAFE VERSION zonder Alert
export const requestNotificationPermission = async () => {
  try {
    if (Platform.Version >= 33) {
      const result = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      
      if (result === RESULTS.DENIED) {
        console.log('[PERMISSIONS] Requesting notification permission without Alert');
        const requestResult = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
        console.log(`[PERMISSIONS] Notification permission result: ${requestResult}`);
        return requestResult;
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