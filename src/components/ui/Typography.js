// src/components/ui/Typography.js
import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { Typography as DesignTypography, Colors } from '../../styles/designSystem';
import { useTheme } from '../../utils/themeContext';

const Typography = ({ 
  children, 
  variant = 'body1', 
  color = 'text.primary',
  align = 'left',
  weight,
  style,
  ...props 
}) => {
  const theme = useTheme();
  
  // Debug logging for gray screen issue
  if (__DEV__) {
    if (!theme) {
      console.error('🚨 Typography: theme is null/undefined');
    }
    if (!theme?.text) {
      console.error('🚨 Typography: theme.text is missing');
    }
  }
  const getVariantStyle = () => {
    switch (variant) {
      case 'h1':
        return DesignTypography.display.large;
      case 'h2':
        return DesignTypography.display.medium;
      case 'h3':
        return DesignTypography.display.small;
      case 'h4':
        return DesignTypography.headline.large;
      case 'h5':
        return DesignTypography.headline.medium;
      case 'h6':
        return DesignTypography.headline.small;
      case 'subtitle1':
        return DesignTypography.title.large;
      case 'subtitle2':
        return DesignTypography.title.medium;
      case 'body1':
        return DesignTypography.body.large;
      case 'body2':
        return DesignTypography.body.medium;
      case 'caption':
        return DesignTypography.body.small;
      case 'button':
        return DesignTypography.label.large;
      case 'overline':
        return DesignTypography.label.small;
      default:
        return DesignTypography.body.medium;
    }
  };

  const getColorStyle = () => {
    // Fallback colors if theme is not available
    const fallbackColors = {
      'text.primary': '#1A1A1A',
      'text.secondary': '#757575',
      'text.tertiary': '#A3A3A3',
      'text.disabled': '#BABABA',
      'text.inverse': '#FFFFFF',
      'primary': '#0087FF',
      'secondary': '#FF8C8C',
      'error': '#FF0000',
      'success': '#008C00',
      'warning': '#FFB400',
      'info': '#2196F3'
    };
    
    if (!theme) {
      console.warn('🟡 Typography: Using fallback colors due to missing theme');
      return fallbackColors[color] || color || '#1A1A1A';
    }
    
    switch (color) {
      case 'text.primary':
        return theme.text?.primary || fallbackColors['text.primary'];
      case 'text.secondary':
        return theme.text?.secondary || fallbackColors['text.secondary'];
      case 'text.tertiary':
        return theme.text?.tertiary || fallbackColors['text.tertiary'];
      case 'text.disabled':
        return theme.text?.disabled || fallbackColors['text.disabled'];
      case 'text.inverse':
        return theme.text?.inverse || fallbackColors['text.inverse'];
      case 'primary':
        return theme.primary || fallbackColors['primary'];
      case 'secondary':
        return theme.secondary || fallbackColors['secondary'];
      case 'error':
        return theme.error || fallbackColors['error'];
      case 'success':
        return theme.success || fallbackColors['success'];
      case 'warning':
        return theme.warning || fallbackColors['warning'];
      case 'info':
        return theme.info || fallbackColors['info'];
      default:
        return color;
    }
  };

  const getAlignStyle = () => {
    switch (align) {
      case 'left':
        return styles.left;
      case 'center':
        return styles.center;
      case 'right':
        return styles.right;
      case 'justify':
        return styles.justify;
      default:
        return styles.left;
    }
  };

  const getWeightStyle = () => {
    if (weight) {
      return { fontWeight: weight };
    }
    return {};
  };

  const getFontFamily = () => {
    // Gebruik System font om Chinese fallback te voorkomen
    return Platform.select({
      ios: 'System',
      android: 'sans-serif-medium', // Roboto equivalent
      default: 'System'
    });
  };

  return (
    <Text
      style={[
        getVariantStyle(),
        { color: getColorStyle() },
        getAlignStyle(),
        getWeightStyle(),
        { fontFamily: getFontFamily() }, // Voorkom Chinese fallback
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  left: {
    textAlign: 'left',
  },
  center: {
    textAlign: 'center',
  },
  right: {
    textAlign: 'right',
  },
  justify: {
    textAlign: 'justify',
  },
});

export default Typography;