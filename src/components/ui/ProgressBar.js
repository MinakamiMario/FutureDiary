// src/components/ui/ProgressBar.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BorderRadius } from '../../styles/designSystem';
import { useTheme } from '../../utils/themeContext';

const ProgressBar = ({ 
  progress, 
  color = 'primary',
  backgroundColor = null,
  height = 8,
  borderRadius = BorderRadius.full,
  style,
  animated = true,
  ...props 
}) => {
  const theme = useTheme();

  const getColor = () => {
    switch (color) {
      case 'primary':
        return theme.primary;
      case 'secondary':
        return theme.secondary;
      case 'success':
        return theme.success;
      case 'warning':
        return theme.warning;
      case 'error':
        return theme.error;
      default:
        return color;
    }
  };

  const getBackgroundColor = () => {
    return backgroundColor || theme.surfaceVariant;
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View 
      style={[
        styles.container,
        { 
          height, 
          backgroundColor: getBackgroundColor(), 
          borderRadius,
        },
        style,
      ]}
      {...props}
    >
      <View 
        style={[
          styles.progress,
          { 
            width: `${clampedProgress}%`, 
            backgroundColor: getColor(),
            borderRadius,
          },
          animated && styles.animated,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
  },
  progress: {
    height: '100%',
  },
  animated: {
    transitionProperty: 'width',
    transitionDuration: '0.3s',
    transitionTimingFunction: 'ease-out',
  },
});

export default ProgressBar;