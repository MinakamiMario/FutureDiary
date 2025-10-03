import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Typography from '../../../components/ui/Typography';
import Button from '../../../components/ui/Button';
import { Colors, Spacing } from '../../../styles/designSystem';
// @ts-ignore - Vector icons without types
import Icon from 'react-native-vector-icons/Ionicons';

interface OnboardingNavigationProps {
  currentStep: number;
  totalSteps: number;
  isLastStep: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  canGoBack: boolean;
}

export const OnboardingNavigation = memo(({
  currentStep,
  totalSteps,
  isLastStep,
  isLoading,
  onPrevious,
  onNext,
  canGoBack
}: OnboardingNavigationProps) => {
  return (
    <View style={styles.navigation}>
      {/* Progress Bar */}
      <View style={styles.progressContainer} accessible={true} accessibilityLabel={`Stap ${currentStep + 1} van ${totalSteps}`}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentStep + 1) / totalSteps) * 100}%` }
            ]} 
          />
        </View>
        <Typography variant="caption" color="text.secondary" style={styles.progressText}>
          Stap {currentStep + 1} van {totalSteps}
        </Typography>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        {canGoBack ? (
          <Button
            title="Vorige"
            variant="outline"
            size="medium"
            leftIcon={<Icon name="arrow-back" size={20} color={Colors.primary[500]} />}
            onPress={onPrevious}
            style={styles.backButton}
            accessible={true}
            accessibilityLabel="Vorige stap"
            accessibilityHint="Ga terug naar de vorige stap in de onboarding"
          />
        ) : <View style={styles.backButton} />}

        <Button
          title={isLastStep ? (isLoading ? "Bezig..." : "Voltooien") : "Volgende"}
          variant="primary"
          size="large"
          rightIcon={!isLastStep ? <Icon name="arrow-forward" size={20} color="white" /> : null}
          onPress={onNext}
          disabled={isLoading}
          loading={isLoading}
          style={styles.nextButton}
          accessible={true}
          accessibilityLabel={isLastStep ? "Voltooi onboarding" : "Volgende stap"}
          accessibilityHint={isLastStep ? "Voltooi de onboarding en ga naar de hoofdapp" : "Ga naar de volgende stap"}
        />
      </View>

      {/* Privacy Notice */}
      <View style={styles.privacyNotice}>
        <Icon name="shield-checkmark-outline" size={16} color={Colors.success[500]} />
        <Typography variant="caption" color="text.secondary" style={styles.privacyText}>
          Je gegevens blijven veilig op je telefoon en worden nooit gedeeld
        </Typography>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  navigation: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary[500],
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  progressText: {
    textAlign: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    flex: 0.3,
  },
  nextButton: {
    flex: 0.6,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  privacyText: {
    marginLeft: Spacing.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
});