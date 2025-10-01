// reset-onboarding.js - Test script om onboarding te resetten
import AsyncStorage from '@react-native-async-storage/async-storage';

export const resetOnboardingForTesting = async () => {
  try {
    await AsyncStorage.removeItem('onboarding_completed');
    console.log('✅ Onboarding reset - gebruiker ziet nu onboarding screen');
    return true;
  } catch (error) {
    console.error('❌ Error resetting onboarding:', error);
    return false;
  }
};

export const forceCompleteOnboarding = async () => {
  try {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    console.log('✅ Onboarding marked as completed');
    return true;
  } catch (error) {
    console.error('❌ Error completing onboarding:', error);
    return false;
  }
};

// For testing purposes, uncomment one of these:
// resetOnboardingForTesting(); // Show onboarding
// forceCompleteOnboarding();   // Skip onboarding
