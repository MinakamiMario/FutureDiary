// components/narrativeSummary.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getNarrativeSummary, regenerateNarrativeSummary } from '../services/summaryService';
import { formatDateToReadable } from '../utils/formatters';
import UserNotesInput from './UserNotesInput';

const NarrativeSummary = ({ date, onRefresh }) => {
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userNotes, setUserNotes] = useState([]);

  useEffect(() => {
    loadNarrative();
  }, [date]);

  const loadNarrative = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if date is in the future
      const today = new Date();
      const selectedDate = new Date(date);
      today.setHours(23, 59, 59, 999);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        setError('Kan geen dagboek genereren voor een toekomstige datum. Selecteer een datum van vandaag of eerder.');
        setNarrative(null);
        setLoading(false);
        return;
      }
      
      const summaryData = await getNarrativeSummary(date);
      
      if (summaryData && summaryData.error === 'FUTURE_DATE') {
        setError(summaryData.message || 'Kan geen dagboek genereren voor een toekomstige datum.');
        setNarrative(null);
      } else if (summaryData && summaryData.summary) {
        setNarrative(summaryData.summary);
      } else {
        setNarrative(null);
      }
    } catch (err) {
      console.error('Error loading narrative:', err);
      setError('Er is een fout opgetreden bij het laden van je dagverhaal.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const newNarrative = await regenerateNarrativeSummary(date);
      setNarrative(newNarrative);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error refreshing narrative:', err);
      setError('Er is een fout opgetreden bij het vernieuwen van je dagverhaal.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotesChange = (notes) => {
    setUserNotes(notes);
    // When notes change, we could auto-regenerate the narrative
    // For now, we'll let the user manually refresh
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Je dagverhaal wordt geladen...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={32} color="#cc3300" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadNarrative}>
          <Text style={styles.retryButtonText}>Opnieuw proberen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!narrative) {
    return (
      <View style={styles.container}>
        {/* User Notes Input - Always available */}
        <UserNotesInput 
          date={date} 
          onNotesChange={handleNotesChange}
          style={styles.notesInput}
        />
        
        <View style={styles.emptyContainer}>
          <Icon name="book-outline" size={48} color="#999999" />
          <Text style={styles.emptyText}>Er is nog geen dagverhaal beschikbaar voor deze dag.</Text>
          {userNotes.length > 0 && (
            <Text style={styles.notesHintText}>
              💡 Je hebt {userNotes.length} notitie(s) toegevoegd. Genereer je verhaal om ze te zien!
            </Text>
          )}
          <TouchableOpacity style={styles.generateButton} onPress={handleRefresh}>
            <Text style={styles.generateButtonText}>
              {userNotes.length > 0 ? 'Genereer verhaal met notities' : 'Genereer dagverhaal'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* User Notes Input - Always available */}
      <UserNotesInput 
        date={date} 
        onNotesChange={handleNotesChange}
        style={styles.notesInput}
      />
      
      <View style={styles.narrativeSection}>
        <View style={styles.header}>
          <Text style={styles.title}>Je dag in verhaalvorm</Text>
          <Text style={styles.date}>{formatDateToReadable(date)}</Text>
        </View>
        
        <ScrollView style={styles.narrativeContainer}>
          <Text style={styles.narrativeText}>{narrative}</Text>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <React.Fragment>
                <Icon name="refresh-outline" size={18} color="#ffffff" />
                <Text style={styles.refreshButtonText}>
                  {userNotes.length > 0 ? 'Vernieuwen met notities' : 'Vernieuwen'}
                </Text>
              </React.Fragment>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
  },
  notesInput: {
    marginBottom: 8,
  },
  narrativeSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  date: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  narrativeContainer: {
    flex: 1,
    marginVertical: 12,
  },
  narrativeText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  refreshButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    marginLeft: 6,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#cc3300',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#333333',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  generateButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0066cc',
    borderRadius: 20,
  },
  generateButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  notesHintText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4a90e2',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NarrativeSummary;