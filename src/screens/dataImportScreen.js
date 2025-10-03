// src/screens/dataImportScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Linking,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Services
import healthDataService from '../services/healthDataService';
import callLogService from '../services/callLogService';
import stravaService from '../services/stravaService';
import { useAppContext } from '../utils/appContext';
import { useTheme } from '../utils/themeContext';

// Components
import Card from '../components/ui/Card';
import Typography from '../components/ui/Typography';
import Button from '../components/ui/Button';
import StravaAuthWebView from '../components/StravaAuthWebView';
import { Colors, Spacing } from '../styles/designSystem';

const DataImportScreen = ({ navigation }) => {
  const { settings } = useAppContext();
  const theme = useTheme();
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({});
  const [availableSources, setAvailableSources] = useState({});
  const [healthDataAvailability, setHealthDataAvailability] = useState({});
  const [stravaStatus, setStravaStatus] = useState({
    connected: false,
    profile: null
  });
  const [showStravaAuth, setShowStravaAuth] = useState(false);

  useEffect(() => {
    loadAvailableSources();
  }, []);

  const loadAvailableSources = async () => {
    try {
      // Check health data service availability (Apple Health / Google Fit)
      const healthDataSources = await healthDataService.getHealthDataAvailability();
      
      // Check call log availability
      const callLogAvailable = callLogService.isAvailable || callLogService.isDemoMode;
      
      setAvailableSources({
        callLog: {
          available: callLogAvailable,
          platform: 'android',
          demoMode: callLogService.isDemoMode
        }
      });

      setHealthDataAvailability(healthDataSources);


      // Check Strava availability
      if (stravaService.isAvailable()) {
        try {
          await stravaService.initialize();
          setStravaStatus({
            connected: stravaService.isReady(),
            profile: stravaService.userProfile
          });
        } catch (error) {
          console.error('Strava initialization error:', error);
        }
      }
    } catch (error) {
      console.error('Error loading available sources:', error);
    }
  };

  // Legacy import function - now redirects to health platform import
  const importHealthData = async (daysBack = 30) => {
    await importHealthPlatformData(daysBack, ['all']);
  };

  // Import from Apple Health or Google Fit
  const importHealthPlatformData = async (daysBack = 30, dataTypes = ['all']) => {
    if (!healthDataAvailability.hasHealthAccess) {
      Alert.alert(
        'Health Platform Niet Beschikbaar',
        `Google Fit is niet beschikbaar of toegang is niet verleend.`
      );
      return;
    }

    try {
      setIsImporting(true);
      
      const endDate = Date.now();
      const startDate = endDate - (daysBack * 24 * 60 * 60 * 1000);
      
      const result = await healthDataService.importHealthData(startDate, endDate, dataTypes);
      
      setImportStatus(prev => ({
        ...prev,
        healthcare: {
          success: result.success,
          imported: result.imported || 0,
          details: result.details,
          errors: result.errors,
          message: result.message,
          platform: 'Google Fit'
        }
      }));

      if (result.success) {
        const platformName = 'Google Fit';
        let detailsText = '';
        
        if (result.details) {
          const details = result.details.google;
          if (details) {
            const parts = [];
            if (details.steps) parts.push(`${details.steps} stappen`);
            if (details.distance) parts.push(`${details.distance} afstand`);
            if (details.calories) parts.push(`${details.calories} calorieën`);
            if (details.workouts) parts.push(`${details.workouts} workouts`);
            if (details.heart_rate) parts.push(`${details.heart_rate} hartslag`);
            detailsText = parts.length > 0 ? `\n\nGeïmporteerd:\n${parts.join('\n')}` : '';
          }
        }
        
        Alert.alert(
          `${platformName} Data Geïmporteerd`,
          `${result.imported} health data items geïmporteerd van de laatste ${daysBack} dagen.${detailsText}`
        );
      } else {
        Alert.alert('Import Fout', result.message || 'Er is een fout opgetreden bij het importeren');
      }

    } catch (error) {
      console.error('Health platform import error:', error);
      Alert.alert('Import Fout', 'Er is een fout opgetreden bij het importeren van health data');
    } finally {
      setIsImporting(false);
    }
  };

  // Import last week from health platform
  const importHealthPlatformLastWeek = async () => {
    await importHealthPlatformData(7, ['all']);
  };

  // Import last 30 days from health platform
  const importHealthPlatformLast30Days = async () => {
    await importHealthPlatformData(30, ['all']);
  };

  // Import specific data types
  const importSpecificHealthData = async (dataTypes) => {
    await importHealthPlatformData(30, dataTypes);
  };


  const importCallLogData = async (daysBack = 30) => {
    if (!availableSources.callLog?.available) {
      Alert.alert(
        'Call Log Niet Beschikbaar',
        'Call log import is alleen beschikbaar op Android apparaten'
      );
      return;
    }

    try {
      setIsImporting(true);
      
      const result = await callLogService.importHistoricalCallLogs(daysBack);
      
      setImportStatus(prev => ({
        ...prev,
        callLog: {
          success: result.success,
          imported: result.imported || 0,
          message: result.message
        }
      }));

      if (result.success) {
        Alert.alert(
          'Call Log Geïmporteerd',
          `${result.imported} oproepen geïmporteerd uit de laatste ${daysBack} dagen`
        );
      } else {
        Alert.alert('Import Fout', result.message);
      }

    } catch (error) {
      console.error('Call log import error:', error);
      Alert.alert('Import Fout', 'Er is een fout opgetreden bij het importeren van call log data');
    } finally {
      setIsImporting(false);
    }
  };

  // Strava connection and import functions
  const connectToStrava = () => {
    setShowStravaAuth(true);
  };

  // Handle successful Strava OAuth
  const handleStravaAuthSuccess = async (tokens, athlete) => {
    try {
      setIsImporting(true);
      
      const result = await stravaService.handleOAuthSuccess(tokens, athlete);
      
      if (result.success) {
        setStravaStatus({
          connected: true,
          profile: athlete
        });
        
        Alert.alert(
          '✅ Strava Verbonden!',
          `Succesvol verbonden als ${athlete?.firstname || 'Strava gebruiker'}`,
          [{ text: 'Geweldig!', style: 'default' }]
        );
      } else {
        Alert.alert('Fout', result.error || 'Er ging iets mis bij het opslaan van je Strava gegevens');
      }
    } catch (error) {
      console.error('OAuth success handling error:', error);
      Alert.alert('Fout', 'Er ging iets mis bij het verbinden met Strava');
    } finally {
      setIsImporting(false);
      setShowStravaAuth(false);
    }
  };

  // Handle Strava OAuth errors
  const handleStravaAuthError = (error) => {
    console.error('Strava OAuth error:', error);
    Alert.alert(
      'Strava Autorisatie Mislukt',
      error || 'Er ging iets mis bij het verbinden met Strava. Probeer het opnieuw.',
      [{ text: 'OK', style: 'default' }]
    );
    setShowStravaAuth(false);
  };

  // Handle Strava OAuth cancellation
  const handleStravaAuthCancel = () => {
    setShowStravaAuth(false);
  };

  const importStravaData = async (daysBack = 30) => {
    if (!stravaStatus.connected) {
      Alert.alert(
        'Strava Niet Verbonden',
        'Verbind eerst met Strava voordat je gegevens kunt importeren.',
        [
          { text: 'Annuleren', style: 'cancel' },
          { text: 'Verbinden', onPress: connectToStrava }
        ]
      );
      return;
    }

    try {
      setIsImporting(true);
      
      const result = await stravaService.importActivities(daysBack);
      
      setImportStatus(prev => ({
        ...prev,
        strava: {
          success: result.success,
          imported: result.imported || 0,
          message: result.message
        }
      }));

      if (result.success) {
        Alert.alert(
          'Strava Data Geïmporteerd',
          `${result.imported} Strava activiteiten geïmporteerd uit de laatste ${daysBack} dagen`
        );
      } else {
        Alert.alert('Import Fout', result.message);
      }

    } catch (error) {
      console.error('Strava import error:', error);
      Alert.alert('Import Fout', 'Er is een fout opgetreden bij het importeren van Strava data');
    } finally {
      setIsImporting(false);
    }
  };

  const importAllData = async () => {
    Alert.alert(
      'Alle Data Importeren',
      'Dit importeert historische data van de laatste 30 dagen uit alle beschikbare bronnen. Dit kan even duren.',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Importeren',
          onPress: async () => {
            setIsImporting(true);
            
            // Import Apple Health / Google Fit data if available
            if (healthDataAvailability.hasHealthAccess) {
              await importHealthPlatformData(30, ['all']);
            }
            
            // Import call log data if available
            if (availableSources.callLog?.available) {
              await importCallLogData(30);
            }
            
            
            // Import Strava data if connected
            if (stravaStatus.connected) {
              await importStravaData(30);
            }
            
            setIsImporting(false);
            
            Alert.alert(
              'Import Voltooid',
              'Alle beschikbare historische data is geïmporteerd. Je kunt nu de app gebruiken met je bestaande gegevens.'
            );
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h4" color="text.primary">
            Data Import
          </Typography>
          <Typography variant="body2" color="text.secondary" style={styles.subtitle}>
            Importeer je bestaande gegevens van vandaag en eerdere dagen
          </Typography>
        </View>

        {/* Health Data Section */}
        <View style={styles.section}>
          <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>
            Health & Fitness Data
          </Typography>

          {/* Apple Health / Google Fit Section */}
          <Card variant="elevated" style={styles.cardMargin}>
            <View style={styles.sourceRow}>
              <View style={styles.sourceInfo}>
                <Icon 
                  name="fitness-outline" 
                  size={24} 
                  color={healthDataAvailability.hasHealthAccess ? Colors.success[500] : Colors.gray[400]} 
                />
                <View style={styles.sourceText}>
                  <Typography variant="body1" color="text.primary">
                    Google Fit
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {healthDataAvailability.demoMode 
                      ? `Production mode - echte health data via ${healthDataAvailability.platform} voor ${healthDataAvailability.supportedDataTypes?.length || 0} data types`
                      : healthDataAvailability.hasHealthAccess 
                        ? `Volledig health platform: stappen, workouts, hartslag, slaap, calorieën, afstand, hoogte`
                        : `Google Fit toegang vereist voor volledige health data`
                    }
                  </Typography>
                </View>
              </View>
              
              <View style={styles.buttonGroup}>
                <Button
                  title="Week"
                  onPress={importHealthPlatformLastWeek}
                  disabled={!healthDataAvailability.hasHealthAccess || isImporting}
                  size="small"
                  variant="outlined"
                  style={styles.smallButton}
                />
                <Button
                  title="30 dagen"
                  onPress={importHealthPlatformLast30Days}
                  disabled={!healthDataAvailability.hasHealthAccess || isImporting}
                  size="small"
                  style={styles.smallButton}
                />
              </View>
            </View>
            
            {/* Google Fit Advanced Options */}
            {healthDataAvailability.hasHealthAccess && (
              <View style={styles.advancedOptionsRow}>
                <Typography variant="caption" color="text.secondary" style={styles.advancedTitle}>
                  Beschikbare data types (via Google Fit):
                </Typography>
                <View style={styles.dataTypeButtons}>
                  <Button
                    title="Workouts"
                    onPress={() => importSpecificHealthData(['workouts'])}
                    disabled={isImporting}
                    size="small"
                    variant="text"
                  />
                  <Button
                    title="Stappen"
                    onPress={() => importSpecificHealthData(['steps'])}
                    disabled={isImporting}
                    size="small"
                    variant="text"
                  />
                  <Button
                    title="Hartslag"
                    onPress={() => importSpecificHealthData(['heart_rate'])}
                    disabled={isImporting}
                    size="small"
                    variant="text"
                  />
                  <Button
                    title="Calorieën"
                    onPress={() => importSpecificHealthData(['calories'])}
                    disabled={isImporting}
                    size="small"
                    variant="text"
                  />
                  <Button
                    title="Afstand"
                    onPress={() => importSpecificHealthData(['distance'])}
                    disabled={isImporting}
                    size="small"
                    variant="text"
                  />
                  <Button
                    title="Slaap"
                    onPress={() => importSpecificHealthData(['sleep'])}
                    disabled={isImporting}
                    size="small"
                    variant="text"
                  />
                </View>
              </View>
            )}
            
            {importStatus.healthcare && (
              <View style={[styles.statusRow, { backgroundColor: theme.colors.background.secondary }]}>
                <Icon 
                  name={importStatus.healthcare.success ? "checkmark-circle" : "alert-circle"} 
                  size={16} 
                  color={importStatus.healthcare.success ? Colors.success[500] : Colors.error[500]} 
                />
                <Typography variant="caption" color="text.secondary" style={styles.statusText}>
                  {importStatus.healthcare.success 
                    ? `✅ ${importStatus.healthcare.imported} items van ${importStatus.healthcare.platform} geïmporteerd`
                    : `❌ ${importStatus.healthcare.message}`
                  }
                </Typography>
              </View>
            )}
          </Card>


        </View>

        {/* Call Log Section */}
        <View style={styles.section}>
          <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>
            Oproepgeschiedenis
          </Typography>
          
          <Card variant="elevated">
            <View style={styles.sourceRow}>
              <View style={styles.sourceInfo}>
                <Icon 
                  name="call-outline" 
                  size={24} 
                  color={availableSources.callLog?.available ? Colors.success[500] : Colors.gray[400]} 
                />
                <View style={styles.sourceText}>
                  <Typography variant="body1" color="text.primary">
                    Telefoon Call Log
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {availableSources.callLog?.available 
                      ? `Inkomende, uitgaande en gemiste oproepen${availableSources.callLog?.demoMode ? ' (demo mode)' : ''}`
                      : 'Alleen beschikbaar op Android'
                    }
                  </Typography>
                </View>
              </View>
              
              <Button
                title="Importeren"
                onPress={() => importCallLogData(30)}
                disabled={!availableSources.callLog?.available || isImporting}
                size="small"
              />
            </View>
            
            {importStatus.callLog && (
              <View style={[styles.statusRow, { backgroundColor: theme.colors.background.secondary }]}>
                <Icon 
                  name={importStatus.callLog.success ? "checkmark-circle" : "alert-circle"} 
                  size={16} 
                  color={importStatus.callLog.success ? Colors.success[500] : Colors.error[500]} 
                />
                <Typography variant="caption" color="text.secondary" style={styles.statusText}>
                  {importStatus.callLog.success 
                    ? `✅ ${importStatus.callLog.imported} oproepen geïmporteerd`
                    : `❌ ${importStatus.callLog.message}`
                  }
                </Typography>
              </View>
            )}
          </Card>
        </View>

        {/* Strava Section */}
        <View style={styles.section}>
          <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>
            Strava Activiteiten
          </Typography>
          
          <Card variant="elevated">
            <View style={styles.sourceRow}>
              <View style={styles.sourceInfo}>
                <Icon 
                  name="bicycle" 
                  size={24} 
                  color={stravaStatus.connected ? "#FC4C02" : Colors.gray[400]} 
                />
                <View style={styles.sourceText}>
                  <Typography variant="body1" color="text.primary">
                    Strava
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stravaStatus.connected 
                      ? `Verbonden als ${stravaStatus.profile?.firstname || 'Demo User'} - workouts, routes, prestaties`
                      : 'Verbind met Strava om je workouts en routes te importeren'
                    }
                  </Typography>
                </View>
              </View>
              
              <View style={styles.buttonGroup}>
                {!stravaStatus.connected ? (
                  <Button
                    title="Verbinden"
                    onPress={connectToStrava}
                    disabled={isImporting}
                    size="small"
                    style={styles.smallButton}
                  />
                ) : (
                  <>
                    <Button
                      title="Opnieuw Verbinden"
                      onPress={connectToStrava}
                      disabled={isImporting}
                      size="small"
                      variant="outlined"
                      style={styles.smallButton}
                    />
                    <Button
                      title="Week"
                      onPress={() => importStravaData(7)}
                      disabled={isImporting}
                      size="small"
                      variant="outlined"
                      style={styles.smallButton}
                    />
                    <Button
                      title="30 dagen"
                      onPress={() => importStravaData(30)}
                      disabled={isImporting}
                      size="small"
                      style={styles.smallButton}
                    />
                  </>
                )}
                
                <Button
                  title="OAuth Testen"
                  onPress={connectToStrava}
                  disabled={isImporting}
                  size="small"
                  variant="outlined"
                  style={[styles.smallButton, {backgroundColor: '#FC4C02', marginTop: 5}]}
                />
              </View>
            </View>
            
            {importStatus.strava && (
              <View style={[styles.statusRow, { backgroundColor: theme.colors.background.secondary }]}>
                <Icon 
                  name={importStatus.strava.success ? "checkmark-circle" : "alert-circle"} 
                  size={16} 
                  color={importStatus.strava.success ? Colors.success[500] : Colors.error[500]} 
                />
                <Typography variant="caption" color="text.secondary" style={styles.statusText}>
                  {importStatus.strava.success 
                    ? `✅ ${importStatus.strava.imported} Strava activiteiten geïmporteerd`
                    : `❌ ${importStatus.strava.message}`
                  }
                </Typography>
              </View>
            )}
          </Card>
        </View>


        {/* Import All Section */}
        <View style={styles.section}>
          <Card variant="elevated">
            <View style={styles.importAllSection}>
              <View style={styles.importAllHeader}>
                <Icon name="download-outline" size={32} color={Colors.primary[500]} />
                <View style={styles.importAllText}>
                  <Typography variant="h6" color="text.primary">
                    Alles Importeren
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Importeer alle beschikbare historische data van de laatste 30 dagen in één keer
                  </Typography>
                </View>
              </View>
              
              <Button
                title={isImporting ? "Bezig met importeren..." : "Start Import"}
                onPress={importAllData}
                disabled={isImporting}
                variant="primary"
                style={styles.importAllButton}
              />
            </View>
          </Card>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Card variant="outlined">
            <View style={styles.infoSection}>
              <Icon name="information-circle-outline" size={24} color={Colors.primary[500]} />
              <View style={styles.infoText}>
                <Typography variant="body2" color="text.secondary">
                  <Typography variant="body2" color="text.primary" weight="500">Let op:</Typography> 
                  {' '}Deze import haalt bestaande gegevens op van je apparaat. Voor volledige functionaliteit installeer je de APK op een echt Android/iOS apparaat met health platforms geïnstalleerd.
                </Typography>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Strava OAuth WebView */}
      <StravaAuthWebView
        visible={showStravaAuth}
        onSuccess={handleStravaAuthSuccess}
        onError={handleStravaAuthError}
        onCancel={handleStravaAuthCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.md,
    padding: Spacing.sm,
    borderRadius: 8,
  },
  statusText: {
    marginLeft: Spacing.xs,
    flex: 1,
  },
  importAllSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  importAllHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  importAllText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  importAllButton: {
    minWidth: 200,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  infoText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  cardMargin: {
    marginBottom: Spacing.md,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallButton: {
    marginLeft: Spacing.xs,
    minWidth: 60,
  },
  advancedOptionsRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  advancedTitle: {
    marginBottom: Spacing.xs,
  },
  dataTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
});

export default DataImportScreen;