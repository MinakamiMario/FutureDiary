// src/components/SamsungHealthSettings.js
// Samsung Health integration settings component

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import samsungHealthService from '../services/samsungHealthService';
import { useAppContext } from '../utils/appContext';

const SamsungHealthSettings = () => {
  const { settings, updateSettings } = useAppContext();
  const [isConnected, setIsConnected] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncInProgress, setSyncInProgress] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      
      if (!samsungHealthService.isAvailable()) {
        return;
      }

      // Use the new getConnectionStatus method
      const status = samsungHealthService.getConnectionStatus();
      setIsConnected(status.isConnected);
      setPermissions(status.permissions || []);
      
      // If not connected, try to initialize (but don't force connection)
      if (!status.isConnected) {
        const initResult = await samsungHealthService.initialize();
        if (initResult.success && initResult.mock) {
          setIsConnected(true);
          setPermissions(['demo_permissions']);
        }
      }
    } catch (error) {
      console.error('Samsung Health connection check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);

      // Use the new connect method that combines initialize + permissions
      const connectResult = await samsungHealthService.connect();
      
      if (connectResult.success) {
        if (connectResult.mock) {
          // Demo mode
          setIsConnected(true);
          setPermissions(['demo_permissions']);
          
          Alert.alert(
            'Demo Mode',
            connectResult.message,
            [{ text: 'OK' }]
          );
        } else if (connectResult.requiresManualConnection) {
          // Show realistic message about Samsung Health limitations
          Alert.alert(
            'Samsung Health Info',
            connectResult.message,
            [
              { text: 'Sluiten', style: 'cancel' },
              { 
                text: 'Gebruik Demo Mode', 
                onPress: () => {
                  // Enable demo mode for Samsung Health
                  console.log('Enabling Samsung Health demo mode');
                  setIsConnected(true);
                  setPermissions(['demo_permissions']);
                  
                  // Update app settings
                  updateSettings({
                    samsungHealthEnabled: true,
                    samsungHealthPermissions: ['demo_permissions'],
                    samsungHealthDemoMode: true
                  });
                  
                  Alert.alert(
                    '✅ Demo Mode Actief',
                    'Samsung Health werkt nu met voorbeelddata. Voor echte data kun je Google Fit gebruiken.',
                    [{ text: 'OK' }]
                  );
                }
              }
            ]
          );
        } else {
          // Successfully connected with permissions
          setIsConnected(true);
          setPermissions(connectResult.permissions || []);
          
          // Update app settings
          await updateSettings({
            samsungHealthEnabled: true,
            samsungHealthPermissions: connectResult.permissions || []
          });

          Alert.alert(
            'Verbonden!',
            `Samsung Health is succesvol verbonden.`,
            [{ text: 'OK' }]
          );

          // Trigger initial sync
          await handleSync();
        }
      } else {
        Alert.alert(
          'Verbinding mislukt',
          connectResult.error || 'Kan geen verbinding maken met Samsung Health',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Fout',
        'Er is een fout opgetreden bij verbinden met Samsung Health.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Samsung Health ontkoppelen',
      'Weet je zeker dat je Samsung Health wilt ontkoppelen? Bestaande data blijft behouden.',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Ontkoppelen',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsConnected(false);
              setPermissions([]);
              
              // Update app settings
              await updateSettings({
                samsungHealthEnabled: false,
                samsungHealthPermissions: []
              });
            } catch (error) {
              console.error('Disconnect error:', error);
            }
          }
        }
      ]
    );
  };

  const handleSync = async () => {
    try {
      setSyncInProgress(true);
      
      const result = await samsungHealthService.syncAllHealthData();
      
      if (result.success) {
        setLastSync(new Date());
        Alert.alert(
          'Synchronisatie voltooid',
          `${result.totalSynced} gezondheidsdatarecords gesynchroniseerd.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Synchronisatie mislukt',
          result.error || 'Er is een fout opgetreden tijdens synchronisatie.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Synchronisatie fout',
        'Er is een onverwachte fout opgetreden.',
        [{ text: 'OK' }]
      );
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleAutoSyncToggle = async (enabled) => {
    await updateSettings({
      samsungHealthAutoSync: enabled
    });
  };

  if (!samsungHealthService.isAvailable()) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Ionicons name="phone-portrait-outline" size={48} color="#B8C2CC" />
          <Text style={styles.unavailableTitle}>Samsung Health niet beschikbaar</Text>
          <Text style={styles.unavailableText}>
            Samsung Health is niet geïnstalleerd of niet compatibel met dit apparaat.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Connection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Samsung Health</Text>
        
        <View style={styles.card}>
          <View style={styles.connectionRow}>
            <View style={styles.connectionInfo}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
                <Text style={styles.statusText}>
                  {isConnected ? 'Verbonden' : 'Niet verbonden'}
                </Text>
              </View>
              <Text style={styles.statusSubtext}>
                {isConnected 
                  ? `${permissions.length} gegevensbronnen beschikbaar`
                  : 'Verbind met Samsung Health voor gezondheidsdatasync'
                }
              </Text>
            </View>
            
            {isLoading ? (
              <ActivityIndicator size="small" color="#4F8EF7" />
            ) : (
              <TouchableOpacity
                style={[styles.button, isConnected ? styles.disconnectButton : styles.connectButton]}
                onPress={isConnected ? handleDisconnect : handleConnect}
              >
                <Text style={[styles.buttonText, isConnected ? styles.disconnectButtonText : styles.connectButtonText]}>
                  {isConnected ? 'Ontkoppelen' : 'Verbinden'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Data Sync Options */}
      {isConnected && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datasynchronisatie</Text>

          {/* Manual Sync */}
          <View style={styles.card}>
            <View style={styles.syncRow}>
              <View style={styles.syncInfo}>
                <Text style={styles.syncTitle}>Handmatige sync</Text>
                <Text style={styles.syncSubtext}>
                  {lastSync 
                    ? `Laatste sync: ${lastSync.toLocaleString('nl-NL')}`
                    : 'Nog niet gesynchroniseerd'
                  }
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.button, styles.syncButton, syncInProgress && styles.buttonDisabled]}
                onPress={handleSync}
                disabled={syncInProgress}
              >
                {syncInProgress ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="sync" size={16} color="#FFF" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Synchroniseren</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Auto Sync */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Automatische synchronisatie</Text>
                <Text style={styles.settingSubtext}>
                  Synchroniseer automatisch bij app start en op de achtergrond
                </Text>
              </View>
              
              <Switch
                value={settings.samsungHealthAutoSync || false}
                onValueChange={handleAutoSyncToggle}
                trackColor={{ false: '#E0E0E0', true: '#4F8EF7' }}
                thumbColor={settings.samsungHealthAutoSync ? '#FFF' : '#FFF'}
              />
            </View>
          </View>
        </View>
      )}

      {/* Available Data Types */}
      {isConnected && permissions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beschikbare gegevenstypes</Text>
          
          <View style={styles.card}>
            {getDataTypesList().map((dataType, index) => (
              <View key={index} style={styles.dataTypeRow}>
                <Ionicons 
                  name={dataType.icon} 
                  size={20} 
                  color={permissions.includes(dataType.permission) ? '#4CAF50' : '#B8C2CC'} 
                />
                <View style={styles.dataTypeInfo}>
                  <Text style={[
                    styles.dataTypeName,
                    !permissions.includes(dataType.permission) && styles.dataTypeDisabled
                  ]}>
                    {dataType.name}
                  </Text>
                  <Text style={styles.dataTypeDescription}>{dataType.description}</Text>
                </View>
                <View style={[
                  styles.permissionBadge,
                  permissions.includes(dataType.permission) ? styles.permissionGranted : styles.permissionDenied
                ]}>
                  <Text style={[
                    styles.permissionBadgeText,
                    permissions.includes(dataType.permission) ? styles.permissionGrantedText : styles.permissionDeniedText
                  ]}>
                    {permissions.includes(dataType.permission) ? 'Toegestaan' : 'Geweigerd'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Help & Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informatie</Text>
        
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color="#4F8EF7" />
            <Text style={styles.infoText}>
              Samsung Health data wordt lokaal opgeslagen en geëncrypteerd. 
              Geen data wordt gedeeld zonder jouw toestemming.
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>
              Data synchronisatie respecteert al je privacy-instellingen en 
              bewaart alleen wat nodig is voor de app functionaliteit.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

// Helper function to get data types list
const getDataTypesList = () => [
  {
    name: 'Stappen',
    description: 'Dagelijkse stappen en activiteit',
    icon: 'footsteps',
    permission: 'com.samsung.-health.step_count'
  },
  {
    name: 'Hartslag',
    description: 'Hartslag metingen en trends',
    icon: 'heart',
    permission: 'com.samsung.health.heart_rate'
  },
  {
    name: 'Slaap',
    description: 'Slaappatronen en kwaliteit',
    icon: 'moon',
    permission: 'com.samsung.health.sleep'
  },
  {
    name: 'Calorieën',
    description: 'Verbrande calorieën en energie',
    icon: 'flame',
    permission: 'com.samsung.health.calories_burned'
  },
  {
    name: 'Workouts',
    description: 'Trainingen en oefeningen',
    icon: 'fitness',
    permission: 'com.samsung.health.exercise'
  },
  {
    name: 'Gewicht',
    description: 'Gewicht en lichaamsamenstelling',
    icon: 'scale',
    permission: 'com.samsung.health.weight'
  },
  {
    name: 'Bloeddruk',
    description: 'Bloeddruk metingen',
    icon: 'medical',
    permission: 'com.samsung.health.blood_pressure'
  },
  {
    name: 'Stress',
    description: 'Stress niveau monitoring',
    icon: 'pulse',
    permission: 'com.samsung.health.stress'
  },
  {
    name: 'Water',
    description: 'Waterinname tracking',
    icon: 'water',
    permission: 'com.samsung.health.water_intake'
  },
  {
    name: 'Voeding',
    description: 'Voedingsinname en macros',
    icon: 'restaurant',
    permission: 'com.samsung.health.nutrition'
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Connection Status
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionInfo: {
    flex: 1,
    marginRight: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  
  // Buttons
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  
  connectButton: {
    backgroundColor: '#4F8EF7',
  },
  connectButtonText: {
    color: '#FFFFFF',
  },
  
  disconnectButton: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  disconnectButtonText: {
    color: '#F44336',
  },
  
  syncButton: {
    backgroundColor: '#4CAF50',
  },
  
  // Sync Section
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncInfo: {
    flex: 1,
    marginRight: 16,
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  syncSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  
  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  settingSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  
  // Data Types
  dataTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dataTypeInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  dataTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  dataTypeDisabled: {
    color: '#B8C2CC',
  },
  dataTypeDescription: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  
  permissionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionGranted: {
    backgroundColor: '#E8F5E8',
  },
  permissionDenied: {
    backgroundColor: '#FFEBEE',
  },
  permissionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  permissionGrantedText: {
    color: '#2E7D32',
  },
  permissionDeniedText: {
    color: '#C62828',
  },
  
  // Info Section
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  
  // Unavailable State
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unavailableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SamsungHealthSettings;