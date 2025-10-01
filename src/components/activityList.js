// src/components/ActivityList.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import databaseService from '../services/database';
import errorHandler from '../services/errorLogger';

const ActivityList = ({ limit = 10 }) => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      // Bereken timestamp van begin van de dag
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startTimestamp = today.getTime();
      
      // Bereken timestamp van einde van de dag
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const endTimestamp = endOfDay.getTime();
      
      // Haal activiteiten op van de huidige dag
      const result = await databaseService.getActivities(startTimestamp, endTimestamp);
      
      // Sorteer op starttijd (nieuwste eerst)
      const sortedActivities = result.sort((a, b) => b.start_time - a.start_time);
      
      // Beperk tot opgegeven limiet
      setActivities(sortedActivities.slice(0, limit));
    } catch (error) {
      errorHandler.error('Fout bij laden van activiteiten', error, 'ActivityList');
    } finally {
      setIsLoading(false);
    }
  };

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
      case 'steps':
        return 'Stappen';
      case 'calories':
        return 'Calorieën';
      case 'heart_rate':
        return 'Hartslag';
      case 'workout':
        return 'Workout';
      case 'sleep':
        return 'Slaap';
      case 'distance':
        return 'Afstand';
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
      case 'steps':
        return 'walk-outline';
      case 'calories':
        return 'flame-outline';
      case 'heart_rate':
        return 'heart-outline';
      case 'workout':
        return 'fitness-outline';
      case 'sleep':
        return 'moon-outline';
      case 'distance':
        return 'map-outline';
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
  
  // Format timestamp naar tijdnotatie
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Helper functie om waarde te formatteren op basis van type
  const formatActivityValue = (activity) => {
    const value = activity.value;
    if (!value || value <= 0) return null;
    
    switch (activity.type) {
      case 'steps':
        return `${value.toLocaleString()} stappen`;
      case 'calories':
        return `${Math.round(value)} kcal`;
      case 'heart_rate':
        return `${Math.round(value)} bpm`;
      case 'distance':
        return `${(value / 1000).toFixed(1)} km`;
      case 'sleep':
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        return `${hours}h ${minutes}m`;
      default:
        return null;
    }
  };

  // Definieer ActivityItem component
  const ActivityItem = ({ activity }) => {
    // Parse details voor meer informatie (oude format)
    let details = {};
    try {
      if (activity.details) {
        details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details;
      }
    } catch (e) {
      details = {};
    }
    
    // Bepaal welke waarde te tonen (nieuwe format heeft priority)
    const activityValue = formatActivityValue(activity);
    const hasLegacySteps = details && details.steps > 0;
    
    return (
      <View style={styles.activityItem}>
        <View style={styles.activityIconContainer}>
          <Ionicons 
            name={getActivityIcon(activity.type)} 
            size={24} 
            color="#4F8EF7" 
          />
        </View>
        
        <View style={styles.activityInfo}>
          <Text style={styles.activityType}>{getActivityLabel(activity.type)}</Text>
          
          <View style={styles.activityDetails}>
            <Text style={styles.activityTime}>
              {formatTime(activity.start_time)} - {activity.end_time ? formatTime(activity.end_time) : 'Nu'}
            </Text>
            
            {activity.duration && activity.duration > 0 && (
              <Text style={styles.activityDuration}>
                {formatDuration(activity.duration)}
              </Text>
            )}
          </View>
          
          {/* Toon nieuwe format waarde als beschikbaar */}
          {activityValue && (
            <Text style={styles.activitySteps}>
              {activityValue}
            </Text>
          )}
          
          {/* Fallback naar oude format als nieuwe format niet beschikbaar is */}
          {!activityValue && hasLegacySteps && (
            <Text style={styles.activitySteps}>
              {details.steps} stappen
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4F8EF7" />
        <Text style={styles.loadingText}>Activiteiten laden...</Text>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="walk-outline" size={48} color="#B8C2CC" />
        <Text style={styles.emptyText}>Geen activiteiten geregistreerd vandaag</Text>
      </View>
    );
  }

  // Geoptimaliseerde rendering zonder FlatList
  return (
    <View style={styles.listContainer}>
      {activities.map(activity => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 5,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    alignItems: 'center',
  },
  activityIconContainer: {
    backgroundColor: '#EBF3FF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  activityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  activityDuration: {
    fontSize: 14,
    color: '#4F8EF7',
    fontWeight: '500',
  },
  activitySteps: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#7F8C8D',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#7F8C8D',
    fontSize: 16,
    marginTop: 10,
  },
});

export default ActivityList;