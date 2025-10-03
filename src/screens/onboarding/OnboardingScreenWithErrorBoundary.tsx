import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../styles/designSystem';
import OnboardingScreen from './OnboardingScreen';
import { OnboardingErrorBoundary } from './components/OnboardingErrorBoundary';
import { useOnboardingState } from './hooks/useOnboardingState';

interface OnboardingScreenWithErrorBoundaryProps {
  onComplete?: () => void;
}

const OnboardingScreenWithErrorBoundary = ({ onComplete }: OnboardingScreenWithErrorBoundaryProps) => {
  const { resetOnboarding } = useOnboardingState();

  const handleErrorReset = () => {
    // Reset the entire onboarding state when an error occurs
    resetOnboarding();
  };

  return (
    <View style={styles.container}>
      <OnboardingErrorBoundary onReset={handleErrorReset}>
        <OnboardingScreen onComplete={onComplete} />
      </OnboardingErrorBoundary>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
});

export default OnboardingScreenWithErrorBoundary;