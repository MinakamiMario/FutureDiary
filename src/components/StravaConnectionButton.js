// src/components/StravaConnectionButton.js
// User-friendly Strava connection component

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import stravaService from '../services/stravaService';

const StravaConnectionButton = ({ onConnectionChange }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    // Check current connection status when component mounts
    updateConnectionStatus();
    
    // Test setup configuration
    const setupTest = stravaService.testSetup();
    if (!setupTest.isValid) {
      console.log('🚴 Strava setup issues:', setupTest.issues);
    } else {
      console.log('🚴 Strava setup validated successfully');
    }
    
    // Set up reconnect callback for toast notifications
    stravaService.setReconnectCallback(() => {
      // When token expires and user clicks reconnect in toast
      handleConnect();
    });
    
    // Cleanup on unmount
    return () => {
      stravaService.setReconnectCallback(null);
    };
  }, []);

  const updateConnectionStatus = () => {
    const status = stravaService.getConnectionStatus();
    setConnectionStatus(status);
    if (onConnectionChange) {
      onConnectionChange(status);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const result = await stravaService.connect();
      
      if (result.success) {
        Alert.alert(
          '🎉 Gelukt!',
          result.message,
          [{ text: 'OK', onPress: () => updateConnectionStatus() }]
        );
      } else if (result.pending) {
        // OAuth flow started, user needs to complete it in browser
        Alert.alert(
          '🚴 Strava Autorisatie',
          'Voltooi de autorisatie in je browser en keer terug naar de app.',
          [{ text: 'OK' }]
        );
        // Check status again after a few seconds
        setTimeout(() => updateConnectionStatus(), 3000);
      } else {
        Alert.alert('Verbinding Mislukt', result.error);
      }
    } catch (error) {
      Alert.alert('Fout', 'Er ging iets mis bij het verbinden met Strava');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Strava Verbinding Verbreken?',
      'Je trainingsdata blijft bewaard, maar er worden geen nieuwe activiteiten geïmporteerd.',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verbreken',
          style: 'destructive',
          onPress: async () => {
            const result = await stravaService.disconnect();
            if (result.success) {
              updateConnectionStatus();
              Alert.alert('✅ Verbinding Verbroken', result.message);
            }
          }
        }
      ]
    );
  };

  const showInstructions = () => {
    const instructions = stravaService.getUserInstructions();
    
    Alert.alert(
      instructions.title,
      `${instructions.description}\n\n${instructions.steps.join('\n')}\n\n💡 ${instructions.privacy}`,
      [
        { text: 'Begrepen' },
        { 
          text: 'Clear Cache', 
          style: 'destructive',
          onPress: async () => {
            const result = await stravaService.clearAllCache();
            Alert.alert('Cache Cleared', result.message);
            updateConnectionStatus();
          }
        }
      ]
    );
  };

  if (!connectionStatus) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#FC4C02" />
      </View>
    );
  }

  if (connectionStatus.isConnected && connectionStatus.userProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.connectedCard}>
          <View style={styles.connectedHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#00D924" />
            <View style={styles.userInfo}>
              <Text style={styles.connectedTitle}>Verbonden met Strava</Text>
              <Text style={styles.userName}>
                {connectionStatus.userProfile.firstname} {connectionStatus.userProfile.lastname}
              </Text>
            </View>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.syncButton]}
              onPress={async () => {
                setIsConnecting(true);
                const result = await stravaService.importActivities();
                setIsConnecting(false);
                
                // Don't show alert here - the service will show toast notifications
                // Only show alert for specific cases where toast doesn't cover it
                if (!result.success && result.imported === 0) {
                  Alert.alert('❌ Synchronisatie Mislukt', result.error);
                }
              }}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sync" size={16} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Sync Nu</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={handleDisconnect}
            >
              <Ionicons name="unlink" size={16} color="#FF6B6B" />
              <Text style={[styles.buttonText, { color: '#FF6B6B' }]}>
                Verbreken
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.connectCard}>
        <View style={styles.stravaHeader}>
          <Ionicons name="logo-strava" size={32} color="#FC4C02" />
          <Text style={styles.title}>Koppel Strava</Text>
        </View>
        
        <Text style={styles.description}>
          Importeer automatisch je trainingen uit Strava en zie al je sportactiviteiten in één overzicht.
        </Text>
        
        <TouchableOpacity
          style={[styles.connectButton, isConnecting && styles.connectingButton]}
          onPress={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="logo-strava" size={20} color="#FFFFFF" />
              <Text style={styles.connectButtonText}>Verbind met Strava</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.helpButton}
          onPress={showInstructions}
        >
          <Ionicons name="help-circle-outline" size={16} color="#666" />
          <Text style={styles.helpText}>Hoe werkt dit?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  connectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  connectedCard: {
    backgroundColor: '#F8FFF9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#00D924',
  },
  stravaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  connectButton: {
    backgroundColor: '#FC4C02',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  connectingButton: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  helpText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 4,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  connectedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00D924',
  },
  userName: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  syncButton: {
    backgroundColor: '#4F8EF7',
  },
  disconnectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default StravaConnectionButton;