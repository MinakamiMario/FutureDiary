// mockPermissions.js - Temporary mock for react-native-permissions in Expo Go
// This will be removed when using development build

export const PERMISSIONS = {
  ANDROID: {
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    ACCESS_BACKGROUND_LOCATION: 'android.permission.ACCESS_BACKGROUND_LOCATION',
    READ_CALL_LOG: 'android.permission.READ_CALL_LOG',
    ACTIVITY_RECOGNITION: 'android.permission.ACTIVITY_RECOGNITION'
  },
  IOS: {
    LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    LOCATION_ALWAYS: 'ios.permission.LOCATION_ALWAYS',
    MOTION: 'ios.permission.MOTION'
  }
};

export const RESULTS = {
  UNAVAILABLE: 'unavailable',
  BLOCKED: 'blocked',  
  DENIED: 'denied',
  GRANTED: 'granted',
  LIMITED: 'limited'
};

export const request = async (permission) => {
  if (__DEV__) console.warn(`Mock permissions: Requesting ${permission} - returning GRANTED`);
  return RESULTS.GRANTED;
};

export const check = async (permission) => {
  if (__DEV__) console.warn(`Mock permissions: Checking ${permission} - returning GRANTED`);
  return RESULTS.GRANTED;
};

export const requestMultiple = async (permissions) => {
  if (__DEV__) console.warn(`Mock permissions: Requesting multiple permissions - returning all GRANTED`);
  const result = {};
  permissions.forEach(permission => {
    result[permission] = RESULTS.GRANTED;
  });
  return result;
};

export default {
  PERMISSIONS,
  RESULTS,
  request,
  check,
  requestMultiple
};