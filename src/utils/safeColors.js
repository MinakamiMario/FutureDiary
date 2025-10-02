// src/utils/safeColors.js
// Safe Colors accessor to prevent undefined errors during app initialization

// Fallback color palette that's always available
const FALLBACK_COLORS = {
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
  background: {
    primary: '#FAFAFA',
    secondary: '#FFFFFF',
    tertiary: '#F5F5F5',
  },
};

// Safe accessor function
export const getSafeColor = (path, fallback = FALLBACK_COLORS.gray[500]) => {
  try {
    // Try to import Colors from designSystem
    const { Colors } = require('../styles/designSystem');
    
    // Navigate the path
    const pathArray = path.split('.');
    let result = Colors;
    
    for (const key of pathArray) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        // Fall back to hardcoded colors
        result = FALLBACK_COLORS;
        for (const fallbackKey of pathArray) {
          if (result && typeof result === 'object' && fallbackKey in result) {
            result = result[fallbackKey];
          } else {
            return fallback;
          }
        }
        break;
      }
    }
    
    return result || fallback;
  } catch (error) {
    // If import fails, use fallback colors
    const pathArray = path.split('.');
    let result = FALLBACK_COLORS;
    
    for (const key of pathArray) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return fallback;
      }
    }
    
    return result || fallback;
  }
};

// Direct exports for common colors to ensure availability
export const SafeColors = FALLBACK_COLORS;

export default getSafeColor;