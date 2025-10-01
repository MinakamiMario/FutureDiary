// src/components/TrendsComponent.js
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const TrendsComponent = ({ trends }) => {
  if (!trends) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>Geen trendgegevens beschikbaar</Text>
      </View>
    );
  }

  // Format getallen voor weergave
  const formatNumber = (number) => {
    return Math.round(number).toLocaleString('nl-NL');
  };

  // Bereken de trendpijl op basis van veranderingspercentage
  const getTrendIcon = (changePercentage) => {
    if (changePercentage > 5) {
      return <Ionicons name="arrow-up" size={16} color="#4CAF50" />;
    } else if (changePercentage < -5) {
      return <Ionicons name="arrow-down" size={16} color="#F44336" />;
    } else {
      return <Ionicons name="remove" size={16} color="#FFC107" />;
    }
  };

  // Bereken de trendkleur op basis van veranderingspercentage
  const getTrendColor = (changePercentage) => {
    if (changePercentage > 5) {
      return '#4CAF50';
    } else if (changePercentage < -5) {
      return '#F44336';
    } else {
      return '#FFC107';
    }
  };

  // Bepaal labels voor grafieken
  const days = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const labels = trends.stepsPerDay.map(item => {
    const date = new Date(item.date);
    return days[date.getDay()];
  });

  // Bereid steps data voor voor de grafiek
  const stepsData = trends.stepsPerDay.map(item => item.steps);

  // Bereid activeTime data voor voor de grafiek (omzetten naar minuten)
  const activeTimeData = trends.activeTimePerDay.map(item => item.activeTime / (1000 * 60));

  // Custom Chart Component - Simple en stabiel
  const SimpleLineChart = ({ data, title, unit = '' }) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartPlaceholderText}>Geen data beschikbaar</Text>
        </View>
      );
    }

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    
    const chartWidth = Dimensions.get('window').width - 60;
    const chartHeight = 120;
    const barWidth = chartWidth / data.length - 2;

    return (
      <View style={styles.customChart}>
        <View style={styles.chartBars}>
          {data.map((value, index) => {
            const normalizedHeight = ((value - minValue) / range) * chartHeight;
            const barHeight = Math.max(normalizedHeight, 5); // Minimum height voor zichtbaarheid
            
            return (
              <View key={index} style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: barHeight, 
                      width: barWidth,
                      backgroundColor: title.includes('Stappen') ? '#4F8EF7' : '#4CAF50'
                    }
                  ]} 
                />
                <Text style={styles.barLabel}>
                  {labels[index]}
                </Text>
                <Text style={styles.barValue}>
                  {Math.round(value)}{unit}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Statistieken overzicht */}
      <View style={styles.statsOverview}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Gem. stappen</Text>
          <View style={styles.statValueContainer}>
            <Text style={styles.statValue}>{formatNumber(trends.avgSteps)}</Text>
            <View style={styles.trendIndicator}>
              {getTrendIcon(trends.stepsChange)}
              <Text style={[styles.changePercentage, { color: getTrendColor(trends.stepsChange) }]}>
                {Math.abs(Math.round(trends.stepsChange))}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Gem. actieve tijd</Text>
          <View style={styles.statValueContainer}>
            <Text style={styles.statValue}>
              {formatNumber(trends.avgActiveTime / (1000 * 60))} min
            </Text>
            <View style={styles.trendIndicator}>
              {getTrendIcon(trends.activeTimeChange)}
              <Text style={[styles.changePercentage, { color: getTrendColor(trends.activeTimeChange) }]}>
                {Math.abs(Math.round(trends.activeTimeChange))}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stappen grafiek */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Stappen (laatste {trends.daysInPeriod} dagen)</Text>
        <SimpleLineChart data={stepsData} title="Stappen" />
      </View>

      {/* Actieve tijd grafiek */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Actieve tijd (minuten)</Text>
        <SimpleLineChart data={activeTimeData} title="Actieve tijd" unit=" min" />
      </View>

      {/* Activiteitstype overzicht */}
      {trends.activityTypes && Object.keys(trends.activityTypes).length > 0 && (
        <View style={styles.activitiesContainer}>
          <Text style={styles.chartTitle}>Activiteitsoverzicht</Text>
          <View style={styles.activitiesList}>
            {Object.entries(trends.activityTypes).map(([type, count]) => (
              <View key={type} style={styles.activityItem}>
                <View style={styles.activityIconContainer}>
                  <Ionicons
                    name={
                      type === 'walking'
                        ? 'walk-outline'
                        : type === 'running'
                        ? 'fitness-outline'
                        : type === 'still'
                        ? 'body-outline'
                        : type === 'stationary_activity'
                        ? 'desktop-outline'
                        : 'help-circle-outline'
                    }
                    size={20}
                    color="#4F8EF7"
                  />
                </View>
                <Text style={styles.activityLabel}>
                  {type === 'walking'
                    ? 'Lopen'
                    : type === 'running'
                    ? 'Rennen'
                    : type === 'still'
                    ? 'Stilstaan'
                    : type === 'stationary_activity'
                    ? 'Zittend'
                    : 'Onbekend'}
                </Text>
                <Text style={styles.activityCount}>{count}x</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 5,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    color: '#7F8C8D',
    fontSize: 16,
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 15,
    width: '48%',
  },
  statLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changePercentage: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 2,
  },
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  chart: {
    borderRadius: 10,
  },
  activitiesContainer: {
    marginBottom: 20,
  },
  activitiesList: {},
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  activityIconContainer: {
    backgroundColor: '#EBF3FF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityLabel: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  activityCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F8EF7',
  },
  chartPlaceholder: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  customChart: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    minHeight: 160,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    marginBottom: 10,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    borderRadius: 4,
    marginBottom: 5,
  },
  barLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  barValue: {
    fontSize: 10,
    color: '#2C3E50',
    fontWeight: '600',
  },
});

export default TrendsComponent;