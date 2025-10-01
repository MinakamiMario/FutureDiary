// src/components/StravaSetupGuide.js
// Setup guide for Strava integration

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StravaSetupGuide = ({ onComplete }) => {
  const steps = [
    {
      icon: 'globe-outline',
      title: 'Ga naar Strava API',
      description: 'Open de Strava ontwikkelaars website',
      action: () => Linking.openURL('https://www.strava.com/settings/api'),
      actionText: 'Open Strava API'
    },
    {
      icon: 'add-circle-outline',
      title: 'Maak nieuwe app aan',
      description: 'Klik op "Create App" om een nieuwe applicatie te registreren',
      details: [
        'Application Name: MinakamiApp',
        'Category: Training',
        'Website: https://je-website.nl (optioneel)',
        'Authorization Callback Domain: minakamiapp://strava/callback'
      ]
    },
    {
      icon: 'key-outline',
      title: 'Kopieer credentials',
      description: 'Na het aanmaken krijg je een Client ID en Client Secret',
      details: [
        'Client ID: bijvoorbeeld 98765',
        'Client Secret: bijvoorbeeld abc123xyz789'
      ]
    },
    {
      icon: 'code-outline',
      title: 'Update configuratie',
      description: 'Vervang de demo waarden in strava.config.js',
      code: `// strava.config.js
const StravaConfig = {
  CLIENT_ID: 'je_client_id_hier',
  CLIENT_SECRET: 'je_client_secret_hier',
  // Rest blijft hetzelfde...
};`
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'Test verbinding',
      description: 'Rebuild je app en test de Strava verbinding',
      action: () => onComplete?.(),
      actionText: 'Klaar!'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="construct" size={32} color="#4F8EF7" />
        <Text style={styles.title}>Strava Integratie Instellen</Text>
        <Text style={styles.subtitle}>
          Eenmalige setup om echte Strava data te kunnen importeren
        </Text>
      </View>

      <View style={styles.warning}>
        <Ionicons name="information-circle" size={20} color="#FF9500" />
        <Text style={styles.warningText}>
          Deze setup is eenmalig en alleen nodig voor de app ontwikkelaar. 
          Eindgebruikers hoeven dit niet te doen!
        </Text>
      </View>

      {steps.map((step, index) => (
        <View key={index} style={styles.step}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Ionicons name={step.icon} size={24} color="#4F8EF7" />
            <Text style={styles.stepTitle}>{step.title}</Text>
          </View>

          <Text style={styles.stepDescription}>{step.description}</Text>

          {step.details && (
            <View style={styles.detailsContainer}>
              {step.details.map((detail, detailIndex) => (
                <View key={detailIndex} style={styles.detailItem}>
                  <Ionicons name="ellipse" size={4} color="#666" />
                  <Text style={styles.detailText}>{detail}</Text>
                </View>
              ))}
            </View>
          )}

          {step.code && (
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{step.code}</Text>
            </View>
          )}

          {step.action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={step.action}
            >
              <Ionicons name="open-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>{step.actionText}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <View style={styles.footer}>
        <View style={styles.footerIcon}>
          <Ionicons name="shield-checkmark" size={24} color="#00D924" />
        </View>
        <Text style={styles.footerTitle}>Veilig & Privé</Text>
        <Text style={styles.footerText}>
          Je Strava credentials worden veilig opgeslagen in de app configuratie. 
          Gebruikers hoeven geen eigen API keys aan te maken.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5E6',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    fontSize: 13,
    color: '#B8860B',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  step: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F8EF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 60,
    marginBottom: 8,
  },
  detailsContainer: {
    marginLeft: 60,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  codeContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 12,
    marginLeft: 60,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4F8EF7',
  },
  codeText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'Courier New',
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F8EF7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginLeft: 60,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#F8FFF9',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  footerIcon: {
    marginBottom: 8,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D924',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default StravaSetupGuide;