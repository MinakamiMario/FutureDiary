import React, { memo, useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Platform, Alert, useColorScheme } from 'react-native';
import { Colors, Spacing } from '../../styles/designSystem';
import { useOnboardingState } from './hooks/useOnboardingState';
import { usePermissionHandler } from './hooks/usePermissionHandler';
import { useEmergencyMode } from './hooks/useEmergencyMode';
import { OnboardingStep } from './components/OnboardingStep';
import { StepSelection } from './components/StepSelection';
import { PermissionToggle } from './components/PermissionToggle';
import { OnboardingNavigation } from './components/OnboardingNavigation';
import { EmergencyMode } from './components/EmergencyMode';
import { ONBOARDING_STEPS } from './config/onboardingConfig';

interface OnboardingScreenProps {
  onComplete?: () => void;
}

const OnboardingScreen = memo(({ onComplete }: OnboardingScreenProps) => {
  // Track mounted state for cleanup
  const isMounted = useRef(true);

  // Centralized state management
  const {
    currentStep,
    userData,
    isLoading,
    setCurrentStep,
    setUserData,
    setIsLoading,
    resetOnboarding
  } = useOnboardingState();

  // Permission handling with system settings fallback
  const {
    permissionStatus,
    permissionLoading,
    handlePermissionToggle,
    checkAllPermissions,
    openSystemSettings
  } = usePermissionHandler();

  // Emergency mode detection and recovery (ONLY for critical crashes)
  const {
    isEmergencyMode,
    lastRenderTime,
    triggerEmergencyMode,
    recoverFromEmergency,
    skipOnboarding
  } = useEmergencyMode();

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const totalSteps = ONBOARDING_STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;

  // Get color scheme for dynamic StatusBar
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle step completion and navigation
  const handleNext = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Validate current step before proceeding
      if (currentStepData.type === 'permission') {
        const allPermissionsGranted = await checkAllPermissions();

        if (!allPermissionsGranted && currentStepData.required) {
          // Show user-friendly alert instead of silent console.warn
          Alert.alert(
            'Permissies Vereist',
            'Deze permissies zijn nodig om verder te gaan. Open instellingen om ze toe te staan.',
            [
              { text: 'Annuleren', style: 'cancel' },
              { text: 'Open Instellingen', onPress: openSystemSettings }
            ]
          );

          if (isMounted.current) {
            setIsLoading(false);
          }
          return;
        }
      }

      if (isLastStep) {
        // Complete onboarding
        console.log('Onboarding completed:', userData);

        // Call onComplete callback if provided (await if async)
        if (onComplete) {
          await Promise.resolve(onComplete());
        }

        // Fall through to finally block to ensure loading state is reset
      } else {
        // Proceed to next step
        if (isMounted.current) {
          setCurrentStep(currentStep + 1);
        }
      }

    } catch (error) {
      console.error('Error navigating to next step:', error);

      // Show user-friendly error instead of emergency mode for normal errors
      Alert.alert('Oeps', 'Er ging iets mis. Probeer opnieuw.');

      // Only trigger emergency mode for CRITICAL errors (network timeout, app freeze, etc)
      // Normal navigation errors should NOT trigger emergency mode
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [currentStep, isLastStep, currentStepData, isLoading, userData, setCurrentStep, setIsLoading, checkAllPermissions, onComplete, openSystemSettings]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, setCurrentStep]);

  // Handle option selection with proper typing (NO 'any' casts!)
  const handleOptionSelect = useCallback((value: string) => {
    if (currentStepData.key) {
      // setUserData accepts both key-value and object format
      setUserData(currentStepData.key, value);
    }
  }, [currentStepData.key, setUserData]);

  // Handle permission toggle with per-permission loading state
  const handlePermissionToggleLocal = useCallback(async (permissionKey: string) => {
    // Prevent concurrent toggles on same permission
    if (permissionLoading[permissionKey]) return;

    try {
      await handlePermissionToggle(permissionKey);
    } catch (error) {
      console.error('Error toggling permission:', error);

      // Show user-friendly error instead of emergency mode
      Alert.alert('Oeps', 'Kon permissie niet wijzigen. Probeer opnieuw.');

      // Permission toggle errors are NORMAL - don't trigger emergency mode
    }
  }, [handlePermissionToggle, permissionLoading]);

  // Emergency recovery handlers
  const handleEmergencyRecovery = useCallback(() => {
    recoverFromEmergency();
    resetOnboarding(); // Reset to clean state
  }, [recoverFromEmergency, resetOnboarding]);

  const handleEmergencySkip = useCallback(() => {
    skipOnboarding();
    // Navigate to main app via onComplete callback
    if (onComplete) {
      onComplete();
    }
  }, [skipOnboarding, onComplete]);

  // Memoize step content rendering for performance
  const renderStepContent = useMemo(() => {
    switch (currentStepData.type) {
      case 'selection':
        // Get current value without type casting (userData has index signature)
        const selectionValue = currentStepData.key && currentStepData.key in userData
          ? String(userData[currentStepData.key])
          : '';

        return (
          <StepSelection
            options={currentStepData.options || []}
            currentValue={selectionValue}
            onSelect={handleOptionSelect}
          />
        );

      case 'permission':
        return (
          <View style={styles.permissionsContainer}>
            {currentStepData.permissions?.map((permission) => (
              <PermissionToggle
                key={permission.permission}
                permission={permission}
                isEnabled={permissionStatus[permission.permission] || false}
                isLoading={permissionLoading[permission.permission] || false}
                onToggle={() => handlePermissionToggleLocal(permission.permission)}
              />
            ))}
          </View>
        );

      case 'info':
      default:
        return (
          <OnboardingStep
            step={currentStepData}
            currentStep={currentStep}
            totalSteps={totalSteps}
          />
        );
    }
  }, [currentStepData, userData, permissionStatus, handleOptionSelect, handlePermissionToggleLocal, permissionLoading, currentStep, totalSteps]);

  // Emergency mode rendering (ONLY for critical crashes, not normal errors)
  if (isEmergencyMode) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={Colors.background.primary} />
        <EmergencyMode
          lastRenderTime={lastRenderTime}
          onRecovery={handleEmergencyRecovery}
          onSkip={handleEmergencySkip}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={Colors.background.primary} />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentContainer}>
          {renderStepContent}
        </View>
      </ScrollView>

      {/* Navigation */}
      <OnboardingNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        isLastStep={isLastStep}
        isLoading={isLoading}
        onPrevious={handlePrevious}
        onNext={handleNext}
        canGoBack={currentStep > 0}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  permissionsContainer: {
    width: '100%',
    marginTop: Spacing.md,
  },
});

export default OnboardingScreen;
