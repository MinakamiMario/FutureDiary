// src/components/ui/Button.js
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Typography, BorderRadius, Spacing } from '../../styles/designSystem';
import { useTheme } from '../../utils/themeContext';

const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  ...props 
}) => {
  const theme = useTheme();
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.primary, { backgroundColor: theme.primary, borderColor: theme.primary }];
      case 'secondary':
        return [styles.secondary, { backgroundColor: theme.secondary, borderColor: theme.secondary }];
      case 'outline':
        return [styles.outline, { borderColor: theme.primary }];
      case 'ghost':
        return styles.ghost;
      case 'danger':
        return [styles.danger, { backgroundColor: theme.error, borderColor: theme.error }];
      default:
        return [styles.primary, { backgroundColor: theme.primary, borderColor: theme.primary }];
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'medium':
        return styles.medium;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getTextVariantStyle = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return { color: theme.onPrimary };
      case 'secondary':
        return { color: theme.onSecondary };
      case 'outline':
        return { color: theme.primary };
      case 'ghost':
        return { color: theme.primary };
      default:
        return { color: theme.onPrimary };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' || variant === 'secondary' ? theme.onPrimary : theme.primary} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.text, getTextVariantStyle(), textStyle, { fontFamily: Typography.fontFamily.primary }]}>
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    ...Typography.label.large,
  },
  primary: {
    // Dynamic colors applied via getVariantStyle()
  },
  secondary: {
    // Dynamic colors applied via getVariantStyle()
  },
  outline: {
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    // Dynamic colors applied via getVariantStyle()
  },
  small: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 32,
  },
  medium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  text: {
    textAlign: 'center',
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Button;