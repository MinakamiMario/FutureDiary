// src/components/ui/Card.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../styles/designSystem';
import { useTheme } from '../../utils/themeContext';

const Card = ({ 
  children, 
  variant = 'default',
  padding = 'md',
  shadow = 'md',
  style,
  ...props 
}) => {
  const theme = useTheme();
  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevated;
      case 'outlined':
        return styles.outlined;
      case 'filled':
        return styles.filled;
      default:
        return styles.default;
    }
  };

  const getPaddingStyle = () => {
    switch (padding) {
      case 'xs':
        return styles.paddingXs;
      case 'sm':
        return styles.paddingSm;
      case 'md':
        return styles.paddingMd;
      case 'lg':
        return styles.paddingLg;
      case 'xl':
        return styles.paddingXl;
      default:
        return styles.paddingMd;
    }
  };

  const getShadowStyle = () => {
    switch (shadow) {
      case 'none':
        return styles.shadowNone;
      case 'sm':
        return styles.shadowSm;
      case 'md':
        return styles.shadowMd;
      case 'lg':
        return styles.shadowLg;
      case 'xl':
        return styles.shadowXl;
      default:
        return styles.shadowMd;
    }
  };

  return (
    <View
      style={[
        styles.base,
        getVariantStyle(),
        getPaddingStyle(),
        getShadowStyle(),
        { backgroundColor: theme.colors.background.card },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
  },
  default: {
    // backgroundColor will be set dynamically by theme
  },
  elevated: {
    // backgroundColor will be set dynamically by theme
  },
  outlined: {
    // backgroundColor and borderColor will be set dynamically by theme
    borderWidth: 1,
  },
  filled: {
    // backgroundColor will be set dynamically by theme
  },
  paddingXs: {
    padding: Spacing.xs,
  },
  paddingSm: {
    padding: Spacing.sm,
  },
  paddingMd: {
    padding: Spacing.md,
  },
  paddingLg: {
    padding: Spacing.lg,
  },
  paddingXl: {
    padding: Spacing.xl,
  },
  shadowNone: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  shadowSm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  shadowLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  shadowXl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
});

export default Card;