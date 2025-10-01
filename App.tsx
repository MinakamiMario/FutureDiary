import React, {useState, useEffect} from 'react';
import {View, Text, StatusBar, StyleSheet, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DashboardScreen from './src/screens/dashboardScreen.js';
import JournalScreen from './src/screens/journalScreen.js';
import StatsScreen from './src/screens/statsScreen.js';
import SettingsScreen from './src/screens/settingsScreen.js';
import OnboardingScreen from './src/screens/onBoardingScreen.js';
import HealthDataService from './src/services/healthDataService';
import {AppProvider} from './src/utils/appContext';
import {ThemeProvider} from './src/utils/themeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/utils/onboardingTestUtils'; // Load test utils in development

// 🚨 FIX: Font fallback voor Chinese tekens - PLAATS DIT BOVEN ALLE COMPONENTS
if (!__DEV__) {
  // Alleen in productie - forceer veilige font family
  const OriginalText = Text;
  
  // Override Text component met veilige font family
  Object.defineProperty(Text, 'render', {
    value: function TextWithSafeFont(props) {
      const safeStyle = [
        { fontFamily: Platform.select({
          ios: 'System',
          android: 'sans-serif-medium',
          default: 'System'
        })},
        props.style
      ];
      
      return OriginalText.render.call(this, {
        ...props,
        style: safeStyle
      });
    }
  });
  
  console.log('🔧 Font fallback patch actief - Chinese tekens zouden moeten verdwijnen');
}

// OpenAI API Key Setup - COMPLETED

const Tab = createBottomTabNavigator();

// Wrapper components for screens with health data
function DashboardWrapper() {
  const [stats, setStats] = useState({
    steps: 0,
    calories: 0,
    distance: 0,
    activeMinutes: 0,
    heartRate: 0,
    isTracking: false,
  });

  const loadRealHealthData = () => {
    const realStats = HealthDataService.getCurrentStats();
    setStats(realStats);
  };

  useEffect(() => {
    loadRealHealthData();
  }, []);

  return (
    <DashboardScreen healthDataService={HealthDataService} stats={stats} />
  );
}

function StatsWrapper() {
  const [stats, setStats] = useState({
    steps: 0,
    calories: 0,
    distance: 0,
    activeMinutes: 0,
    heartRate: 0,
    isTracking: false,
  });

  const loadRealHealthData = () => {
    const realStats = HealthDataService.getCurrentStats();
    setStats(realStats);
  };

  useEffect(() => {
    loadRealHealthData();
  }, []);

  return <StatsScreen stats={stats} />;
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
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
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

          return <Ionicons name={iconName} size={size} color={color} />;
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
        component={SettingsScreen}
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
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#4a90e2" />
          <AppContent />
        </NavigationContainer>
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
