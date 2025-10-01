import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

// Services
import appUsageService from '../services/appUsageService';
import databaseService from '../services/database';

// Components and utils
import Card from '../components/ui/Card';
import Typography from '../components/ui/Typography';
import { useTheme } from '../utils/themeContext';

const { width } = Dimensions.get('window');

const AppUsageScreen = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  
  const [usageData, setUsageData] = useState({
    todayUsage: [],
    trends: null,
    totalScreenTime: 0,
    topApps: [],
    categories: {},
    weekendVsWeekday: { weekend: 0, weekday: 0 }
  });

  const [dataSource, setDataSource] = useState(null);

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadUsageData();
    }, [selectedPeriod])
  );

  const loadUsageData = async () => {
    try {
      setLoading(true);
      
      // Get data source info with error handling
      let sourceInfo = null;
      try {
        sourceInfo = await appUsageService.getAvailableDataSources();
        setDataSource(sourceInfo);
      } catch (sourceError) {
        if (__DEV__) console.warn('Failed to load data source info:', sourceError.message);
        setDataSource({ platform: 'unknown', trackingAvailable: false });
      }

      // Load usage data based on selected period
      let todayUsage = [];
      let trends = null;

      if (selectedPeriod === 'today') {
        try {
          todayUsage = await appUsageService.getTodayUsage();
          if (!Array.isArray(todayUsage)) {
            todayUsage = [];
          }
        } catch (todayError) {
          if (__DEV__) console.warn('Failed to load today usage:', todayError.message);
          todayUsage = [];
        }
      } else {
        const daysBack = selectedPeriod === 'week' ? 7 : 30;
        try {
          trends = await appUsageService.getUsageTrends(daysBack);
          
          if (trends && trends.trends && Array.isArray(trends.trends)) {
            // Get apps from the most recent day
            const recentDay = trends.trends[trends.trends.length - 1];
            if (recentDay && recentDay.apps) {
              todayUsage = recentDay.apps;
            }
          }
        } catch (trendsError) {
          if (__DEV__) console.warn('Failed to load usage trends:', trendsError.message);
          trends = {
            totalScreenTime: 0,
            topApps: [],
            categories: new Map(),
            averageDailyUsage: 0,
            weekendVsWeekday: { weekend: 0, weekday: 0 },
            trends: []
          };
        }
      }

      // Calculate total screen time and top apps
      const totalTime = todayUsage.reduce((sum, app) => sum + (app.totalTime || app.duration || 0), 0);
      const sortedApps = [...todayUsage].sort((a, b) => (b.totalTime || b.duration || 0) - (a.totalTime || a.duration || 0));
      const topApps = sortedApps.slice(0, 5);

      // Group by category
      const categories = {};
      todayUsage.forEach(app => {
        const category = app.category || 'Onbekend';
        if (!categories[category]) {
          categories[category] = { totalTime: 0, apps: [] };
        }
        categories[category].totalTime += (app.totalTime || app.duration || 0);
        categories[category].apps.push(app);
      });

      setUsageData({
        todayUsage,
        trends,
        totalScreenTime: totalTime,
        topApps,
        categories,
        weekendVsWeekday: trends ? trends.weekendVsWeekday : { weekend: 0, weekday: 0 }
      });

    } catch (error) {
      console.error('Error loading usage data:', error);
      Alert.alert('Fout', 'Kon app gebruik data niet laden');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsageData();
    setRefreshing(false);
  };

  const importHistoricalData = async () => {
    try {
      Alert.alert(
        'Historische Data Importeren',
        'Wil je de laatste 30 dagen aan app gebruik importeren?',
        [
          { text: 'Annuleer', style: 'cancel' },
          {
            text: 'Importeren',
            onPress: async () => {
              setLoading(true);
              try {
                const result = await appUsageService.importHistoricalUsageData(30);
                if (result.success) {
                  Alert.alert('Succes', result.message);
                  await loadUsageData();
                } else {
                  Alert.alert('Fout', result.message || 'Import mislukt');
                }
              } catch (error) {
                Alert.alert('Fout', 'Import mislukt: ' + error.message);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Fout', 'Kon import niet starten');
    }
  };

  const formatTime = (milliseconds) => {
    if (!milliseconds || milliseconds === 0) return '0m';
    
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}u ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getScreenTimeColor = (time) => {
    const hours = time / (1000 * 60 * 60);
    if (hours < 2) return theme.colors.success;
    if (hours < 4) return theme.colors.warning;
    return theme.colors.error;
  };

  const renderPeriodSelector = () => (
    <View style={[styles.periodSelector, { borderColor: theme.colors.border }]}>
      {[
        { key: 'today', label: 'Vandaag' },
        { key: 'week', label: '7 Dagen' },
        { key: 'month', label: '30 Dagen' }
      ].map(period => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodButton,
            { 
              backgroundColor: selectedPeriod === period.key 
                ? theme.colors.primary 
                : 'transparent',
              borderColor: theme.colors.border
            }
          ]}
          onPress={() => setSelectedPeriod(period.key)}
        >
          <Typography
            variant="body2"
            style={{
              color: selectedPeriod === period.key 
                ? '#FFFFFF' 
                : theme.colors.text.secondary
            }}
          >
            {period.label}
          </Typography>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderScreenTimeOverview = () => (
    <Card style={styles.overviewCard}>
      <View style={styles.screenTimeHeader}>
        <Ionicons 
          name="phone-portrait" 
          size={24} 
          color={getScreenTimeColor(usageData.totalScreenTime)} 
        />
        <Typography variant="h6" style={styles.screenTimeTitle}>
          {selectedPeriod === 'today' ? 'Schermtijd Vandaag' : 'Gemiddelde Schermtijd'}
        </Typography>
      </View>
      
      <Typography 
        variant="h3" 
        style={[styles.screenTimeValue, { color: getScreenTimeColor(usageData.totalScreenTime) }]}
      >
        {formatTime(selectedPeriod === 'today' 
          ? usageData.totalScreenTime 
          : usageData.trends?.averageDailyUsage || 0
        )}
      </Typography>

      {selectedPeriod !== 'today' && usageData.trends && (
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            <Typography variant="caption" style={{ color: theme.colors.text.secondary }}>
              Weekend
            </Typography>
            <Typography variant="body2" style={{ color: theme.colors.primary }}>
              {formatTime(usageData.weekendVsWeekday.weekend)}
            </Typography>
          </View>
          <View style={styles.comparisonItem}>
            <Typography variant="caption" style={{ color: theme.colors.text.secondary }}>
              Doordeweeks
            </Typography>
            <Typography variant="body2" style={{ color: theme.colors.primary }}>
              {formatTime(usageData.weekendVsWeekday.weekday)}
            </Typography>
          </View>
        </View>
      )}
    </Card>
  );

  const renderTopApps = () => (
    <Card style={styles.topAppsCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="apps" size={20} color={theme.colors.primary} />
        <Typography variant="h6" style={styles.sectionTitle}>
          {selectedPeriod === 'today' ? 'Meest Gebruikt Vandaag' : 'Top Apps'}
        </Typography>
      </View>

      {usageData.topApps.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="phone-portrait-outline" size={48} color={theme.colors.text.secondary} />
          <Typography variant="body2" style={{ color: theme.colors.text.secondary, textAlign: 'center', marginTop: 8 }}>
            Geen app gebruik data beschikbaar
          </Typography>
        </View>
      ) : (
        usageData.topApps.map((app, index) => (
          <View key={`${app.appName || app.app_name}-${index}`} style={styles.appItem}>
            <View style={styles.appInfo}>
              <View style={[styles.appIcon, { backgroundColor: theme.colors?.primary + '20' || '#4F8EF720' }]}>
                <Ionicons 
                  name="phone-portrait" 
                  size={20} 
                  color={theme.colors.primary} 
                />
              </View>
              <View style={styles.appDetails}>
                <Typography variant="body1" style={styles.appName}>
                  {app.appName || app.app_name || 'Onbekende App'}
                </Typography>
                <Typography variant="caption" style={{ color: theme.colors.text.secondary }}>
                  {app.category || 'Onbekend'}
                </Typography>
              </View>
            </View>
            <Typography variant="body2" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {formatTime(app.totalTime || app.duration || 0)}
            </Typography>
          </View>
        ))
      )}
    </Card>
  );

  const renderCategories = () => {
    const categoryEntries = Object.entries(usageData.categories)
      .sort(([,a], [,b]) => b.totalTime - a.totalTime)
      .slice(0, 5);

    if (categoryEntries.length === 0) return null;

    return (
      <Card style={styles.categoriesCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="grid" size={20} color={theme.colors.primary} />
          <Typography variant="h6" style={styles.sectionTitle}>
            Categorieën
          </Typography>
        </View>

        {categoryEntries.map(([category, data]) => (
          <View key={category} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <Typography variant="body1" style={styles.categoryName}>
                {category}
              </Typography>
              <Typography variant="caption" style={{ color: theme.colors.text.secondary }}>
                {data.apps.length} app{data.apps.length !== 1 ? 's' : ''}
              </Typography>
            </View>
            <Typography variant="body2" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {formatTime(data.totalTime)}
            </Typography>
          </View>
        ))}
      </Card>
    );
  };

  const renderDataSource = () => {
    if (!dataSource) return null;

    return (
      <Card style={styles.dataSourceCard}>
        <View style={styles.sectionHeader}>
          <Ionicons 
            name={dataSource.trackingAvailable ? "checkmark-circle" : "information-circle"} 
            size={20} 
            color={dataSource.trackingAvailable ? theme.colors.success : theme.colors.warning} 
          />
          <Typography variant="h6" style={styles.sectionTitle}>
            Data Bron
          </Typography>
        </View>

        <View style={styles.dataSourceInfo}>
          <Typography variant="body2" style={{ color: theme.colors.text.primary }}>
            Platform: {dataSource.platform === 'ios' ? 'iOS' : 'Android'}
          </Typography>
          <Typography variant="body2" style={{ color: theme.colors.text.primary }}>
            Bron: {dataSource.source}
          </Typography>
          {dataSource.reason && (
            <Typography variant="caption" style={{ color: theme.colors.text.secondary, marginTop: 4 }}>
              {dataSource.reason}
            </Typography>
          )}
        </View>

        {dataSource.canImportHistorical && (
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: theme.colors.primary }]}
            onPress={importHistoricalData}
          >
            <Ionicons name="download" size={16} color="#FFFFFF" />
            <Typography variant="body2" style={{ color: '#FFFFFF', marginLeft: 8 }}>
              Historische Data Importeren
            </Typography>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Typography variant="body2" style={{ marginTop: 16, color: theme.colors.text.secondary }}>
          App gebruik wordt geladen...
        </Typography>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderPeriodSelector()}
        {renderScreenTimeOverview()}
        {renderTopApps()}
        {renderCategories()}
        {renderDataSource()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRightWidth: 1,
  },
  overviewCard: {
    marginBottom: 16,
    padding: 20,
  },
  screenTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenTimeTitle: {
    marginLeft: 8,
    fontWeight: '600',
  },
  screenTimeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  topAppsCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 8,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appDetails: {
    flex: 1,
  },
  appName: {
    fontWeight: '500',
  },
  categoriesCard: {
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontWeight: '500',
  },
  dataSourceCard: {
    marginBottom: 32,
  },
  dataSourceInfo: {
    marginBottom: 16,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
});

export default AppUsageScreen;