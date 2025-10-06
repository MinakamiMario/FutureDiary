import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingStep as StepType } from '../types/onboarding.types';
import Typography from '../../../components/ui/Typography';
import Card from '../../../components/ui/Card';
import { Colors, Spacing } from '../../../styles/designSystem';
// @ts-ignore - Vector icons without types
import Icon from 'react-native-vector-icons/Ionicons';

interface OnboardingStepProps {
  step: StepType;
  currentStep: number;
  totalSteps: number;
}

export const OnboardingStep = memo(({ step, currentStep, totalSteps }: OnboardingStepProps) => {
  // Debug logging for gray screen issue
  if (__DEV__) {
    console.log('🔍 OnboardingStep rendering:', {
      stepId: step.id,
      stepTitle: step.title,
      stepType: step.type,
      currentStep,
      totalSteps
    });
  }
  
  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepIconContainer}>
        <View style={[styles.stepIcon, { backgroundColor: `${step.iconColor || Colors.primary[500]}20` }]}>
          <Icon 
            name={step.icon} 
            size={48} 
            color={step.iconColor || Colors.primary[500]} 
            onError={(error) => {
              if (__DEV__) {
                console.error('🚨 Icon failed to load:', step.icon, error);
              }
            }}
          />
        </View>
      </View>

      <Typography variant="h3" color="text.primary" weight="bold" style={styles.stepTitle}>
        {step.title}
      </Typography>

      <Typography variant="h6" color="text.secondary" weight="normal" style={styles.stepSubtitle}>
        {step.subtitle}
      </Typography>

      <Typography variant="body1" color="text.secondary" weight="normal" style={styles.stepDescription}>
        {step.description}
      </Typography>

      {/* Step counter for accessibility */}
      <View style={styles.stepCounter} accessible={true} accessibilityLabel={`Stap ${currentStep + 1} van ${totalSteps}`}>
        <Typography variant="caption" color="text.secondary" weight="normal" style={{}}>
          {currentStep + 1} / {totalSteps}
        </Typography>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  stepCard: {
    marginVertical: Spacing.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  stepIconContainer: {
    marginBottom: Spacing.lg,
  },
  stepIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  stepDescription: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  stepCounter: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.gray[100],
    borderRadius: 12,
  },
});