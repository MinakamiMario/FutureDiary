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
    switch (color) {
      case 'text.primary':
        return theme.text.primary;
      case 'text.secondary':
        return theme.text.secondary;
      case 'text.tertiary':
        return theme.text.tertiary;
      case 'text.disabled':
        return theme.text.disabled;
      case 'text.inverse':
        return theme.text.inverse;
      case 'primary':
        return theme.primary;
      case 'secondary':
        return theme.secondary;
      case 'error':
        return theme.error;
      case 'success':
        return theme.success;
      case 'warning':
        return theme.warning;
      case 'info':
        return theme.info;
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