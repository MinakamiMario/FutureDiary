// onboardingTestUtils.js - Runtime onboarding testing utilities
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Reset onboarding to show onboarding screen again
 */
export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem('onboarding_completed');
    console.log('✅ Onboarding reset - app will show onboarding on next restart');
    return true;
  } catch (error) {
    console.error('❌ Error resetting onboarding:', error);
    return false;
  }
};

/**
 * Mark onboarding as completed to skip to main app
 */
export const completeOnboarding = async () => {
  try {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    console.log('✅ Onboarding marked as completed - app will skip onboarding on next restart');
    return true;
  } catch (error) {
    console.error('❌ Error completing onboarding:', error);
    return false;
  }
};

/**
 * Check current onboarding status
 */
export const checkOnboardingStatus = async () => {
  try {
    const status = await AsyncStorage.getItem('onboarding_completed');
    const isCompleted = status === 'true';
    console.log(`📋 Onboarding status: ${isCompleted ? 'Completed (shows main app)' : 'Not completed (shows onboarding)'}`);
    return isCompleted;
  } catch (error) {
    console.error('❌ Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Debug all onboarding related storage
 */
export const debugOnboardingStorage = async () => {
  try {
    console.log('🔍 Debugging Onboarding Storage:');
    
    // Check all onboarding related keys
    const keys = [
      'onboarding_completed',
      'app_settings',
      'narrativeStyle',
      'preferred_ai_model'
    ];
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`   ${key}: ${value || 'null'}`);
    }
    
    // Check all stored keys
    const allKeys = await AsyncStorage.getAllKeys();
    const onboardingKeys = allKeys.filter(key => 
      key.includes('onboarding') || 
      key.includes('setting') || 
      key.includes('narrative') ||
      key.includes('ai_model')
    );
    
    console.log('   Related keys found:', onboardingKeys);
    
  } catch (error) {
    console.error('❌ Error debugging storage:', error);
  }
};

/**
 * Add these to window for easy access in React Native debugger
 */
if (__DEV__ && typeof global !== 'undefined') {
  global.resetOnboarding = resetOnboarding;
  global.completeOnboarding = completeOnboarding;
  global.checkOnboardingStatus = checkOnboardingStatus;
  global.debugOnboardingStorage = debugOnboardingStorage;
  
  console.log('🧪 Onboarding test utils available globally:');
  console.log('   - global.resetOnboarding()');
  console.log('   - global.completeOnboarding()');
  console.log('   - global.checkOnboardingStatus()');
  console.log('   - global.debugOnboardingStorage()');
}

export default {
  resetOnboarding,
  completeOnboarding,
  checkOnboardingStatus,
  debugOnboardingStorage
};