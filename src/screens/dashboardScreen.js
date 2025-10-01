// src/screens/DashboardScreen.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  RefreshControl, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppContext } from '../utils/appContext';

// Components
import ActivityList from '../components/activityList';
import DailySummary from '../components/dailySummary';
import TrendsComponent from '../components/trendsComponent';
import Card from '../components/ui/Card';
import Typography from '../components/ui/Typography';
import ProgressBar from '../components/ui/ProgressBar';
import { Colors, Spacing, Typography as DesignTypography, BorderRadius } from '../styles/designSystem';

const DashboardScreen = () => {
  const { 
    isLoading, 
    activityStats, 
    locationStats, 
    callStats, 
    dailySummary,
    weeklyTrends,
    settings,
    loadDashboardStats
  } = useAppContext();
  
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    // Laad stats bij eerste rendering
    loadDashboardStats();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    setRefreshing(false);
  };
  
  // Functie om percentage te berekenen
  const calculatePercentage = (current, target) => {
    return Math.min(100, Math.round((current / target) * 100));
  };
  
  // Haal de huidige activiteitstitel op
  const getCurrentActivityTitle = () => {
    switch(activityStats.currentActivity) {
      case 'still':
        return 'Stilstaand';
      case 'walking':
        return 'Lopen';
      case 'running':
        return 'Rennen';
      case 'stationary_activity':
        return 'Stationaire activiteit';
      default:
        return 'Onbekend';
    }
  };
  
  // Helper functie om tijd in minuten te formatteren
  const formatActiveTime = (timeInMs) => {
    const minutes = Math.floor(timeInMs / (1000 * 60));
    return `${minutes} min`;
  };
  
  // Helper functie om activiteitspictogram te krijgen
  const getActivityIcon = (activityType) => {
    switch(activityType) {
      case 'still':
        return 'body-outline';
      case 'walking':
        return 'walk-outline';
      case 'running':
        return 'fitness-outline';
      case 'stationary_activity':
        return 'desktop-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary[500]]}
          />
        }
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View style={styles.welcomeContainer}>
            <View style={styles.greetingRow}>
              <Typography variant="h4" color="text.primary" style={styles.greeting}>
                Goedemorgen
              </Typography>
              <View style={styles.waveEmoji}>
                <Typography variant="h4">👋</Typography>
              </View>
            </View>
            <Typography variant="body2" color="text.secondary" style={styles.subtitle}>
              Hier is een overzicht van je dag
            </Typography>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={32} color={Colors.primary[500]} />
          </TouchableOpacity>
        </View>

        {/* Current Activity Card */}
        <Card style={styles.currentActivityCard}>
          <View style={styles.activityHeader}>
            <Ionicons 
              name={getActivityIcon(activityStats.currentActivity)} 
              size={32} 
              color={Colors.primary[500]} 
            />
            <View style={styles.activityInfo}>
              <Typography variant="h6" color="text.primary">
                {getCurrentActivityTitle()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Huidige activiteit
              </Typography>
            </View>
          </View>
        </Card>

        {/* Daily Goals Section */}
        <View style={styles.section}>
          <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>
            Dagelijkse Doelen
          </Typography>
          
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="footsteps-outline" size={24} color={Colors.primary[500]} />
                <Typography variant="body1" color="text.secondary" style={styles.statLabel}>
                  Stappen
                </Typography>
              </View>
              <Typography variant="h4" color="text.primary" style={styles.statValue}>
                {activityStats.todaySteps.toLocaleString()}
              </Typography>
              <ProgressBar 
                progress={calculatePercentage(
                  activityStats.todaySteps, 
                  activityStats.activityGoals.steps
                )}
                style={styles.progressBar}
              />
              <Typography variant="body2" color="text.secondary">
                {calculatePercentage(
                  activityStats.todaySteps, 
                  activityStats.activityGoals.steps
                )}% van doel
              </Typography>
            </Card>

            <Card style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="timer-outline" size={24} color={Colors.success[500]} />
                <Typography variant="body1" color="text.secondary" style={styles.statLabel}>
                  Actieve tijd
                </Typography>
              </View>
              <Typography variant="h4" color="text.primary" style={styles.statValue}>
                {formatActiveTime(activityStats.activeTime)}
              </Typography>
              <ProgressBar 
                progress={calculatePercentage(
                  activityStats.activeTime / (1000 * 60), 
                  activityStats.activityGoals.activeMinutes
                )}
                color="success"
                style={styles.progressBar}
              />
              <Typography variant="body2" color="text.secondary">
                {calculatePercentage(
                  activityStats.activeTime / (1000 * 60), 
                  activityStats.activityGoals.activeMinutes
                )}% van doel
              </Typography>
            </Card>
          </View>
        </View>

        {/* Daily Summary */}
        {dailySummary && (
          <View style={styles.section}>
            <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>
              Dagelijkse Samenvatting
            </Typography>
            <Card>
              <DailySummary summary={dailySummary} />
            </Card>
          </View>
        )}

        {/* Recent Activities */}
        <View style={styles.section}>
          <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>
            Recente Activiteiten
          </Typography>
          <Card>
            <ActivityList limit={3} />
          </Card>
        </View>

        {/* Weekly Trends */}
        {weeklyTrends && (
          <View style={styles.section}>
            <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>
              Weekoverzicht
            </Typography>
            <Card>
              <TrendsComponent trends={weeklyTrends} />
            </Card>
          </View>
        )}

        {/* Call Statistics (Android only) */}
        {settings.trackCalls && callStats.callSummary && (
          <View style={styles.section}>
            <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>
              Telefoongebruik Vandaag
            </Typography>
            <Card style={styles.callStatsCard}>
              <View style={styles.callStatsGrid}>
                {[
                  { icon: 'call', label: 'Oproepen', value: callStats.callSummary.totalCalls || 0, color: Colors.primary[500] },
                  { icon: 'arrow-up', label: 'Uitgaand', value: callStats.callSummary.totalOutgoing || 0, color: Colors.success[500] },
                  { icon: 'arrow-down', label: 'Inkomend', value: callStats.callSummary.totalIncoming || 0, color: Colors.secondary[500] },
                  { icon: 'close', label: 'Gemist', value: callStats.callSummary.totalMissed || 0, color: Colors.error[500] },
                ].map((stat, index) => (
                  <View key={index} style={styles.callStatItem}>
                    <Ionicons name={`${stat.icon}-outline`} size={20} color={stat.color} />
                    <Typography variant="h5" color="text.primary" style={styles.callStatValue}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeContainer: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  greeting: {
    fontWeight: '700',
  },
  waveEmoji: {
    marginLeft: Spacing.sm,
  },
  profileButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
  currentActivityCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statLabel: {
    marginLeft: Spacing.xs,
  },
  statValue: {
    marginBottom: Spacing.sm,
  },
  progressBar: {
    marginVertical: Spacing.sm,
  },
  callStatsCard: {
    padding: Spacing.md,
  },
  callStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  callStatValue: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
});

export default DashboardScreen;