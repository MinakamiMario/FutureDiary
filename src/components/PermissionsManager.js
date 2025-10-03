// src/components/PermissionsManager.js
// Comprehensive permissions management component for all app features

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppContext } from '../utils/appContext';
import { Colors, Spacing, BorderRadius } from '../styles/designSystem';

// Platform-specific permission handling
const PermissionsManager = () => {
  const { settings, updateSettings } = useAppContext();
  const [permissions, setPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Comprehensive permission definitions
  const permissionCategories = [
    {
      id: 'location',
      name: 'Locatie',
      description: 'GPS tracking voor bezochte plaatsen en bewegingspatronen',
      icon: 'location',
      permissions: [
        Platform.OS === 'ios' ? 'NSLocationWhenInUseUsageDescription' : 'android.permission.ACCESS_FINE_LOCATION',
        Platform.OS === 'android' ? 'android.permission.ACCESS_COARSE_LOCATION' : null
      ].filter(Boolean),
      settingKey: 'trackLocation',
      required: true
    },
    {
      id: 'activity',
      name: 'Activiteit',
      description: 'Stappenteller, bewegingsherkenning en fitness tracking',
      icon: 'fitness',
      permissions: [
        Platform.OS === 'android' ? 'android.permission.ACTIVITY_RECOGNITION' : null,
        Platform.OS === 'android' ? 'com.google.android.gms.permission.FITNESS_ACTIVITY_READ' : null
      ].filter(Boolean),
      settingKey: 'trackActivity',
      required: false
    },
    {
      id: 'calls',
      name: 'Oproepen',
      description: 'Oproepgeschiedenis voor sociale patronen (Android only)',
      icon: 'call',
      permissions: [
        Platform.OS === 'android' ? 'android.permission.READ_CALL_LOG' : null,
        Platform.OS === 'android' ? 'android.permission.READ_PHONE_STATE' : null
      ].filter(Boolean),
      settingKey: 'trackCalls',
      required: false,
      platform: 'android'
    },
    {
      id: 'notifications',
      name: 'Notificaties',
      description: 'Dagelijkse en wekelijkse samenvattingen',
      icon: 'notifications',
      permissions: [
        Platform.OS === 'ios' ? 'UNUserNotificationCenter' : 'android.permission.POST_NOTIFICATIONS'
      ],
      settingKey: 'allowNotifications',
      required: false
    },
    {
      id: 'health',
      name: 'Gezondheid',
      description: 'Samsung Health, Google Fit, Apple Health integratie',
      icon: 'heart',
      permissions: [
        Platform.OS === 'ios' ? 'NSHealthShareUsageDescription' : 'android.permission.BODY_SENSORS',
        Platform.OS === 'ios' ? 'NSHealthUpdateUsageDescription' : null
      ].filter(Boolean),
      settingKey: 'samsungHealthEnabled',
      required: false,
      customHandler: true
    },
    {
      id: 'storage',
      name: 'Opslag',
      description: 'Lokale data opslag en backup',
      icon: 'folder',
      permissions: [
        Platform.OS === 'android' ? 'android.permission.READ_EXTERNAL_STORAGE' : null,
        Platform.OS === 'android' ? 'android.permission.WRITE_EXTERNAL_STORAGE' : null
      ].filter(Boolean),
      settingKey: 'storageAccess',
      required: false,
      platform: 'android'
    }
  ];

  // Check all permissions on component mount
  useEffect(() => {
    checkAllPermissions();
  }, []);

  // Check all permissions status
  const checkAllPermissions = async () => {
    setIsLoading(true);
    try {
      const permissionStatus = {};
      
      for (const category of permissionCategories) {
        const status = await checkPermissionStatus(category);
        permissionStatus[category.id] = status;
      }
      
      setPermissions(permissionStatus);
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check individual permission status
  const checkPermissionStatus = async (category) => {
    try {
      // Handle custom permission checks
      if (category.customHandler) {
        if (category.id === 'health') {
          return {
            granted: settings.samsungHealthEnabled || false,
            status: settings.samsungHealthEnabled ? 'granted' : 'denied',
            canRequest: true
          };
        }
      }

      // Handle platform-specific permissions
      if (category.platform && category.platform !== Platform.OS) {
        return {
          granted: false,
          status: 'unavailable',
          canRequest: false,
          reason: `Only available on ${category.platform}`
        };
      }

      // For React Native, we'll use a simplified approach
      // In a real app, you'd use react-native-permissions
      const isGranted = settings[category.settingKey] || false;
      
      return {
        granted: isGranted,
        status: isGranted ? 'granted' : 'denied',
        canRequest: true
      };
    } catch (error) {
      return {
        granted: false,
        status: 'error',
        canRequest: false,
        error: error.message
      };
    }
  };

  // Toggle permission
  const togglePermission = async (category) => {
    try {
      const currentStatus = permissions[category.id];
      const newValue = !currentStatus?.granted;

      if (category.customHandler && category.id === 'health') {
        // Handle Samsung Health specifically
        if (newValue) {
          // Navigate to Samsung Health settings
          Alert.alert(
            'Samsung Health verbinden',
            'Wil je Samsung Health verbinden voor gezondheidsdata?',
            [
              { text: 'Annuleren', style: 'cancel' },
              { text: 'Verbinden', onPress: () => handleSamsungHealthConnect() }
            ]
          );
        } else {
          await updateSettings({
            samsungHealthEnabled: false,
            samsungHealthPermissions: []
          });
          await checkAllPermissions();
        }
        return;
      }

      // Handle regular permissions
      if (newValue) {
        await requestPermission(category);
      } else {
        // Disable the feature
        await updateSettings({ [category.settingKey]: false });
        await checkAllPermissions();
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
    }
  };

  // Request specific permission
  const requestPermission = async (category) => {
    try {
      setIsLoading(true);

      // For location permission
      if (category.id === 'location') {
        // This would use react-native-permissions in a real app
        await updateSettings({ [category.settingKey]: true });
        
        // Simulate permission request
        Alert.alert(
          'Locatiemachtiging',
          'Deze app heeft toegang tot je locatie nodig om bezochte plaatsen en bewegingspatronen bij te houden.',
          [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Toestaan', onPress: async () => {
              await updateSettings({ [category.settingKey]: true });
              await checkAllPermissions();
            }}
          ]
        );
      }
      // For activity permission
      else if (category.id === 'activity') {
        await updateSettings({ [category.settingKey]: true });
        await checkAllPermissions();
      }
      // For call permission (Android only)
      else if (category.id === 'calls' && Platform.OS === 'android') {
        Alert.alert(
          'Oproepmachtiging',
          'Deze app heeft toegang tot je oproepgeschiedenis nodig om sociale patronen te analyseren.',
          [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Toestaan', onPress: async () => {
              await updateSettings({ [category.settingKey]: true });
              await checkAllPermissions();
            }}
          ]
        );
      }
      // For notifications
      else if (category.id === 'notifications') {
        await updateSettings({ [category.settingKey]: true });
        await checkAllPermissions();
      }
      // For storage (Android only)
      else if (category.id === 'storage' && Platform.OS === 'android') {
        await updateSettings({ [category.settingKey]: true });
        await checkAllPermissions();
      }

    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Samsung Health connection
  const handleSamsungHealthConnect = async () => {
    try {
      // Check if Samsung Health app is installed first
      const samsungHealthService = require('../services/samsungHealthService').default;
      const appInstalled = await samsungHealthService.isSamsungHealthAppInstalled();
      
      if (!appInstalled) {
        Alert.alert(
          'Samsung Health App Vereist',
          'Om Samsung Health te gebruiken moet je de Samsung Health app installeren.\n\nStappen:\n1. Installeer Samsung Health uit de Play Store\n2. Open Samsung Health en maak een account\n3. Geef alle toestemmingen\n4. Kom terug naar deze app',
          [
            { 
              text: 'Play Store Openen', 
              onPress: () => {
                Linking.openURL('market://details?id=com.sec.android.app.shealth')
                  .catch(() => {
                    Linking.openURL('https://play.google.com/store/apps/details?id=com.sec.android.app.shealth');
                  });
              }
            },
            { text: 'Later', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert(
          'Samsung Health Gevonden!',
          'Samsung Health app is geïnstalleerd. Nu gaan we de verbinding instellen:\n\n1. ✅ App geïnstalleerd\n2. 🔄 Machtigingen aanvragen\n3. 🔗 Verbinding maken',
          [
            { 
              text: 'Samsung Health Openen', 
              onPress: () => {
                Linking.openURL('samsunghealth://')
                  .catch(() => {
                    Alert.alert('Kan Samsung Health niet openen', 'Open Samsung Health handmatig en probeer opnieuw.');
                  });
              }
            },
            { 
              text: 'Verbinden', 
              onPress: async () => {
                try {
                  const result = await samsungHealthService.requestPermissions();
                  if (result.success) {
                    await updateSettings({
                      samsungHealthEnabled: true,
                      samsungHealthPermissions: result.permissions
                    });
                    await checkAllPermissions();
                    Alert.alert('Success!', 'Samsung Health is succesvol verbonden.');
                  } else {
                    Alert.alert('Verbinding Mislukt', result.error || 'Kon niet verbinden met Samsung Health.');
                  }
                } catch (error) {
                  Alert.alert('Fout', 'Er is een fout opgetreden bij het verbinden.');
                }
              }
            },
            { text: 'Later', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Samsung Health connect error:', error);
      Alert.alert(
        'Samsung Health Verbinden',
        'Om Samsung Health te gebruiken moet je de Samsung Health app installeren en toestemmingen verlenen.\n\nStappen:\n1. Installeer Samsung Health uit de Play Store\n2. Open Samsung Health en maak een account\n3. Kom terug naar deze app en probeer opnieuw',
        [
          { 
            text: 'Play Store Openen', 
            onPress: () => {
              Linking.openURL('market://details?id=com.sec.android.app.shealth')
                .catch(() => {
                  Linking.openURL('https://play.google.com/store/apps/details?id=com.sec.android.app.shealth');
                });
            }
          },
          { text: 'Later', style: 'cancel' }
        ]
      );
    }
  };

  // Open app settings
  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // Get status color and icon
  const getStatusStyle = (status) => {
    switch (status?.status) {
      case 'granted':
        return { color: '#4CAF50', icon: 'checkmark-circle' };
      case 'denied':
        return { color: '#F44336', icon: 'close-circle' };
      case 'unavailable':
        return { color: '#9E9E9E', icon: 'information-circle' };
      case 'error':
        return { color: '#FF9800', icon: 'alert-circle' };
      default:
        return { color: '#9E9E9E', icon: 'help-circle' };
    }
  };

  // Reset all permissions
  const resetAllPermissions = () => {
    Alert.alert(
      'Alle machtigingen resetten',
      'Weet je zeker dat je alle machtigingen wilt resetten? Dit zal alle functies uitschakelen.',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Resetten',
          style: 'destructive',
          onPress: async () => {
            const resetSettings = {
              trackLocation: false,
              trackActivity: false,
              trackCalls: false,
              allowNotifications: false,
              samsungHealthEnabled: false,
              samsungHealthPermissions: []
            };
            
            await updateSettings(resetSettings);
            await checkAllPermissions();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>App Machtigingen</Text>
          <Text style={styles.subtitle}>
            Beheer alle app-machtigingen op één centrale plek
          </Text>
        </View>

        {/* Permission Status Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Overzicht</Text>
          <View style={styles.overviewContent}>
            {permissionCategories.map(category => {
              const status = permissions[category.id];
              const statusStyle = getStatusStyle(status);
              
              return (
                <View key={category.id} style={styles.overviewItem}>
                  <View style={[styles.statusIndicator, { backgroundColor: statusStyle.color }]} />
                  <Text style={styles.overviewText}>{category.name}</Text>
                  <Icon name={statusStyle.icon} size={16} color={statusStyle.color} />
                </View>
              );
            })}
          </View>
        </View>

        {/* Permission Categories */}
        <View style={styles.permissionsList}>
          {permissionCategories.map(category => {
            const status = permissions[category.id];
            const statusStyle = getStatusStyle(status);
            const isEnabled = settings[category.settingKey] || false;
            
            // Skip if platform-specific and not available
            if (category.platform && category.platform !== Platform.OS) {
              return null;
            }

            return (
              <View key={category.id} style={styles.permissionCard}>
                <View style={styles.permissionHeader}>
                  <View style={styles.permissionInfo}>
                    <Icon name={category.icon} size={24} color={statusStyle.color} />
                    <View style={styles.permissionText}>
                      <Text style={styles.permissionName}>{category.name}</Text>
                      <Text style={styles.permissionDescription}>{category.description}</Text>
                    </View>
                  </View>
                  
                  <Switch
                    value={isEnabled}
                    onValueChange={() => togglePermission(category)}
                    trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                    thumbColor="#FFFFFF"
                    disabled={status?.status === 'unavailable'}
                  />
                </View>

                {status?.status === 'unavailable' && (
                  <Text style={styles.unavailableText}>
                    {status.reason}
                  </Text>
                )}

                {category.required && (
                  <Text style={styles.requiredText}>Vereist</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={checkAllPermissions}>
            <Icon name="refresh" size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Status vernieuwen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={openAppSettings}>
            <Icon name="settings" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>App Instellingen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.resetButton]} onPress={resetAllPermissions}>
            <Icon name="refresh-circle" size={20} color="#F44336" />
            <Text style={[styles.actionButtonText, styles.resetButtonText]}>Alles resetten</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Waarom machtigingen?</Text>
          <View style={styles.infoItem}>
            <Icon name="shield-checkmark" size={16} color="#4CAF50" />
            <Text style={styles.infoText}>
              Je hebt volledige controle over welke data de app mag gebruiken
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="lock-closed" size={16} color="#2196F3" />
            <Text style={styles.infoText}>
              Alle data wordt lokaal opgeslagen en versleuteld
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="information-circle" size={16} color="#FF9800" />
            <Text style={styles.infoText}>
              Je kunt machtigingen op elk moment aanpassen in de app instellingen
            </Text>
          </View>
        </View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  overviewContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  overviewText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2C3E50',
  },
  permissionsList: {
    paddingHorizontal: 16,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  permissionText: {
    flex: 1,
    marginLeft: 12,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  unavailableText: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
    marginTop: 8,
  },
  requiredText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
    marginTop: 8,
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: '#FFEBEE',
  },
  resetButtonText: {
    color: '#F44336',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PermissionsManager;