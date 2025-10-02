// src/utils/themeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, Colors } from '../styles/designSystem';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  
  // Load theme preference independently
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('@MinakamiApp:settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setDarkMode(settings.darkMode || false);
        }
      } catch (error) {
        console.warn('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Function to toggle theme
  const toggleTheme = async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    try {
      // Update settings in AsyncStorage
      const savedSettings = await AsyncStorage.getItem('@MinakamiApp:settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      const updatedSettings = { ...settings, darkMode: newDarkMode };
      await AsyncStorage.setItem('@MinakamiApp:settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.warn('Error saving theme preference:', error);
    }
  };
  
  const currentTheme = darkMode ? Theme.dark : Theme.light;
  
  // Extended theme with computed colors
  const theme = {
    ...currentTheme,
    isDark: darkMode,
    colors: {
      ...currentTheme,
      // Text colors
      text: {
        primary: currentTheme.onSurface,
        secondary: currentTheme.onSurfaceVariant,
      },
      // Background colors  
      background: {
        primary: currentTheme.background,
        secondary: currentTheme.surface,
        card: currentTheme.surface,
      },
      // Border colors with safe fallbacks
      border: {
        primary: darkMode ? '#757575' : '#E8E8E8',
        secondary: darkMode ? '#8C8C8C' : '#D1D1D1',
      }
    },
    // Helper function to get color by path
    getColor: (colorPath, fallback = '#A3A3A3') => {
      const paths = colorPath.split('.');
      let color = theme;
      
      for (const path of paths) {
        if (color && color[path]) {
          color = color[path];
        } else {
          return fallback;
        }
      }
      
      return color;
    },
    // Theme toggle function
    toggleTheme
  };
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};