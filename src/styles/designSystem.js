// src/styles/designSystem.js
import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Safe Colors that can be used immediately
export const Colors = {
  primary: {
    50: '#E8F2FF',
    100: '#CCE7FF',
    200: '#99CFFF',
    300: '#66B7FF',
    400: '#339FFF',
    500: '#0087FF',
    600: '#0066CC',
    700: '#004C99',
    800: '#003366',
    900: '#001933',
  },
  secondary: {
    50: '#FFF5F5',
    100: '#FFE8E8',
    200: '#FFD1D1',
    300: '#FFBABA',
    400: '#FFA3A3',
    500: '#FF8C8C',
    600: '#CC7070',
    700: '#995454',
    800: '#663838',
    900: '#331C1C',
  },
  success: {
    50: '#E8F5E8',
    100: '#CCE8CC',
    200: '#99D199',
    300: '#66BA66',
    400: '#33A333',
    500: '#008C00',
    600: '#006600',
    700: '#004C00',
    800: '#003300',
    900: '#001900',
  },
  warning: {
    50: '#FFF8E8',
    100: '#FFF0CC',
    200: '#FFE199',
    300: '#FFD266',
    400: '#FFC333',
    500: '#FFB400',
    600: '#CC8F00',
    700: '#996B00',
    800: '#664700',
    900: '#332300',
  },
  error: {
    50: '#FFE8E8',
    100: '#FFC3C3',
    200: '#FF8787',
    300: '#FF4B4B',
    400: '#FF2D2D',
    500: '#FF0000',
    600: '#CC0000',
    700: '#990000',
    800: '#660000',
    900: '#330000',
  },
  info: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E8E8E8',
    300: '#D1D1D1',
    400: '#BABABA',
    500: '#A3A3A3',
    600: '#8C8C8C',
    700: '#757575',
    800: '#4A4A4A',
    900: '#1A1A1A',
  },
  white: '#FFFFFF',
  black: '#000000',
  // Accent colors for highlights and special elements
  accent: {
    50: '#F3E5F5',
    100: '#E1BEE7',
    200: '#CE93D8',
    300: '#BA68C8',
    400: '#AB47BC',
    500: '#9C27B0',
    600: '#8E24AA',
    700: '#7B1FA2',
    800: '#6A1B9A',
    900: '#4A148C',
  },
  // Background colors for consistent app theming
  background: {
    primary: '#FAFAFA',   // Gray-50 for main backgrounds
    secondary: '#FFFFFF', // White for cards and surfaces
    tertiary: '#F5F5F5',  // Gray-100 for subtle backgrounds
  },
};


// Enhanced Typography with dark mode optimizations
export const Typography = {
  // Default font families for consistent rendering
  fontFamily: {
    primary: 'System',  // iOS: San Francisco, Android: Roboto
    secondary: 'System',
    monospace: 'monospace',
  },
  display: {
    large: {
      fontSize: 57,
      lineHeight: 64,
      fontWeight: '400',
      letterSpacing: -0.25,
    },
    medium: {
      fontSize: 45,
      lineHeight: 52,
      fontWeight: '400',
      letterSpacing: 0,
    },
    small: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '400',
      letterSpacing: 0,
    },
  },
  headline: {
    large: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '400',
      letterSpacing: 0,
    },
    medium: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '400',
      letterSpacing: 0,
    },
    small: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '400',
      letterSpacing: 0,
    },
  },
  title: {
    large: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '400',
      letterSpacing: 0,
    },
    medium: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500',
      letterSpacing: 0.15,
    },
    small: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
  },
  body: {
    large: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0.5,
    },
    medium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      letterSpacing: 0.25,
    },
    small: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
      letterSpacing: 0.4,
    },
  },
  label: {
    large: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    medium: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
      letterSpacing: 0.5,
    },
    small: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500',
      letterSpacing: 0.5,
    },
  },
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
};

// Layout
export const Layout = {
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

// Responsive
export const Responsive = {
  isSmallScreen: width < 375,
  isMediumScreen: width >= 375 && width < 768,
  isLargeScreen: width >= 768,
  width,
  height,
};

// Animation timing
export const Animations = {
  fast: 150,
  medium: 250,
  slow: 350,
};

// Component styles
export const ComponentStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.md,
  },
  chip: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  chipText: {
    ...Typography.label.small,
    color: Colors.primary[700],
  },
  button: {
    primary: {
      backgroundColor: Colors.primary[500],
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondary: {
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: Colors.primary[500],
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      primary: {
        ...Typography.label.large,
        color: Colors.white,
      },
      secondary: {
        ...Typography.label.large,
        color: Colors.primary[500],
      },
    },
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body.medium,
  },
  avatar: {
    small: {
      width: 32,
      height: 32,
      borderRadius: BorderRadius.full,
    },
    medium: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.full,
    },
    large: {
      width: 64,
      height: 64,
      borderRadius: BorderRadius.full,
    },
  },
});

// Enhanced dark mode color system with WCAG AA compliance
export const Theme = {
  light: {
    background: Colors.gray[50],
    surface: Colors.white,
    surfaceVariant: Colors.gray[100],
    onSurface: Colors.gray[900],
    onSurfaceVariant: Colors.gray[700],
    primary: Colors.primary[500],
    onPrimary: Colors.white,
    secondary: Colors.secondary[500],
    onSecondary: Colors.white,
    error: Colors.error[500],
    onError: Colors.white,
    // Enhanced text colors for better readability
    text: {
      primary: Colors.gray[900],
      secondary: Colors.gray[700],
      tertiary: Colors.gray[500],
      inverse: Colors.white,
      disabled: Colors.gray[400],
    },
    // Semantic colors
    success: Colors.success[500],
    warning: Colors.warning[500],
    info: Colors.primary[500],
  },
  dark: {
    background: '#121212', // True dark for OLED
    surface: '#1E1E1E',    // Slightly lighter surface
    surfaceVariant: '#2C2C2C', // Card backgrounds
    onSurface: '#FFFFFF',   // Maximum contrast for primary text
    onSurfaceVariant: '#E0E0E0', // High contrast secondary text
    primary: '#66B7FF',     // Lighter primary for dark mode
    onPrimary: '#000000',
    secondary: '#FF8C8C',   // Lighter secondary for dark mode
    onSecondary: '#000000',
    error: '#FF4B4B',       // Lighter error for dark mode
    onError: '#000000',
    // Enhanced text colors with WCAG AA compliance
    text: {
      primary: '#FFFFFF',   // WCAG AA: 21:1 contrast on #121212
      secondary: '#B0B0B0', // WCAG AA: 7.5:1 contrast on #121212
      tertiary: '#808080',  // WCAG AA: 4.5:1 contrast on #121212
      inverse: '#000000',
      disabled: '#666666',  // WCAG AA: 3:1 contrast on #121212
    },
    // Semantic colors optimized for dark mode
    success: '#66D166',
    warning: '#FFB400',
    info: '#66B7FF',
  },
};

