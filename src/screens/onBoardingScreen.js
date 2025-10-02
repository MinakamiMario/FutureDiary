import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../utils/appContext';
import { AI_MODEL_TYPES, setPreferredAIModel } from '../services/aiNarrativeService';
import { NARRATIVE_STYLES } from '../utils/narrativeStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Card from '../components/ui/Card';
import Typography from '../components/ui/Typography';
import Button from '../components/ui/Button';
import { Colors, Spacing } from '../styles/designSystem';

import {
  requestActivityRecognitionPermission,
  requestLocationPermissions,
  requestCallLogPermission,
  requestNotificationPermission,
  isPermissionGranted,
  PERMISSIONS,
  RESULTS,
} from '../utils/permissions';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ onComplete }) => {
  const { updateSettings } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    trackLocation: false,
    trackActivity: false,
    trackCalls: false,
    allowNotifications: false,
    preferredAIModel: AI_MODEL_TYPES.TEMPLATE,
    narrativeStyle: NARRATIVE_STYLES.STANDAARD,
  });

  const steps = [
    {
      id: 'welcome',
      title: 'Welkom bij Minakami',
      subtitle: 'Jouw persoonlijke gezondheidsassistent',
      description: 'Minakami helpt je inzicht te krijgen in je dagelijkse activiteiten en gezondheid. Laten we beginnen met het instellen van je voorkeuren.',
      icon: 'heart-outline',
      iconColor: Colors.primary[500],
    },
    {
      id: 'ai-model',
      title: 'Kies je AI-assistent',
      subtitle: 'Hoe wil je dat je verhalen worden gegenereerd?',
      description: 'Selecteer de AI-service die je verhalen en inzichten zal genereren.',
      icon: 'sparkles-outline',
      iconColor: Colors.secondary[500],
      type: 'selection',
      setting: 'preferredAIModel',
      options: [
        {
          id: AI_MODEL_TYPES.TEMPLATE,
          title: 'Eenvoudige Sjablonen',
          subtitle: 'Snel en offline',
          description: 'Gebruikt voorgedefinieerde sjablonen voor snelle verhalen',
          icon: 'document-text-outline',
          recommended: true,
        },
        {
          id: AI_MODEL_TYPES.CLAUDE,
          title: 'Claude AI',
          subtitle: 'Geavanceerd',
          description: 'Premium AI voor uitgebreide en gepersonaliseerde verhalen',
          icon: 'sparkles-outline',
          badge: 'Premium',
        },
        {
          id: AI_MODEL_TYPES.CHATGPT,
          title: 'ChatGPT',
          subtitle: 'Intelligent',
          description: 'OpenAI\'s ChatGPT voor creatieve en gedetailleerde verhalen',
          icon: 'chatbubbles-outline',
          badge: 'Premium',
        },
      ]
    },
    {
      id: 'narrative-style',
      title: 'Jouw vertelstijl',
      subtitle: 'Hoe wil je dat je verhalen klinken?',
      description: 'Kies een stijl die bij jou past voor je dagelijkse samenvattingen.',
      icon: 'brush-outline',
      iconColor: Colors.accent[500],
      type: 'selection',
      setting: 'narrativeStyle',
      options: [
        {
          id: NARRATIVE_STYLES.STANDAARD,
          title: 'Standaard',
          subtitle: 'Helder en direct',
          description: 'Eenvoudige en duidelijke verhalen',
          icon: 'document-outline',
          recommended: true,
        },
        {
          id: NARRATIVE_STYLES.CASUAL,
          title: 'Casual',
          subtitle: 'Vriendelijk en ontspannen',
          description: 'Informele en toegankelijke verhalen',
          icon: 'happy-outline',
        },
        {
          id: NARRATIVE_STYLES.DETAILED,
          title: 'Gedetailleerd',
          subtitle: 'Uitgebreid en informatief',
          description: 'Uitvoerige verhalen met veel context',
          icon: 'list-outline',
        },
      ]
    },
    {
      id: 'permissions',
      title: 'Toestemmingen instellen',
      subtitle: 'Welke gegevens wil je delen?',
      description: 'Kies welke informatie Minakami mag gebruiken om jouw verhaal te vertellen. Je kunt dit later altijd wijzigen.',
      icon: 'shield-checkmark-outline',
      iconColor: Colors.success[500],
      type: 'permissions',
      permissions: [
        {
          key: 'trackActivity',
          title: 'Activiteit tracking',
          subtitle: 'Stappen, beweging en activiteiten',
          description: 'Toestaan om je dagelijkse activiteiten bij te houden',
          icon: 'walk-outline',
          permission: 'activity',
        },
        {
          key: 'trackLocation',
          title: 'Locatie tracking',
          subtitle: 'Waar je de meeste tijd doorbrengt',
          description: 'Helpt bij het herkennen van patronen in je dagelijkse routine',
          icon: 'location-outline',
          permission: 'location',
        },
        {
          key: 'trackCalls',
          title: 'Oproep statistieken',
          subtitle: 'Gespreksduur en frequentie',
          description: 'Alleen duur en aantal, geen inhoud of contacten',
          icon: 'call-outline',
          permission: 'calls',
          androidOnly: true,
        },
        {
          key: 'allowNotifications',
          title: 'Dagelijkse meldingen',
          subtitle: 'Samenvattingen en herinneringen',
          description: 'Ontvang dagelijkse inzichten over je activiteiten',
          icon: 'notifications-outline',
          permission: 'notifications',
        },
      ]
    },
    {
      id: 'complete',
      title: 'Je bent klaar!',
      subtitle: 'Minakami is ingesteld',
      description: 'Je persoonlijke gezondheidsassistent is klaar voor gebruik. Begin vandaag nog met het ontdekken van je dagelijkse patronen.',
      icon: 'checkmark-circle-outline',
      iconColor: Colors.success[500],
    },
  ];

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const requestPermission = async (permissionType) => {
    try {
      switch (permissionType) {
        case 'activity':
          const activityResult = await requestActivityRecognitionPermission();
          return isPermissionGranted(activityResult);
        
        case 'location':
          const locationResult = await requestLocationPermissions();
          // Controleer of fine location is toegestaan (dat is wat we nodig hebben voor exacte locatie)
          if (locationResult && locationResult[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.GRANTED) {
            return true;
          }
          return false;
        
        case 'calls':
          if (Platform.OS === 'android') {
            const callResult = await requestCallLogPermission();
            return isPermissionGranted(callResult);
          }
          return true;
        
        case 'notifications':
          const notificationResult = await requestNotificationPermission();
          return isPermissionGranted(notificationResult);
        
        default:
          return false;
      }
    } catch (error) {
      console.error(`Permission error for ${permissionType}:`, error);
      return false;
    }
  };

  const handlePermissionToggle = async (permissionKey, permissionType) => {
    const currentValue = settings[permissionKey];
    
    if (!currentValue) {
      // Turning on - request permission
      const granted = await requestPermission(permissionType);
      if (granted) {
        updateSetting(permissionKey, true);
        Alert.alert(
          'Toestemming verleend',
          'Deze functie is nu ingeschakeld.',
          [{ text: 'Oké' }]
        );
      } else {
        Alert.alert(
          'Toestemming geweigerd',
          'Deze functie kan niet worden ingeschakeld zonder toestemming.',
          [{ text: 'Begrijp ik' }]
        );
      }
    } else {
      // Turning off
      updateSetting(permissionKey, false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    
    try {
      // Save AI preferences
      await setPreferredAIModel(settings.preferredAIModel);
      await AsyncStorage.setItem('narrativeStyle', settings.narrativeStyle);
      
      // Update app context with settings
      await updateSettings({ ...settings, isOnboarded: true });
      
      // Mark onboarding as completed
      await AsyncStorage.setItem('onboarding_completed', 'true');
      
      // Complete onboarding
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 500);
      
    } catch (error) {
      console.error('Onboarding completion error:', error);
      Alert.alert(
        'Fout',
        'Er ging iets mis bij het voltooien van de setup. Probeer het opnieuw.',
        [{ text: 'Oké' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderSelectionStep = (step) => {
    const currentValue = settings[step.setting];
    
    return (
      <View style={styles.selectionContainer}>
        {step.options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              currentValue === option.id && styles.optionCardSelected
            ]}
            onPress={() => updateSetting(step.setting, option.id)}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionIconContainer}>
                <Ionicons 
                  name={option.icon} 
                  size={24} 
                  color={currentValue === option.id ? Colors.primary[500] : Colors.gray[400]} 
                />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Typography variant="h6" color={currentValue === option.id ? "primary" : "text.primary"}>
                    {option.title}
                  </Typography>
                  {option.recommended && (
                    <View key={`recommended-${option.id}`} style={styles.recommendedBadge}>
                      <Typography variant="caption" color="white">
                        Aanbevolen
                      </Typography>
                    </View>
                  )}
                  {option.badge && (
                    <View key={`badge-${option.id}`} style={styles.premiumBadge}>
                      <Typography variant="caption" color="white">
                        {option.badge}
                      </Typography>
                    </View>
                  )}
                </View>
                <Typography variant="body2" color="text.secondary">
                  {option.subtitle}
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.optionDescription}>
                  {option.description}
                </Typography>
              </View>
              {currentValue === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary[500]} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPermissionsStep = (step) => {
    const availablePermissions = step.permissions.filter(
      perm => !perm.androidOnly || Platform.OS === 'android'
    );

    return (
      <View style={styles.permissionsContainer}>
        {availablePermissions.map((permission) => (
          <View key={permission.key} style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <View style={styles.permissionIconContainer}>
                <Ionicons 
                  name={permission.icon} 
                  size={24} 
                  color={settings[permission.key] ? Colors.primary[500] : Colors.gray[400]} 
                />
              </View>
              <View style={styles.permissionContent}>
                <Typography variant="h6" color="text.primary">
                  {permission.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {permission.subtitle}
                </Typography>
                <Typography variant="caption" color="text.secondary" style={styles.permissionDescription}>
                  {permission.description}
                </Typography>
              </View>
              <TouchableOpacity
                key={`toggle-${permission.key}`}
                style={[
                  styles.permissionToggle,
                  settings[permission.key] && styles.permissionToggleActive
                ]}
                onPress={() => handlePermissionToggle(permission.key, permission.permission)}
              >
                <View 
                  style={[
                    styles.permissionToggleKnob,
                    settings[permission.key] && styles.permissionToggleKnobActive
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Typography variant="h2" color="primary" style={styles.appTitle}>
          Minakami
        </Typography>
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / steps.length) * 100}%` }
              ]} 
            />
          </View>
          <Typography variant="caption" color="text.secondary" style={styles.progressText}>
            Stap {currentStep + 1} van {steps.length}
          </Typography>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.stepCard}>
          <View style={styles.stepIconContainer}>
            <View style={[styles.stepIcon, { backgroundColor: `${currentStepData.iconColor || Colors.primary[500]}20` }]}>
              <Ionicons 
                name={currentStepData.icon} 
                size={48} 
                color={currentStepData.iconColor || Colors.primary[500]} 
              />
            </View>
          </View>

          <Typography variant="h3" color="text.primary" style={styles.stepTitle}>
            {currentStepData.title}
          </Typography>

          <Typography variant="h6" color="text.secondary" style={styles.stepSubtitle}>
            {currentStepData.subtitle}
          </Typography>

          <Typography variant="body1" color="text.secondary" style={styles.stepDescription}>
            {currentStepData.description}
          </Typography>

          {/* Step Content */}
          {currentStepData.type === 'selection' && renderSelectionStep(currentStepData)}
          {currentStepData.type === 'permissions' && renderPermissionsStep(currentStepData)}
        </Card>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <View style={styles.navigationButtons}>
          {currentStep > 0 ? (
            <Button
              title="Vorige"
              variant="outline"
              size="medium"
              leftIcon={<Ionicons name="arrow-back" size={20} color={Colors.primary[500]} />}
              onPress={prevStep}
              style={styles.backButton}
            />
          ) : <View style={styles.backButton} />}

          <Button
            title={isLastStep ? (isLoading ? "Bezig..." : "Voltooien") : "Volgende"}
            variant="primary"
            size="large"
            rightIcon={!isLastStep ? <Ionicons name="arrow-forward" size={20} color="white" /> : null}
            onPress={nextStep}
            disabled={isLoading}
            loading={isLoading}
            style={styles.nextButton}
          />
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success[500]} />
          <Typography variant="caption" color="text.secondary" style={styles.privacyText}>
            Je gegevens blijven veilig op je telefoon en worden nooit gedeeld
          </Typography>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  appTitle: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary[500],
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepCard: {
    marginVertical: Spacing.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  stepIconContainer: {
    marginBottom: Spacing.lg,
  },
  stepIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  stepDescription: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },

  // Selection styles
  selectionContainer: {
    width: '100%',
  },
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.gray[200],
  },
  optionCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  recommendedBadge: {
    backgroundColor: Colors.success[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: Spacing.sm,
  },
  premiumBadge: {
    backgroundColor: Colors.warning[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: Spacing.sm,
  },
  optionDescription: {
    marginTop: Spacing.xs,
    lineHeight: 16,
  },

  // Permissions styles
  permissionsContainer: {
    width: '100%',
  },
  permissionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  permissionContent: {
    flex: 1,
  },
  permissionDescription: {
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  permissionToggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray[300],
    padding: 2,
    justifyContent: 'center',
  },
  permissionToggleActive: {
    backgroundColor: Colors.primary[500],
  },
  permissionToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
  },
  permissionToggleKnobActive: {
    alignSelf: 'flex-end',
  },

  // Navigation styles
  navigation: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    flex: 0.3,
  },
  nextButton: {
    flex: 0.6,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  privacyText: {
    marginLeft: Spacing.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default OnboardingScreen;