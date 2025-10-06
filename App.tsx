import React, {useState, useEffect} from 'react';
import {View, Text, StatusBar, StyleSheet, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import DashboardScreen from './src/screens/dashboardScreen.js';
import JournalScreen from './src/screens/journalScreen.js';
import StatsScreen from './src/screens/statsScreen.js';
import SettingsNavigator from './src/screens/settingsScreen.js';
import OnboardingScreen from './src/screens/onboarding';
import { OnboardingErrorBoundary } from './src/screens/onboarding/components/OnboardingErrorBoundary';
import HealthDataService from './src/services/healthDataService';
import {AppProvider} from './src/utils/appContext';
import {ThemeProvider} from './src/utils/themeContext';
import {HealthDataProvider, useHealthData} from './src/contexts/HealthDataContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Load test utils only in development
if (__DEV__) {
  require('./src/utils/onboardingTestUtils');
  
  // Debug logging for React key warnings - TEMPORARY FOR DEBUGGING
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && message.includes('unique "key" prop')) {
      console.error('🚨 REACT KEY WARNING DETECTED 🚨');
      console.error('Full warning:', message);
      console.error('Component stack trace:', new Error().stack);
      
      // Try to extract component info
      const componentMatch = message.match(/Check the render method of (\w+)/);
      if (componentMatch) {
        console.error('🎯 Problem component:', componentMatch[1]);
      }
      
      // Enhanced stack trace with component names
      console.error('📍 JavaScript stack:');
      const stack = new Error().stack?.split('\n') || [];
      stack.forEach((line, index) => {
        if (line.includes('src/') || line.includes('components/') || line.includes('screens/')) {
          console.error(`  ${index}: ${line}`);
        }
      });
    }
    originalWarn(...args);
  };
  
  console.error = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && message.includes('key') && message.includes('prop')) {
      console.error('🔍 Possible key-related error:', message);
    }
    originalError(...args);
  };
}

// Font configuration for better text rendering
const defaultFontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System'
});

// OpenAI API Key Setup - COMPLETED

const Tab = createBottomTabNavigator();

// Optimized wrapper components using shared health data context
function DashboardWrapper() {
  const { healthStats, fetchHealthStats } = useHealthData();

  useEffect(() => {
    fetchHealthStats();
  }, [fetchHealthStats]);

  return (
    <DashboardScreen healthDataService={HealthDataService} stats={healthStats} />
  );
}

function StatsWrapper() {
  const { healthStats } = useHealthData();

  return <StatsScreen stats={healthStats} />;
}

function AppContent() {
  const [isOnboarded, setIsOnboarded] = useState(null); // null = loading, true = completed, false = needs onboarding

  // Check onboarding status on app start
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem(
        'onboarding_completed',
      );
      setIsOnboarded(onboardingCompleted === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboarded(false); // Default to showing onboarding if error
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      setIsOnboarded(true);
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
      setIsOnboarded(true); // Continue anyway
    }
  };

  // Show loading while checking onboarding status
  if (isOnboarded === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Show onboarding if not completed
  if (!isOnboarded) {
    return (
      <OnboardingErrorBoundary onReset={() => setIsOnboarded(false)}>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </OnboardingErrorBoundary>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Dagboek') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Statistieken') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Instellingen') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4a90e2',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e9ecef',
          paddingBottom: 10,
          paddingTop: 10,
          height: 70,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 4,
        },
      })}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardWrapper}
        options={{tabBarLabel: 'Dashboard'}}
      />
      <Tab.Screen
        name="Dagboek"
        component={JournalScreen}
        options={{tabBarLabel: 'Dagboek'}}
      />
      <Tab.Screen
        name="Statistieken"
        component={StatsWrapper}
        options={{tabBarLabel: 'Statistieken'}}
      />
      <Tab.Screen
        name="Instellingen"
        component={SettingsNavigator}
        options={{tabBarLabel: 'Instellingen'}}
      />
    </Tab.Navigator>
  );
}

// Main App component with all providers
function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <HealthDataProvider>
          <NavigationContainer>
            <StatusBar barStyle="light-content" backgroundColor="#4a90e2" />
            <AppContent />
          </NavigationContainer>
        </HealthDataProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

export default App;
