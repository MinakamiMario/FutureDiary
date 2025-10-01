// src/screens/StatsScreen.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppContext } from '../utils/appContext';
import { formatHours } from '../utils/formatters';

// Components
import TrendsComponent from '../components/trendsComponent';
import ActivityList from '../components/activityList';
import databaseService from '../services/database';
import errorHandler from '../services/errorLogger';
import healthDataService from '../services/healthDataService';

const { width } = Dimensions.get('window');

const StatsScreen = () => {
  const { 
    activityStats, 
    weeklyTrends, 
    refreshStats,
    settings
  } = useAppContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('health');
  const [timeRange, setTimeRange] = useState('week');
  const [locationStats, setLocationStats] = useState([]);
  const [callStats, setCallStats] = useState([]);
  const [healthStats, setHealthStats] = useState({
    steps: 0,
    distance: 0,
    calories: 0,
    activeMinutes: 0,
    workouts: [],
    heartRate: { avg: 0, min: 0, max: 0 },
    sleep: { hours: 0, quality: 'Good' }
  });
  const [digitalWellnessStats, setDigitalWellnessStats] = useState({
    screenTime: 0,
    pickups: 0,
    notifications: 0,
    topApps: [],
    focusTime: 0
  });
  const [mobilityStats, setMobilityStats] = useState({
    placesVisited: 0,
    distanceTraveled: 0,
    timeAtHome: 0,
    timeAtWork: 0,
    averageSpeed: 0
  });
  
  useEffect(() => {
    loadData();
  }, [activeTab, timeRange]);
  
  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // Refresh data based on active tab
      await refreshStats(activeTab);
      
      // Laad aanvullende gegevens, afhankelijk van het actieve tabblad
      if (activeTab === 'health') {
        await loadHealthStats();
      } else if (activeTab === 'digital') {
        await loadDigitalWellnessStats();
      } else if (activeTab === 'location') {
        await loadLocationStats();
        await loadMobilityStats();
      } else if (activeTab === 'overview') {
        await loadOverviewStats();
      }
    } catch (error) {
      errorHandler.error('Fout bij laden van statistieken', error, 'StatsScreen');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadLocationStats = async () => {
    try {
      // Bereken tijdrange
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }
      
      // Haal locatiegegevens op uit de database
      const query = `
        SELECT * FROM locations 
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY visit_count DESC
      `;
      const result = await databaseService.executeQuery(query, [
        startDate.getTime(),
        endDate.getTime()
      ]);
      
      setLocationStats(result || []);
    } catch (error) {
      errorHandler.error('Fout bij laden van locatie statistieken', error, 'StatsScreen');
    }
  };
  
  const loadHealthStats = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }
      
      // Gebruik first AppContext data als beschikbaar, anders probeer database
      let totalSteps = 0;
      let workoutsResult = [];
      let hasRealData = false;
      
      // Prioriteer AppContext data
      if (activityStats && activityStats.todaySteps > 0) {
        totalSteps = activityStats.todaySteps;
        hasRealData = true;
        if (__DEV__) console.log('Using AppContext activity data:', totalSteps, 'steps');
      } else {
        // Fallback naar database queries
        try {
          // Probeer activities tabel voor stappen
          const activitiesQuery = `SELECT * FROM activities WHERE start_time >= ? AND start_time <= ? ORDER BY start_time DESC`;
          const activities = await databaseService.executeQuery(activitiesQuery, [startDate.getTime(), endDate.getTime()]);
          
          if (activities && activities.length > 0) {
            // Tel stappen uit activities
            totalSteps = activities.reduce((sum, activity) => {
              if (activity.details) {
                try {
                  const details = JSON.parse(activity.details);
                  return sum + (details.steps || 0);
                } catch (e) {
                  return sum;
                }
              }
              return sum;
            }, 0);
            
            // Filter workouts
            workoutsResult = activities.filter(a => a.sport_type || (a.type && a.type !== 'still' && a.type !== 'unknown' && a.type !== 'steps'));
            
            if (totalSteps > 0 || workoutsResult.length > 0) {
              hasRealData = true;
              if (__DEV__) console.log('Using database activity data:', totalSteps, 'steps,', workoutsResult.length, 'workouts');
            }
          }
        } catch (error) {
          if (__DEV__) console.log('Database query failed, will show message about no data:', error.message);
        }
      }
      
      // Alleen mock data in development/emulator - NOOIT in productie
      if (!hasRealData && __DEV__) {
        // Development fallback - alleen in emulator
        setHealthStats({
          steps: 8500 + Math.round(Math.random() * 3000),
          distance: Math.round((8500 + Math.random() * 3000) * 0.0008),
          calories: 340 + Math.round(Math.random() * 120),
          activeMinutes: 45 + Math.round(Math.random() * 60),
          workouts: [
            { sport_type: 'Wandelen', start_time: Date.now() - 86400000, duration: 1800 },
            { sport_type: 'Hardlopen', start_time: Date.now() - 172800000, duration: 2700 }
          ],
          heartRate: { avg: 68 + Math.round(Math.random() * 8), min: 55 + Math.round(Math.random() * 10), max: 170 + Math.round(Math.random() * 20) },
          sleep: { hours: 7 + Math.random() * 1.5, quality: 'Good' },
          hasRealData: false,
          isDemoData: true
        });
        if (__DEV__) console.log('Using development mock data for emulator');
      } else {
        // Productie - alleen echte data of geen data
        setHealthStats({
          steps: hasRealData && totalSteps > 0 ? totalSteps : 0,
          distance: hasRealData && totalSteps > 0 ? Math.round(totalSteps * 0.0008) : 0,
          calories: hasRealData && totalSteps > 0 ? Math.round(totalSteps * 0.04) : 0,
          activeMinutes: hasRealData && workoutsResult.length > 0 ? workoutsResult.length * 30 : 0,
          workouts: hasRealData ? workoutsResult : [],
          heartRate: { avg: 0, min: 0, max: 0 }, // Real heart rate would come from health sensors
          sleep: { hours: 0, quality: 'Unknown' }, // Real sleep data would come from health sensors
          hasRealData: hasRealData,
          isDemoData: false
        });
      }
    } catch (error) {
      errorHandler.error('Fout bij laden van gezondheidsstatistieken', error, 'StatsScreen');
    }
  };
  
  const loadDigitalWellnessStats = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }
      
      // Haal call en app usage data op - met fallback naar demo data en table checks
      try {
        const callsQuery = `SELECT COUNT(*) as total_calls, SUM(duration) as total_duration FROM call_logs WHERE call_date >= ? AND call_date <= ?`;
        
        // Check if app_usage table exists and use correct column name
        let appsResult = [];
        try {
          const appsQuery = `SELECT app_name, SUM(duration) as total_time FROM app_usage WHERE timestamp >= ? AND timestamp <= ? GROUP BY app_name ORDER BY total_time DESC LIMIT 5`;
          appsResult = await databaseService.executeQuery(appsQuery, [startDate.getTime(), endDate.getTime()]);
          if (__DEV__) console.log('Successfully loaded app usage data');
        } catch (appError) {
          if (__DEV__) console.log('app_usage table query failed, using demo data:', appError.message);
          appsResult = []; // Will trigger demo data
        }
        
        const [callsResult] = await Promise.all([
          databaseService.executeQuery(callsQuery, [startDate.getTime(), endDate.getTime()])
        ]);
        
        const totalScreenTime = (appsResult || []).reduce((sum, app) => sum + (app.total_time || 0), 0);
        const hasAppData = appsResult?.length > 0;
        const hasCallData = callsResult?.[0]?.total_calls > 0;
        
        setDigitalWellnessStats({
          screenTime: hasAppData ? Math.round(totalScreenTime / 60) : 0,
          pickups: hasAppData ? Math.round(totalScreenTime / 10) : 0,
          notifications: hasCallData ? callsResult[0].total_calls : 0,
          topApps: hasAppData ? appsResult : [],
          focusTime: hasAppData ? Math.max(0, 8 - Math.round(totalScreenTime / 60)) : 0,
          hasRealData: hasAppData || hasCallData
        });
        
      } catch (digitalError) {
        // Show no data instead of fake data
        setDigitalWellnessStats({
          screenTime: 0,
          pickups: 0,
          notifications: 0,
          topApps: [],
          focusTime: 0,
          hasRealData: false
        });
        if (__DEV__) console.log('Digital wellness data load failed, showing no data state');
      }
    } catch (error) {
      errorHandler.error('Fout bij laden van digitale wellness statistieken', error, 'StatsScreen');
    }
  };
  
  const loadMobilityStats = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }
      
      const locationsQuery = `SELECT COUNT(DISTINCT name) as unique_places, AVG(visit_count) as avg_visits FROM locations WHERE timestamp >= ? AND timestamp <= ?`;
      const [locationsResult] = await Promise.all([
        databaseService.executeQuery(locationsQuery, [startDate.getTime(), endDate.getTime()])
      ]);
      
      setMobilityStats({
        placesVisited: locationsResult?.[0]?.unique_places || 0,
        distanceTraveled: Math.round(Math.random() * 50), // Demo
        timeAtHome: Math.round(16 + Math.random() * 4), // Demo hours
        timeAtWork: Math.round(6 + Math.random() * 4), // Demo hours
        averageSpeed: Math.round(3 + Math.random() * 2) // Demo km/h
      });
    } catch (error) {
      errorHandler.error('Fout bij laden van mobiliteitsstatistieken', error, 'StatsScreen');
    }
  };
  
  const loadOverviewStats = async () => {
    // Load all stats for overview
    await Promise.all([
      loadHealthStats(),
      loadDigitalWellnessStats(),
      loadLocationStats(),
      loadMobilityStats()
    ]);
  };
  
  const onRefresh = async () => {
    await loadData();
  };
  
  // Renders de tabbar met categorieën
  const renderTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.tabContainer}
      contentContainerStyle={styles.tabContentContainer}
    >
      <TouchableOpacity
        style={[styles.tab, activeTab === 'health' && styles.activeTab]}
        onPress={() => setActiveTab('health')}
      >
        <Ionicons
          name="fitness-outline"
          size={20}
          color={activeTab === 'health' ? '#4F8EF7' : '#7F8C8D'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'health' && styles.activeTabText,
          ]}
        >
          Gezondheid
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'digital' && styles.activeTab]}
        onPress={() => setActiveTab('digital')}
      >
        <Ionicons
          name="phone-portrait-outline"
          size={20}
          color={activeTab === 'digital' ? '#4F8EF7' : '#7F8C8D'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'digital' && styles.activeTabText,
          ]}
        >
          Digitaal
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'location' && styles.activeTab]}
        onPress={() => setActiveTab('location')}
      >
        <Ionicons
          name="location-outline"
          size={20}
          color={activeTab === 'location' ? '#4F8EF7' : '#7F8C8D'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'location' && styles.activeTabText,
          ]}
        >
          Mobiliteit
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
        onPress={() => setActiveTab('overview')}
      >
        <Ionicons
          name="analytics-outline"
          size={20}
          color={activeTab === 'overview' ? '#4F8EF7' : '#7F8C8D'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'overview' && styles.activeTabText,
          ]}
        >
          Overzicht
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  // Renders de selector voor tijdsperiode
  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      <TouchableOpacity
        style={[styles.timeRangeButton, timeRange === 'day' && styles.activeTimeRange]}
        onPress={() => setTimeRange('day')}
      >
        <Text
          style={[
            styles.timeRangeText,
            timeRange === 'day' && styles.activeTimeRangeText,
          ]}
        >
          Dag
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.timeRangeButton, timeRange === 'week' && styles.activeTimeRange]}
        onPress={() => setTimeRange('week')}
      >
        <Text
          style={[
            styles.timeRangeText,
            timeRange === 'week' && styles.activeTimeRangeText,
          ]}
        >
          Week
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.timeRangeButton, timeRange === 'month' && styles.activeTimeRange]}
        onPress={() => setTimeRange('month')}
      >
        <Text
          style={[
            styles.timeRangeText,
            timeRange === 'month' && styles.activeTimeRangeText,
          ]}
        >
          Maand
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  // Health & Fitness content
  const renderHealthContent = () => (
    <View style={styles.contentContainer}>
      {/* Key Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: healthStats.steps > 0 ? '#E8F5E8' : '#F5F5F5' }]}>
          <Ionicons name="footsteps" size={24} color={healthStats.steps > 0 ? "#2E7D32" : "#9E9E9E"} />
          <Text style={[styles.metricValue, { color: healthStats.steps > 0 ? "#2E7D32" : "#9E9E9E" }]}>
            {healthStats.steps > 0 ? healthStats.steps.toLocaleString() : '-'}
          </Text>
          <Text style={styles.metricLabel}>Stappen</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="location" size={24} color="#1565C0" />
          <Text style={[styles.metricValue, { color: '#1565C0' }]}>{healthStats.distance} km</Text>
          <Text style={styles.metricLabel}>Afstand</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="flame" size={24} color="#E65100" />
          <Text style={[styles.metricValue, { color: '#E65100' }]}>{healthStats.calories}</Text>
          <Text style={styles.metricLabel}>Calorieën</Text>
        </View>
      </View>
      
      {/* Workouts */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recente Trainingen</Text>
          <Ionicons name="fitness-outline" size={20} color="#4F8EF7" />
        </View>
        {healthStats.workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color="#B8C2CC" />
            <Text style={styles.emptyStateText}>
              {healthStats.hasRealData === false ? 
                'Start activiteitenmonitoring in instellingen om trainingsdata te verzamelen' : 
                'Geen trainingen gevonden'
              }
            </Text>
          </View>
        ) : (
          healthStats.workouts.map((workout, index) => (
            <View key={`workout-${index}`} style={styles.workoutItem}>
              <View style={styles.workoutIcon}>
                <Ionicons name="fitness" size={20} color="#4F8EF7" />
              </View>
              <View style={styles.workoutDetails}>
                <Text style={styles.workoutType}>{workout.sport_type || 'Training'}</Text>
                <Text style={styles.workoutDate}>
                  {new Date(workout.timestamp).toLocaleDateString('nl-NL')}
                </Text>
              </View>
              <Text style={styles.workoutDuration}>
                {Math.round((workout.duration || 30) / 60)}min
              </Text>
            </View>
          ))
        )}
      </View>
      
      {/* Health Metrics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gezondheidswaarden</Text>
        <View style={styles.healthMetrics}>
          <View style={styles.healthMetric}>
            <Ionicons name="heart" size={16} color="#E91E63" />
            <Text style={styles.healthMetricLabel}>Hartslag</Text>
            <Text style={styles.healthMetricValue}>{healthStats.heartRate.avg} bpm</Text>
          </View>
          <View style={styles.healthMetric}>
            <Ionicons name="moon" size={16} color="#673AB7" />
            <Text style={styles.healthMetricLabel}>Slaap</Text>
            <Text style={styles.healthMetricValue}>{formatHours(healthStats.sleep.hours)}</Text>
          </View>
          <View style={styles.healthMetric}>
            <Ionicons name="time" size={16} color="#FF9800" />
            <Text style={styles.healthMetricLabel}>Actief</Text>
            <Text style={styles.healthMetricValue}>{healthStats.activeMinutes}min</Text>
          </View>
        </View>
      </View>
    </View>
  );
  
  // Digital Wellness content
  const renderDigitalContent = () => (
    <View style={styles.contentContainer}>
      {/* Screen Time Overview */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="phone-portrait" size={24} color="#E65100" />
          <Text style={[styles.metricValue, { color: '#E65100' }]}>{digitalWellnessStats.screenTime}u</Text>
          <Text style={styles.metricLabel}>Schermtijd</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#E8F5E8' }]}>
          <Ionicons name="refresh" size={24} color="#2E7D32" />
          <Text style={[styles.metricValue, { color: '#2E7D32' }]}>{digitalWellnessStats.pickups}</Text>
          <Text style={styles.metricLabel}>Keer opgepakt</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="notifications" size={24} color="#1565C0" />
          <Text style={[styles.metricValue, { color: '#1565C0' }]}>{digitalWellnessStats.notifications}</Text>
          <Text style={styles.metricLabel}>Meldingen</Text>
        </View>
      </View>
      
      {/* Top Apps */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Meest gebruikte apps</Text>
          <Ionicons name="apps-outline" size={20} color="#4F8EF7" />
        </View>
        {digitalWellnessStats.topApps.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="apps-outline" size={48} color="#B8C2CC" />
            <Text style={styles.emptyStateText}>
              {digitalWellnessStats.hasRealData === false ? 
                'Activeer app-gebruik tracking om digitale wellness data te verzamelen' : 
                'Geen app-gegevens beschikbaar'
              }
            </Text>
          </View>
        ) : (
          digitalWellnessStats.topApps.map((app, index) => (
            <View key={`app-${index}`} style={styles.appItem}>
              <View style={styles.appIcon}>
                <Ionicons name="phone-portrait" size={20} color="#4F8EF7" />
              </View>
              <View style={styles.appDetails}>
                <Text style={styles.appName}>{app.app_name}</Text>
                <Text style={styles.appCategory}>Productiviteit</Text>
              </View>
              <Text style={styles.appTime}>
                {Math.round((app.total_time || 0) / 60)}min
              </Text>
            </View>
          ))
        )}
      </View>
      
      {/* Focus Time */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Focus & Balans</Text>
        <View style={styles.focusMetrics}>
          <View style={styles.focusItem}>
            <Ionicons name="time-outline" size={20} color="#4CAF50" />
            <Text style={styles.focusLabel}>Focus tijd</Text>
            <Text style={[styles.focusValue, { color: '#4CAF50' }]}>
              {digitalWellnessStats.focusTime}u
            </Text>
          </View>
          <View style={styles.focusItem}>
            <Ionicons name="moon-outline" size={20} color="#9C27B0" />
            <Text style={styles.focusLabel}>Rust voor bedtijd</Text>
            <Text style={[styles.focusValue, { color: '#9C27B0' }]}>30min</Text>
          </View>
        </View>
      </View>
    </View>
  );
  
  // Location & Mobility content
  const renderLocationContent = () => (
    <View style={styles.contentContainer}>
      {/* Mobility Overview */}
      <View style={styles.metricsRowTwo}>
        <View style={[styles.metricCard, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="location" size={24} color="#1565C0" />
          <Text style={[styles.metricValue, { color: '#1565C0' }]}>{mobilityStats.placesVisited}</Text>
          <Text style={styles.metricLabel}>Plekken bezocht</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#E8F5E8' }]}>
          <Ionicons name="car" size={24} color="#2E7D32" />
          <Text style={[styles.metricValue, { color: '#2E7D32' }]}>{mobilityStats.distanceTraveled} km</Text>
          <Text style={styles.metricLabel}>Afgelegd</Text>
        </View>
      </View>
      
      {/* Time Distribution */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tijd verdeling</Text>
        <View style={styles.timeDistribution}>
          <View style={styles.timeItem}>
            <Ionicons name="home" size={20} color="#4CAF50" />
            <Text style={styles.timeLabel}>Thuis</Text>
            <Text style={[styles.timeValue, { color: '#4CAF50' }]}>
              {mobilityStats.timeAtHome}u
            </Text>
          </View>
          <View style={styles.timeItem}>
            <Ionicons name="business" size={20} color="#FF9800" />
            <Text style={styles.timeLabel}>Werk</Text>
            <Text style={[styles.timeValue, { color: '#FF9800' }]}>
              {mobilityStats.timeAtWork}u
            </Text>
          </View>
          <View style={styles.timeItem}>
            <Ionicons name="speedometer" size={20} color="#2196F3" />
            <Text style={styles.timeLabel}>Gem. snelheid</Text>
            <Text style={[styles.timeValue, { color: '#2196F3' }]}>
              {mobilityStats.averageSpeed} km/u
            </Text>
          </View>
        </View>
      </View>
      
      {/* Favorite Places */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Favoriete locaties</Text>
          <Ionicons name="heart-outline" size={20} color="#4F8EF7" />
        </View>
        {locationStats.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color="#B8C2CC" />
            <Text style={styles.emptyStateText}>
              Geen locatiegegevens beschikbaar
            </Text>
          </View>
        ) : (
          locationStats.slice(0, 5).map((location, index) => (
            <View key={`location-${index}`} style={styles.locationItem}>
              <View style={styles.locationIconContainer}>
                <Ionicons name="location" size={20} color="#4F8EF7" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationName}>
                  {location.name || 'Onbekende locatie'}
                </Text>
                <Text style={styles.locationCoords}>
                  {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
                </Text>
              </View>
              <View style={styles.visitCount}>
                <Text style={styles.visitCountText}>{location.visit_count}x</Text>
                <Text style={styles.visitCountLabel}>bezoeken</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
  
  // Overview content
  const renderOverviewContent = () => {
    const weeklyGoals = {
      steps: { current: healthStats.steps, target: 10000, unit: 'stappen' },
      screenTime: { current: digitalWellnessStats.screenTime, target: 6, unit: 'uren', reverse: true },
      workouts: { current: healthStats.workouts.length, target: 3, unit: 'trainingen' },
      places: { current: mobilityStats.placesVisited, target: 5, unit: 'plekken' }
    };
    
    return (
      <View style={styles.contentContainer}>
        {/* Weekly Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Week overzicht</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="fitness" size={24} color="#4CAF50" />
              <Text style={styles.summaryValue}>{healthStats.steps.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Stappen deze week</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="phone-portrait" size={24} color="#FF9800" />
              <Text style={styles.summaryValue}>{digitalWellnessStats.screenTime}u</Text>
              <Text style={styles.summaryLabel}>Gemiddelde schermtijd</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="location" size={24} color="#2196F3" />
              <Text style={styles.summaryValue}>{mobilityStats.placesVisited}</Text>
              <Text style={styles.summaryLabel}>Unieke locaties</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="barbell" size={24} color="#9C27B0" />
              <Text style={styles.summaryValue}>{healthStats.workouts.length}</Text>
              <Text style={styles.summaryLabel}>Trainingen</Text>
            </View>
          </View>
        </View>
        
        {/* Weekly Goals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Week doelen</Text>
          {Object.entries(weeklyGoals).map(([key, goal]) => {
            const progress = goal.reverse 
              ? Math.max(0, (goal.target - goal.current) / goal.target * 100)
              : Math.min(100, (goal.current / goal.target) * 100);
            
            return (
              <View key={key} style={styles.goalItem}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalLabel}>
                    {goal.current} / {goal.target} {goal.unit}
                  </Text>
                  <Text style={[styles.goalPercentage, { 
                    color: progress >= 80 ? '#4CAF50' : progress >= 50 ? '#FF9800' : '#F44336' 
                  }]}>
                    {Math.round(progress)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[styles.progressFill, { 
                      width: `${progress}%`,
                      backgroundColor: progress >= 80 ? '#4CAF50' : progress >= 50 ? '#FF9800' : '#F44336'
                    }]} 
                  />
                </View>
              </View>
            );
          })}
        </View>
        
        {/* Personal Records */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Persoonlijke records</Text>
          <View style={styles.recordsList}>
            <View style={styles.recordItem}>
              <Ionicons name="trophy" size={16} color="#FFD700" />
              <Text style={styles.recordText}>Meeste stappen: 15.420 (vorige week)</Text>
            </View>
            <View style={styles.recordItem}>
              <Ionicons name="trophy" size={16} color="#C0C0C0" />
              <Text style={styles.recordText}>Langste training: 90 min (hardlopen)</Text>
            </View>
            <View style={styles.recordItem}>
              <Ionicons name="trophy" size={16} color="#CD7F32" />
              <Text style={styles.recordText}>Minste schermtijd: 4u (zondag)</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {renderTabs()}
      {renderTimeRangeSelector()}
      
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={['#4F8EF7']}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F8EF7" />
            <Text style={styles.loadingText}>Gegevens laden...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'health' && renderHealthContent()}
            {activeTab === 'digital' && renderDigitalContent()}
            {activeTab === 'location' && renderLocationContent()}
            {activeTab === 'overview' && renderOverviewContent()}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContainer: {
    padding: 16,
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  tabContentContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    minWidth: 100,
  },
  activeTab: {
    backgroundColor: '#EBF3FF',
  },
  tabText: {
    marginLeft: 6,
    color: '#7F8C8D',
    fontWeight: '500',
    fontSize: 13,
  },
  activeTabText: {
    color: '#4F8EF7',
  },
  // Metrics cards
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricsRowTwo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  // Card styling
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    justifyContent: 'center',
  },
  timeRangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
  },
  activeTimeRange: {
    backgroundColor: '#4F8EF7',
  },
  timeRangeText: {
    color: '#7F8C8D',
    fontWeight: '500',
    fontSize: 14,
  },
  activeTimeRangeText: {
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7F8C8D',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  locationIconContainer: {
    backgroundColor: '#EBF3FF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  visitCount: {
    alignItems: 'center',
  },
  visitCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F8EF7',
  },
  visitCountLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  callIconContainer: {
    backgroundColor: '#EBF3FF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callDetails: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  callDuration: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  callCount: {
    alignItems: 'center',
  },
  callCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F8EF7',
  },
  callCountLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  // Health specific styles
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  workoutIcon: {
    backgroundColor: '#EBF3FF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutDetails: {
    flex: 1,
  },
  workoutType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  workoutDuration: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F8EF7',
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthMetric: {
    alignItems: 'center',
    flex: 1,
  },
  healthMetricLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  healthMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center',
  },
  // Digital wellness styles
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  appIcon: {
    backgroundColor: '#EBF3FF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appDetails: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  appCategory: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  appTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F8EF7',
  },
  focusMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  focusItem: {
    alignItems: 'center',
    flex: 1,
  },
  focusLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  focusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Location & Mobility styles
  timeDistribution: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeItem: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Overview styles
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  goalItem: {
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  goalPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  recordsList: {
    marginTop: 8,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recordText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 8,
    flex: 1,
  },
});

export default StatsScreen;