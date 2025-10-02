// screens/settingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';
import AISettingsScreen from './aiSettingsScreen';
import NarrativeStyleScreen from './narrativeStyleScreen';
import DataImportScreen from './dataImportScreen';
import { getNarrativeStyle, NARRATIVE_STYLES } from '../utils/narrativeStyles';
import { useAppContext } from '../utils/appContext';
import { useTheme } from '../utils/themeContext';
import stravaService from '../services/stravaService';
import healthDataService from '../services/healthDataService';
import StravaAuthWebView from '../components/StravaAuthWebView';
import { Linking } from 'react-native';
import { 
  requestLocationPermissions, 
  requestCallLogPermission,
  requestActivityRecognitionPermission,
  requestNotificationPermission,
  isPermissionGranted,
  PERMISSIONS,
  RESULTS
} from '../utils/permissions';

// Components
import Card from '../components/ui/Card';
import Typography from '../components/ui/Typography';
import Button from '../components/ui/Button';
import { Colors, Spacing, Typography as DesignTypography, BorderRadius, Shadows } from '../styles/designSystem';

const Stack = createStackNavigator();

const SettingsScreen = ({ navigation }) => {
  const { settings, updateSettings } = useAppContext();
  const theme = useTheme();
  const [narrativeStyle, setNarrativeStyle] = useState(NARRATIVE_STYLES.STANDAARD);
  const [stravaWebViewVisible, setStravaWebViewVisible] = useState(false);

  useEffect(() => {
    loadSettings();
    
    // Add focus listener to reload narrative style when returning from the narrative style screen
    const unsubscribe = navigation.addListener('focus', () => {
      loadNarrativeStyle();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadSettings = async () => {
    try {
      // Settings komen nu van context, we hoeven alleen narrative style te laden
      await loadNarrativeStyle();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadNarrativeStyle = async () => {
    try {
      const currentStyle = await getNarrativeStyle();
      setNarrativeStyle(currentStyle);
    } catch (error) {
      console.error('Error loading narrative style:', error);
    }
  };

  const getNarrativeStyleDisplayName = (style) => {
    const styleNames = {
      [NARRATIVE_STYLES.STANDAARD]: 'Standaard',
      [NARRATIVE_STYLES.DETAILED]: 'Gedetailleerd',
      [NARRATIVE_STYLES.CASUAL]: 'Casual',
      [NARRATIVE_STYLES.PROFESSIONAL]: 'Professioneel',
      [NARRATIVE_STYLES.POETIC]: 'Poëtisch'
    };
    return styleNames[style] || 'Standaard';
  };

  const toggleSetting = async (setting, value) => {
    try {
      switch (setting) {
        case 'healthConnect':
          if (value) {
            try {
              // Initialize Health Connect service
              await healthDataService.initialize();
              const isAvailable = await healthDataService.isAvailable();
              if (isAvailable) {
                await updateSettings({ 
                  healthConnectEnabled: value,
                  preferredHealthSource: 'health_connect'
                });
                Alert.alert(
                  '✅ Health Connect Ingeschakeld!',
                  'Health Connect is nu je primaire bron voor health data.',
                  [{ text: 'Perfect!', style: 'default' }]
                );
              } else {
                Alert.alert(
                  '❌ Health Connect Error',
                  'Kan Health Connect niet initialiseren. Controleer of de Health Connect app is geïnstalleerd.',
                  [{ text: 'OK', style: 'default' }]
                );
              }
            } catch (error) {
              Alert.alert(
                '❌ Health Connect Error',
                `Error: ${error.message}`,
                [{ text: 'OK', style: 'default' }]
              );
            }
          } else {
            await updateSettings({ healthConnectEnabled: value });
          }
          break;
          
        case 'healthConnectAutoSync':
          await updateSettings({ healthConnectAutoSync: value });
          if (value) {
            // Trigger immediate sync
            await syncHealthConnectData();
          }
          break;
          
        case 'notifications':
          if (value) {
            // Request notification permission
            const result = await requestNotificationPermission();
            if (isPermissionGranted(result)) {
              await updateSettings({ allowNotifications: value });
              Alert.alert(
                '🔔 Notificaties Ingeschakeld!',
                'Je ontvangt nu dagelijkse samenvattingen en herinneringen.',
                [{ text: 'Perfect!', style: 'default' }]
              );
            } else {
              Alert.alert(
                '❌ Notificatie Permissie Vereist',
                'Ga naar Instellingen > Apps > MinakamiApp > Notificaties om dit in te schakelen.',
                [{ text: 'Begrijp ik', style: 'default' }]
              );
            }
          } else {
            await updateSettings({ allowNotifications: value });
          }
          break;

        case 'darkMode':
          await updateSettings({ darkMode: value });
          break;

        case 'trackLocation':
          if (value) {
            // Request location permissions
            const results = await requestLocationPermissions();
            if (isPermissionGranted(results[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]) || 
                isPermissionGranted(results[PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION])) {
              await updateSettings({ trackLocation: value });
              Alert.alert(
                '📍 Locatie Tracking Ingeschakeld!',
                'We kunnen nu je bewegingspatronen en favoriete plekken herkennen. Je privacy blijft gewaarborgd - we slaan geen exacte routes op.',
                [{ text: 'Perfect!', style: 'default' }]
              );
            } else {
              Alert.alert(
                '❌ Locatie Permissie Vereist',
                'Ga naar Instellingen > Apps > MinakamiApp > Machtigingen > Locatie om dit in te schakelen.',
                [{ text: 'Begrijp ik', style: 'default' }]
              );
            }
          } else {
            await updateSettings({ trackLocation: value });
          }
          break;

        case 'trackActivity':
          if (value) {
            // Request activity recognition permission
            const result = await requestActivityRecognitionPermission();
            if (isPermissionGranted(result)) {
              await updateSettings({ trackActivity: value });
              Alert.alert(
                '🚶‍♂️ Activiteit Tracking Ingeschakeld!',
                'We kunnen nu je stappen tellen en activiteiten zoals lopen, fietsen en autorijden herkennen.',
                [{ text: 'Geweldig!', style: 'default' }]
              );
            } else {
              Alert.alert(
                '❌ Activiteit Permissie Vereist',
                'Ga naar Instellingen > Apps > MinakamiApp > Machtigingen > Fysieke activiteit om dit in te schakelen.',
                [{ text: 'Begrijp ik', style: 'default' }]
              );
            }
          } else {
            await updateSettings({ trackActivity: value });
          }
          break;

        case 'trackCalls':
          if (value) {
            // Request call log permission
            const result = await requestCallLogPermission();
            if (isPermissionGranted(result)) {
              await updateSettings({ trackCalls: value });
              Alert.alert(
                '📞 Oproep Tracking Ingeschakeld!',
                'We kunnen nu je communicatiepatronen analyseren voor je dagelijkse verhaal.',
                [{ text: 'Geweldig!', style: 'default' }]
              );
            } else {
              Alert.alert(
                '❌ Oproep Permissie Vereist',
                'Ga naar Instellingen > Apps > MinakamiApp > Machtigingen > Telefoon om dit in te schakelen.',
                [{ text: 'Begrijp ik', style: 'default' }]
              );
            }
          } else {
            await updateSettings({ trackCalls: value });
          }
          break;
          
        default:
          console.warn(`Unknown setting: ${setting}`);
          break;
      }
    } catch (error) {
      console.error(`Error toggling ${setting}:`, error);
    }
  };


  const connectToStrava = async () => {
    try {
      // Initialize Strava service
      await stravaService.initializeConnection();
      
      // Check current connection status
      const connectionStatus = await stravaService.getConnectionStatus();
      
      if (connectionStatus.isConnected) {
        // Already connected - show disconnect option
        Alert.alert(
          '🚴 Strava Connected',
          'Je account is al gekoppeld aan Strava.',
          [
            { 
              text: 'Disconnect', 
              style: 'destructive',
              onPress: () => disconnectFromStrava()
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      // Show WebView modal for OAuth
      setStravaWebViewVisible(true);
    } catch (error) {
      console.error('Error connecting to Strava:', error);
      Alert.alert(
        '❌ Strava Error',
        `Failed to initialize Strava connection: ${error.message}`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const disconnectFromStrava = async () => {
    try {
      await stravaService.disconnect();
      Alert.alert(
        '✅ Disconnected',
        'Je Strava account is ontkoppeld.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert(
        '❌ Disconnect Failed',
        `Error: ${error.message}`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const syncHealthConnectData = async () => {
    try {
      Alert.alert(
        '🔄 Synchroniseren...',
        'Health Connect data wordt geïmporteerd. Dit kan even duren.',
        [{ text: 'OK', style: 'default' }]
      );

      // Import last 7 days of data
      const endDate = Date.now();
      const startDate = endDate - (7 * 24 * 60 * 60 * 1000);
      const result = await healthDataService.importHealthData(startDate, endDate);
      
      if (result.success) {
        Alert.alert(
          '✅ Sync Voltooid!',
          `${result.imported} health records geïmporteerd.`,
          [{ text: 'Perfect!', style: 'default' }]
        );
      } else {
        Alert.alert(
          '⚠️ Sync Warning',
          result.message || 'Sommige data kon niet worden geïmporteerd.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      Alert.alert(
        '❌ Sync Error',
        `Fout bij synchroniseren: ${error.message}`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Ionicons name="settings" size={32} color={Colors.primary[600]} style={styles.headerIcon} />
              <Typography variant="h1" color="text.primary" style={styles.mainTitle}>Instellingen</Typography>
            </View>
            <Typography variant="body1" color="text.secondary" style={styles.subtitle}>
              Beheer je data, AI instellingen en voorkeuren
            </Typography>
          </View>
        </View>

        {/* Data Bronnen */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color={Colors.primary[500]} style={styles.sectionIcon} />
            <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>Data Bronnen</Typography>
          </View>
          <Typography variant="body2" color="text.secondary" style={styles.sectionDescription}>
            Bepaal welke gegevens worden verzameld voor je persoonlijke verhaal
          </Typography>
          
          {/* Automatische tracking */}
          <Card variant="elevated" style={styles.cardMargin}>
            <View style={styles.cardHeader}>
              <Ionicons name="pulse" size={20} color={Colors.success[500]} />
              <Typography variant="h6" color="text.primary" style={styles.cardTitle}>
                Automatische Tracking
              </Typography>
            </View>
            
            <TouchableOpacity style={styles.settingRow} onPress={() => toggleSetting('trackActivity', !settings.trackActivity)}>
              <Ionicons name="walk-outline" size={24} color={Colors.success[500]} />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  Activiteiten
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                  Stappen, beweging, calorieën
                </Typography>
              </View>
              <Switch
                value={settings.trackActivity || false}
                onValueChange={(value) => toggleSetting('trackActivity', value)}
                trackColor={{ false: Colors.gray[300], true: Colors.success[500] }}
                thumbColor={Colors.white}
              />
            </TouchableOpacity>
            
            <View style={[styles.divider, { backgroundColor: theme.colors.border.primary }]} />
            
            <TouchableOpacity style={styles.settingRow} onPress={() => toggleSetting('trackLocation', !settings.trackLocation)}>
              <Ionicons name="location-outline" size={24} color={Colors.secondary[500]} />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  Locaties
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                  Bezochte plaatsen, routes
                </Typography>
              </View>
              <Switch
                value={settings.trackLocation || false}
                onValueChange={(value) => toggleSetting('trackLocation', value)}
                trackColor={{ false: Colors.gray[300], true: Colors.secondary[500] }}
                thumbColor={Colors.white}
              />
            </TouchableOpacity>
            
            <View style={[styles.divider, { backgroundColor: theme.colors.border.primary }]} />
            
            <TouchableOpacity style={styles.settingRow} onPress={() => toggleSetting('trackCalls', !settings.trackCalls)}>
              <Ionicons name="call-outline" size={24} color={Colors.warning[500]} />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  Oproepen
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                  Communicatie patronen
                </Typography>
              </View>
              <Switch
                value={settings.trackCalls || false}
                onValueChange={(value) => toggleSetting('trackCalls', value)}
                trackColor={{ false: Colors.gray[300], true: Colors.warning[500] }}
                thumbColor={Colors.white}
              />
            </TouchableOpacity>
          </Card>

          {/* Externe Bronnen */}
          {/* Health Connect (Android) */}
          <Card variant="elevated" style={styles.cardMargin}>
            <View style={styles.cardHeader}>
              <Ionicons name="fitness" size={20} color={Colors.success[500]} />
              <Typography variant="h6" color="text.primary" style={styles.cardTitle}>
                Health Connect
              </Typography>
            </View>
            
            <TouchableOpacity style={styles.settingRow} onPress={() => toggleSetting('healthConnect', !settings.healthConnectEnabled)}>
              <Ionicons name="heart-outline" size={24} color={Colors.success[500]} />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  Enable Health Connect
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                  Modern Android health data API
                </Typography>
              </View>
              <Switch
                value={settings.healthConnectEnabled}
                onValueChange={(value) => toggleSetting('healthConnect', value)}
                trackColor={{ false: Colors.gray[300], true: Colors.success[300] }}
                thumbColor={settings.healthConnectEnabled ? Colors.success[500] : Colors.gray[400]}
              />
            </TouchableOpacity>

            {settings.healthConnectEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.colors.border.primary }]} />
                
                <TouchableOpacity style={styles.settingRow} onPress={() => toggleSetting('healthConnectAutoSync', !settings.healthConnectAutoSync)}>
                  <Ionicons name="sync-outline" size={24} color={Colors.primary[500]} />
                  <View style={styles.settingContent}>
                    <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                      Auto Sync
                    </Typography>
                    <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                      Automatisch data synchroniseren
                    </Typography>
                  </View>
                  <Switch
                    value={settings.healthConnectAutoSync}
                    onValueChange={(value) => toggleSetting('healthConnectAutoSync', value)}
                    trackColor={{ false: Colors.gray[300], true: Colors.success[300] }}
                    thumbColor={settings.healthConnectAutoSync ? Colors.success[500] : Colors.gray[400]}
                  />
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: theme.colors.border.primary }]} />
                
                <TouchableOpacity style={styles.settingRow} onPress={() => syncHealthConnectData()}>
                  <Ionicons name="refresh-outline" size={24} color={Colors.warning[500]} />
                  <View style={styles.settingContent}>
                    <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                      Sync Now
                    </Typography>
                    <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                      Importeer laatste health data
                    </Typography>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
                </TouchableOpacity>
              </>
            )}
          </Card>

          {/* Externe Bronnen */}
          <Card variant="elevated">
            <View style={styles.cardHeader}>
              <Ionicons name="link" size={20} color={Colors.primary[500]} />
              <Typography variant="h6" color="text.primary" style={styles.cardTitle}>
                Externe Bronnen
              </Typography>
            </View>
            
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('DataImport')}
            >
              <Ionicons name="heart-circle" size={24} color={Colors.secondary[500]} />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  Legacy Health Data
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                  Google Fit, Apple Health (oude API's)
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
            </TouchableOpacity>
            
            <View style={[styles.divider, { backgroundColor: theme.colors.border.primary }]} />
            
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => connectToStrava()}
            >
              <Ionicons name="bicycle" size={24} color="#FC4C02" />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  Strava
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                  Workouts, routes, prestaties
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* AI Verhaal Generator */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={20} color={Colors.primary[500]} style={styles.sectionIcon} />
            <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>AI Verhaal Generator</Typography>
          </View>
          <Typography variant="body2" color="text.secondary" style={styles.sectionDescription}>
            Personaliseer hoe je dagelijkse verhalen worden gegenereerd
          </Typography>
          
          <Card variant="elevated">
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('AISettings')}
            >
              <Ionicons name="bulb-outline" size={24} color={Colors.primary[500]} />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  AI Model
                </Typography>
                <View style={styles.aiStatusContainer}>
                  <View style={[styles.aiStatusDot, styles.aiActiveStatus]} />
                  <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                    AI beschikbaar
                  </Typography>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
            </TouchableOpacity>
            
            <View style={[styles.divider, { backgroundColor: theme.colors.border.primary }]} />
            
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('NarrativeStyle')}
            >
              <Ionicons name="document-text-outline" size={24} color={Colors.secondary[500]} />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  Schrijfstijl
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                  {getNarrativeStyleDisplayName(narrativeStyle)}
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* App Voorkeuren */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cog" size={20} color={Colors.primary[500]} style={styles.sectionIcon} />
            <Typography variant="h6" color="text.primary" style={styles.sectionTitle}>App Voorkeuren</Typography>
          </View>
          
          <Card variant="elevated">
            <TouchableOpacity style={styles.settingRow} onPress={() => toggleSetting('notifications', !settings.allowNotifications)}>
              <Ionicons name="notifications-outline" size={24} color={Colors.primary[500]} />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  Notificaties
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                  Dagelijkse samenvattingen
                </Typography>
              </View>
              <Switch
                value={settings.allowNotifications || false}
                onValueChange={(value) => toggleSetting('notifications', value)}
                trackColor={{ false: Colors.gray[300], true: Colors.primary[500] }}
                thumbColor={Colors.white}
              />
            </TouchableOpacity>
            
            <View style={[styles.divider, { backgroundColor: theme.colors.border.primary }]} />
            
            <TouchableOpacity style={styles.settingRow} onPress={() => toggleSetting('darkMode', !settings.darkMode)}>
              <Ionicons name="moon-outline" size={24} color={Colors.primary[500]} />
              <View style={styles.settingContent}>
                <Typography variant="body1" color="text.primary" style={styles.settingTitle}>
                  Donkere modus
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.settingSubtitle}>
                  Thema instelling
                </Typography>
              </View>
              <Switch
                value={settings.darkMode || false}
                onValueChange={(value) => toggleSetting('darkMode', value)}
                trackColor={{ false: Colors.gray[300], true: Colors.primary[500] }}
                thumbColor={Colors.white}
              />
            </TouchableOpacity>
          </Card>
        </View>


        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons name="analytics" size={24} color={Colors.primary[500]} />
            <Typography variant="h6" color="text.primary" style={styles.footerTitle}>MinakamiApp</Typography>
          </View>
          <Typography variant="body2" color="text.secondary" style={styles.footerSubtitle}>
            Persoonlijke activiteiten tracker
          </Typography>
          <Typography variant="caption" color="text.disabled" style={styles.footerVersion}>
            Versie 1.0.0 • Made with ❤️
          </Typography>
        </View>
      </ScrollView>
      
      {/* Strava OAuth WebView Modal */}
      <StravaAuthWebView
        visible={stravaWebViewVisible}
        onSuccess={async (tokens, athlete) => {
          console.log('Strava OAuth success:', athlete?.firstname || 'Unknown athlete');
          setStravaWebViewVisible(false);
          
          try {
            // Handle successful OAuth
            const result = await stravaService.handleOAuthSuccess(tokens, athlete);
            
            if (result.success) {
              Alert.alert(
                '🎉 Strava Connected!',
                `Successfully connected to Strava as ${athlete?.firstname || 'athlete'}`,
                [{ text: 'Great!', style: 'default' }]
              );
            } else {
              throw new Error(result.error);
            }
          } catch (error) {
            console.error('Strava OAuth success handling failed:', error);
            Alert.alert(
              '❌ Connection Error',
              `Failed to complete Strava connection: ${error.message}`,
              [{ text: 'OK', style: 'default' }]
            );
          }
        }}
        onCancel={() => {
          console.log('Strava OAuth cancelled');
          setStravaWebViewVisible(false);
        }}
        onError={(error) => {
          console.error('Strava OAuth error:', error);
          setStravaWebViewVisible(false);
          Alert.alert(
            '❌ Strava Error',
            `OAuth failed: ${error}`,
            [{ text: 'OK', style: 'default' }]
          );
        }}
      />
    </SafeAreaView>
  );
};

const SettingsScreenNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AISettings" 
        component={AISettingsScreen} 
        options={{ title: 'AI Verhaal Instellingen' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
    ...Shadows.sm,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerIcon: {
    marginRight: Spacing.sm,
  },
  mainTitle: {
    ...DesignTypography.headline.medium,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  subtitle: {
    ...DesignTypography.body.medium,
    color: Colors.gray[600],
    lineHeight: 22,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    ...DesignTypography.title.large,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  sectionDescription: {
    ...DesignTypography.body.small,
    color: Colors.gray[600],
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    minHeight: 60,
  },
  settingText: {
    ...DesignTypography.body.medium,
    flex: 1,
    marginLeft: Spacing.md,
    color: Colors.gray[900],
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray[100],
    marginLeft: Spacing.xxxl,
    marginRight: Spacing.lg,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  valueText: {
    ...DesignTypography.body.small,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  footer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  footerTitle: {
    ...DesignTypography.title.medium,
    color: Colors.gray[900],
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  footerSubtitle: {
    ...DesignTypography.body.small,
    color: Colors.gray[600],
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  footerVersion: {
    ...DesignTypography.label.small,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  aiStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  aiStatusDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
  },
  aiActiveStatus: {
    backgroundColor: Colors.success[500],
  },
  aiInactiveStatus: {
    backgroundColor: Colors.gray[400],
  },
  cardMargin: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  cardTitle: {
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
  settingContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  settingTitle: {
    fontWeight: '500',
    marginBottom: Spacing.xs / 2,
  },
  settingSubtitle: {
    lineHeight: 16,
  },
});

// Stack Navigator voor Settings en sub-screens
const SettingsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.white,
        },
        headerTintColor: Colors.gray[900],
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AISettings" 
        component={AISettingsScreen}
        options={{ 
          title: 'AI Instellingen',
          headerBackTitle: 'Terug'
        }}
      />
      <Stack.Screen 
        name="NarrativeStyle" 
        component={NarrativeStyleScreen}
        options={{ 
          title: 'Verhalende Stijl',
          headerBackTitle: 'Terug'
        }}
      />
      <Stack.Screen 
        name="DataImport" 
        component={DataImportScreen}
        options={{ 
          title: 'Data Importeren',
          headerBackTitle: 'Terug'
        }}
      />
    </Stack.Navigator>
  );
};

export default SettingsNavigator;