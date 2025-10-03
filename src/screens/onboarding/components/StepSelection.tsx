import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { OnboardingOption } from '../types/onboarding.types';
import Typography from '../../../components/ui/Typography';
import { Colors, Spacing } from '../../../styles/designSystem';
// @ts-ignore - Vector icons without types
import Icon from 'react-native-vector-icons/Ionicons';

interface StepSelectionProps {
  options: OnboardingOption[];
  currentValue: string;
  onSelect: (value: string) => void;
}

export const StepSelection = memo(({ options, currentValue, onSelect }: StepSelectionProps) => {
  return (
    <View style={styles.selectionContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.optionCard,
            currentValue === option.id && styles.optionCardSelected
          ]}
          onPress={() => onSelect(option.id)}
          accessible={true}
          accessibilityLabel={`${option.title} ${option.subtitle} ${option.recommended ? 'Aanbevolen' : ''} ${currentValue === option.id ? 'geselecteerd' : 'niet geselecteerd'}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: currentValue === option.id }}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionIconContainer}>
              <Icon 
                name={option.icon} 
                size={24} 
                color={currentValue === option.id ? Colors.primary[500] : Colors.gray[400]} 
              />
            </View>
            <View style={styles.optionContent}>
              <View style={styles.optionTitleRow}>
                <Typography variant="h6" color={currentValue === option.id ? "primary" : "text.primary"} weight="normal" style={{}}>
                  {option.title}
                </Typography>
                {option.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Typography variant="caption" color="white" weight="normal" style={{}}>
                      Aanbevolen
                    </Typography>
                  </View>
                )}
                {option.badge && (
                  <View style={styles.premiumBadge}>
                    <Typography variant="caption" color="white" weight="normal" style={{}}>
                      {option.badge}
                    </Typography>
                  </View>
                )}
              </View>
              <Typography variant="body2" color="text.secondary" weight="normal" style={{}}>
                {option.subtitle}
              </Typography>
              <Typography variant="caption" color="text.secondary" weight="normal" style={styles.optionDescription}>
                {option.description}
              </Typography>
            </View>
            {currentValue === option.id && (
              <Icon name="checkmark-circle" size={24} color={Colors.primary[500]} />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  selectionContainer: {
    width: '100%',
  },
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.gray[200],
  },
  optionCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  recommendedBadge: {
    backgroundColor: Colors.success[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: Spacing.sm,
  },
  premiumBadge: {
    backgroundColor: Colors.warning[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: Spacing.sm,
  },
  optionDescription: {
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
});