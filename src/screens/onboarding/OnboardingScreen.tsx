import React, { memo, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Platform } from 'react-native';
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

  // Emergency mode detection and recovery
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

  // Emergency mode effect
  useEffect(() => {
    if (!isEmergencyMode) {
      const timer = setTimeout(() => {
        // Check if UI is responsive by monitoring render time
        const timeSinceLastRender = Date.now() - lastRenderTime;
        if (timeSinceLastRender > 30000) { // 30 seconds
          triggerEmergencyMode();
        }
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [isEmergencyMode, lastRenderTime, triggerEmergencyMode]);

  // Handle step completion and navigation
  const handleNext = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Validate current step before proceeding
      if (currentStepData.type === 'permission') {
        const allPermissionsGranted = await checkAllPermissions();
        if (!allPermissionsGranted && currentStepData.required) {
          console.warn('Required permissions not granted');
          setIsLoading(false);
          return;
        }
      }

      if (isLastStep) {
        // Complete onboarding
        console.log('Onboarding completed:', userData);

        // Call onComplete callback if provided
        if (onComplete) {
          onComplete();
        }
        return;
      }

      // Proceed to next step
      setCurrentStep(currentStep + 1);
      
    } catch (error) {
      console.error('Error navigating to next step:', error);
      triggerEmergencyMode();
    } finally {
      setIsLoading(false);
    }
  }, [currentStep, isLastStep, currentStepData, isLoading, userData, setCurrentStep, setIsLoading, checkAllPermissions, triggerEmergencyMode, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, setCurrentStep]);

  // Handle option selection
  const handleOptionSelect = useCallback((value: string) => {
    if (currentStepData.key) {
      const newData = {
        ...userData,
        [currentStepData.key]: value
      };
      (setUserData as any)(newData);
    }
  }, [userData, currentStepData.key, setUserData]);

  // Handle permission toggle
  const handlePermissionToggleLocal = useCallback(async (permissionKey: string) => {
    try {
      setIsLoading(true);
      await handlePermissionToggle(permissionKey);
    } catch (error) {
      console.error('Error toggling permission:', error);
      triggerEmergencyMode();
    } finally {
      setIsLoading(false);
    }
  }, [handlePermissionToggle, setIsLoading, triggerEmergencyMode]);

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

  // Render different step types
  const renderStepContent = () => {
    switch (currentStepData.type) {
      case 'selection':
        return (
          <StepSelection
            options={currentStepData.options || []}
            currentValue={currentStepData.key ? (userData as any)[currentStepData.key] || '' : ''}
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
  };

  // Emergency mode rendering
  if (isEmergencyMode) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentContainer}>
          {renderStepContent()}
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