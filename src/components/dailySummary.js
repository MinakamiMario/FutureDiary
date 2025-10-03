// src/components/DailySummary.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const DailySummary = ({ summary }) => {
  if (!summary) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>Geen samenvatting beschikbaar</Text>
      </View>
    );
  }

  // Parse summary data
  const summaryData = summary.summary_data ? JSON.parse(summary.summary_data) : {};
  
  // Helper functie om activiteitstype om te zetten in leesbare tekst
  const getActivityLabel = (activityType) => {
    switch(activityType) {
      case 'still':
        return 'Stilstaan';
      case 'walking':
        return 'Lopen';
      case 'running':
        return 'Rennen';
      case 'stationary_activity':
        return 'Zittend';
      default:
        return 'Onbekend';
    }
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
  
  // Format milliseconden naar uren en minuten
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return '0 min';
    
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} uur`;
    }
    
    return `${hours} uur ${remainingMinutes} min`;
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.summaryHeader}>
        <Text style={styles.dateText}>
          {summary.date || new Date().toISOString().split('T')[0]}
        </Text>
      </View>
      
      {/* Aktiviteitssectie */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activiteiten</Text>
        
        <View style={styles.activityPeriods}>
          <View style={styles.activityPeriod}>
            <View style={styles.activityIconContainer}>
              <Icon 
                name={getActivityIcon(summary.morning_activity)} 
                size={24} 
                color="#4F8EF7" 
              />
            </View>
            <View>
              <Text style={styles.periodLabel}>Ochtend</Text>
              <Text style={styles.activityLabel}>{getActivityLabel(summary.morning_activity)}</Text>
            </View>
          </View>
          
          <View style={styles.activityPeriod}>
            <View style={styles.activityIconContainer}>
              <Icon 
                name={getActivityIcon(summary.afternoon_activity)} 
                size={24} 
                color="#4F8EF7" 
              />
            </View>
            <View>
              <Text style={styles.periodLabel}>Middag</Text>
              <Text style={styles.activityLabel}>{getActivityLabel(summary.afternoon_activity)}</Text>
            </View>
          </View>
          
          <View style={styles.activityPeriod}>
            <View style={styles.activityIconContainer}>
              <Icon 
                name={getActivityIcon(summary.evening_activity)} 
                size={24} 
                color="#4F8EF7" 
              />
            </View>
            <View>
              <Text style={styles.periodLabel}>Avond</Text>
              <Text style={styles.activityLabel}>{getActivityLabel(summary.evening_activity)}</Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Statistieken sectie */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistieken</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Icon name="footsteps-outline" size={20} color="#4F8EF7" />
            <Text style={styles.statValue}>{summary.total_steps || 0}</Text>
            <Text style={styles.statLabel}>Stappen</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="timer-outline" size={20} color="#4F8EF7" />
            <Text style={styles.statValue}>{formatDuration(summary.total_active_time)}</Text>
            <Text style={styles.statLabel}>Actieve tijd</Text>
          </View>
          
          {summary.most_called_contact && (
            <View style={styles.statItem}>
              <Icon name="call-outline" size={20} color="#4F8EF7" />
              <Text style={styles.statValue}>{summary.most_called_contact}</Text>
              <Text style={styles.statLabel}>Meest gebeld</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryHeader: {
    backgroundColor: '#4F8EF7',
    padding: 12,
    alignItems: 'center',
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  activityPeriods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  activityPeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '33%',
    marginBottom: 10,
  },
  activityIconContainer: {
    backgroundColor: '#EBF3FF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  periodLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  activityLabel: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  noDataText: {
    textAlign: 'center',
    padding: 20,
    color: '#7F8C8D',
  }
});

export default DailySummary;