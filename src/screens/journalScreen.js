// screens/journalScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Modal,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import NarrativeSummary from '../components/narrativeSummary';
import FloatingNoteButton from '../components/FloatingNoteButton';
import Typography from '../components/ui/Typography';
import { getNarrativeSummaries, generateWeeklySummary, generateMonthlySummary } from '../services/summaryService';
import { formatDateToYYYYMMDD, getCurrentDateYYYYMMDD, formatDateToReadable } from '../utils/formatters';
import { Colors, Spacing, Typography as DesignTypography, BorderRadius, Shadows } from '../styles/designSystem';

const JournalScreen = ({ navigation }) => {
  const [narratives, setNarratives] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Laad samenvattingen wanneer het scherm focus krijgt of wanneer de datum verandert
  useFocusEffect(
    useCallback(() => {
      loadNarratives();
    }, [selectedDate, viewMode])
  );

  const loadNarratives = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (viewMode === 'day') {
        // Voor dagweergave haal individuele dagelijkse samenvattingen op
        const startDate = new Date(selectedDate);
        const endDate = new Date(selectedDate);
        const summaries = await getNarrativeSummaries(startDate, endDate);
        setNarratives(summaries);
        
      } else if (viewMode === 'week') {
        // Voor weekweergave genereer gecombineerde wekelijkse samenvatting
        try {
          const weeklySummary = await generateWeeklySummary(selectedDate);
          if (weeklySummary.success) {
            // Toon als één gecombineerd verhaal
            setNarratives([{
              date: weeklySummary.startDate,
              summary: weeklySummary.narrative,
              period: 'week',
              periodName: `Week van ${new Date(weeklySummary.startDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} - ${new Date(weeklySummary.endDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`,
              daysIncluded: weeklySummary.daysIncluded
            }]);
          } else {
            setError(weeklySummary.message || 'Kon geen wekelijkse samenvatting genereren.');
            setNarratives([]);
          }
        } catch (weekError) {
          console.error('Error generating weekly summary:', weekError);
          setError('Er is een fout opgetreden bij het genereren van de wekelijkse samenvatting.');
          setNarratives([]);
        }
        
      } else if (viewMode === 'month') {
        // Voor maandweergave genereer gecombineerde maandelijkse samenvatting
        try {
          const monthlySummary = await generateMonthlySummary(selectedDate);
          if (monthlySummary.success) {
            // Toon als één gecombineerd verhaal
            setNarratives([{
              date: monthlySummary.startDate,
              summary: monthlySummary.narrative,
              period: 'month',
              periodName: monthlySummary.monthName,
              daysIncluded: monthlySummary.daysIncluded
            }]);
          } else {
            setError(monthlySummary.message || 'Kon geen maandelijkse samenvatting genereren.');
            setNarratives([]);
          }
        } catch (monthError) {
          console.error('Error generating monthly summary:', monthError);
          setError('Er is een fout opgetreden bij het genereren van de maandelijkse samenvatting.');
          setNarratives([]);
        }
      }
    } catch (err) {
      console.error('Error loading narratives:', err);
      setError('Er is een fout opgetreden bij het laden van je dagboek.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNarratives();
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      // Don't allow future dates
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (date <= today) {
        setSelectedDate(date);
      }
    }
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    const today = new Date();
    newDate.setDate(newDate.getDate() + 1);
    if (newDate <= today) {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const renderNarrativeSummary = () => {
    if (viewMode === 'day') {
      return <NarrativeSummary date={selectedDate} onRefresh={loadNarratives} />;
    } else {
      // Wanneer in week- of maandmodus, toon een lijst met samenvattingen
      return (
        <FlatList
          data={narratives}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.narrativeCard,
                item.period && styles.periodCard
              ]}
              onPress={() => {
                if (!item.period) {
                  setSelectedDate(new Date(item.date));
                  setViewMode('day');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.narrativeHeader}>
                <View style={styles.narrativeDateContainer}>
                  <Ionicons 
                    name={item.period ? 
                      (item.period === 'week' ? 'calendar' : 'grid') : 
                      'document-text'
                    } 
                    size={20} 
                    color={item.period ? Colors.primary[600] : Colors.gray[500]} 
                    style={styles.narrativeIcon}
                  />
                  <Text style={[
                    styles.narrativeDate,
                    item.period && styles.periodTitle
                  ]}>
                    {item.period ? item.periodName : formatDateToReadable(item.date)}
                  </Text>
                </View>
                {item.period && (
                  <View style={styles.periodBadge}>
                    <Text style={styles.periodSubtitle}>
                      {item.daysIncluded} dagen • {item.period === 'week' ? 'Wekelijks' : 'Maandelijks'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.narrativePreview,
                item.period && styles.periodPreview
              ]} numberOfLines={item.period ? 6 : 3}>
                {item.summary}
              </Text>
              {!item.period && (
                <View style={styles.readMoreContainer}>
                  <Text style={styles.readMoreText}>Lees meer</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary[600]} />
                </View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.narrativesList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="book-outline" size={64} color={Colors.gray[400]} />
              </View>
              <Text style={styles.emptyText}>
                Geen dagverhalen gevonden voor deze periode
              </Text>
              <Text style={styles.emptySubtext}>
                Probeer een andere datum of genereer nieuwe verhalen
              </Text>
            </View>
          }
        />
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="book" size={28} color={Colors.primary[600]} style={styles.headerIcon} />
          <Text style={styles.title}>Mijn Dagboek</Text>
        </View>
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'day' && styles.viewModeButtonActive
            ]}
            onPress={() => handleViewModeChange('day')}
          >
            <Ionicons 
              name="today" 
              size={16} 
              color={viewMode === 'day' ? Colors.white : Colors.gray[600]} 
              style={styles.viewModeIcon}
            />
            <Text
              style={[
                styles.viewModeText,
                viewMode === 'day' && styles.viewModeTextActive
              ]}
            >
              Dag
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'week' && styles.viewModeButtonActive
            ]}
            onPress={() => handleViewModeChange('week')}
          >
            <Ionicons 
              name="calendar" 
              size={16} 
              color={viewMode === 'week' ? Colors.white : Colors.gray[600]} 
              style={styles.viewModeIcon}
            />
            <Text
              style={[
                styles.viewModeText,
                viewMode === 'week' && styles.viewModeTextActive
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'month' && styles.viewModeButtonActive
            ]}
            onPress={() => handleViewModeChange('month')}
          >
            <Ionicons 
              name="grid" 
              size={16} 
              color={viewMode === 'month' ? Colors.white : Colors.gray[600]} 
              style={styles.viewModeIcon}
            />
            <Text
              style={[
                styles.viewModeText,
                viewMode === 'month' && styles.viewModeTextActive
              ]}
            >
              Maand
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Professional calendar navigation */}
      <View style={styles.calendarContainer}>
        <View style={styles.dateNavigation}>
          <TouchableOpacity 
            style={styles.dateNavButton}
            onPress={goToPreviousDay}
          >
            <Ionicons name="chevron-back" size={24} color="#0066cc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.currentDateContainer}
            onPress={openDatePicker}
          >
            <Text style={styles.currentDateText}>{formatDateToReadable(selectedDate)}</Text>
            <Text style={styles.currentDateSubtext}>
              {selectedDate.toLocaleDateString('nl-NL', { weekday: 'long' })}
            </Text>
            <Ionicons name="calendar-outline" size={16} color="#666666" style={styles.calendarIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dateNavButton}
            onPress={goToNextDay}
          >
            <Ionicons name="chevron-forward" size={24} color="#0066cc" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.todayButton}
          onPress={goToToday}
        >
          <Text style={styles.todayButtonText}>Vandaag</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Selecteer datum</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Ionicons name="close" size={24} color="#666666" />
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                style={styles.datePicker}
              />
              
              {Platform.OS === 'android' && (
                <View style={styles.androidButtonContainer}>
                  <TouchableOpacity 
                    style={styles.androidButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.androidButtonText}>Annuleren</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Dagboek wordt geladen...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.error[500]} />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNarratives}>
            <Ionicons name="refresh" size={20} color={Colors.white} style={styles.retryIcon} />
            <Text style={styles.retryButtonText}>Opnieuw proberen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        renderNarrativeSummary()
      )}
      
      {/* Floating + button for quick notes - only show for day view */}
      {viewMode === 'day' && (
        <FloatingNoteButton 
          date={selectedDate} 
          onNoteAdded={loadNarratives}
        />
      )}
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
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: Spacing.sm,
  },
  title: {
    ...DesignTypography.headline.small,
    color: Colors.gray[900],
    fontWeight: '700',
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.full,
    padding: 3,
    ...Shadows.sm,
  },
  viewModeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minWidth: 70,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  viewModeIcon: {
    marginRight: Spacing.xs,
  },
  viewModeButtonActive: {
    backgroundColor: Colors.primary[500],
    ...Shadows.sm,
  },
  viewModeText: {
    ...DesignTypography.label.medium,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  viewModeTextActive: {
    ...DesignTypography.label.medium,
    color: Colors.white,
    fontWeight: '600',
  },
  narrativesList: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  narrativeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  narrativeDate: {
    ...DesignTypography.title.medium,
    color: Colors.gray[900],
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  narrativePreview: {
    ...DesignTypography.body.medium,
    color: Colors.gray[700],
    lineHeight: 22,
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  readMoreText: {
    ...DesignTypography.label.medium,
    color: Colors.primary[600],
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  loadingText: {
    ...DesignTypography.body.medium,
    color: Colors.gray[600],
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  errorIconContainer: {
    marginBottom: Spacing.md,
  },
  errorText: {
    ...DesignTypography.body.medium,
    color: Colors.error[600],
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryIcon: {
    marginRight: Spacing.sm,
  },
  retryButtonText: {
    ...DesignTypography.label.medium,
    color: Colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: Spacing.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
  },
  emptyIconContainer: {
    marginBottom: Spacing.lg,
  },
  emptyText: {
    ...DesignTypography.title.medium,
    color: Colors.gray[700],
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  emptySubtext: {
    ...DesignTypography.body.medium,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  periodCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  narrativeHeader: {
    marginBottom: Spacing.md,
  },
  narrativeDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  narrativeIcon: {
    marginRight: Spacing.sm,
  },
  periodTitle: {
    ...DesignTypography.title.large,
    color: Colors.primary[700],
    fontWeight: '700',
  },
  periodBadge: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  periodSubtitle: {
    ...DesignTypography.label.small,
    color: Colors.primary[700],
    fontWeight: '600',
  },
  periodPreview: {
    ...DesignTypography.body.medium,
    lineHeight: 22,
    color: Colors.gray[800],
  },
  calendarContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dateNavButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  currentDateContainer: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    borderWidth: 2,
    borderColor: Colors.primary[200],
    flexDirection: 'column',
    position: 'relative',
    marginHorizontal: Spacing.md,
  },
  currentDateText: {
    ...DesignTypography.title.medium,
    color: Colors.gray[900],
    fontWeight: '700',
  },
  currentDateSubtext: {
    ...DesignTypography.body.small,
    color: Colors.gray[600],
    marginTop: Spacing.xs,
    textTransform: 'capitalize',
  },
  calendarIcon: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    opacity: 0.6,
  },
  todayButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    ...Shadows.sm,
  },
  todayButtonText: {
    ...DesignTypography.label.medium,
    color: Colors.white,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    margin: Spacing.lg,
    minWidth: 340,
    maxWidth: '90%',
    ...Shadows.xl,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  datePickerTitle: {
    ...DesignTypography.title.large,
    color: Colors.gray[900],
    fontWeight: '700',
  },
  closeButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[100],
  },
  datePicker: {
    alignSelf: 'center',
    backgroundColor: Colors.white,
  },
  androidButtonContainer: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  androidButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    ...Shadows.sm,
  },
  androidButtonText: {
    ...DesignTypography.label.medium,
    color: Colors.gray[700],
    fontWeight: '600',
  },
});

export default JournalScreen;