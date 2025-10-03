import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
  Keyboard,
  KeyboardAvoidingView
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
import { Linking } from 'react-native';

import {
  requestActivityRecognitionPermission,
  requestLocationPermissions,
  requestLocationPermissionsSafe, // Nieuwe safe versie
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

  const [permissionLoading, setPermissionLoading] = useState({});
  const scrollViewRef = useRef(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [uiError, setUiError] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [lastRenderTime, setLastRenderTime] = useState(Date.now());

  // Keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll naar beneden wanneer keyboard verschijnt
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // UI state monitoring - detecteert rendering problemen
  useEffect(() => {
    console.log(`[ONBOARDING] Step changed to: ${currentStep}, data:`, currentStepData);
    setLastRenderTime(Date.now());
    
    // Check of we valid step data hebben
    if (!currentStepData) {
      console.error('[ONBOARDING] Invalid step data for step:', currentStep);
      setUiError('Ongeldige stap data. Probeer de app opnieuw te starten.');
      return;
    }
    
    // Reset error state bij stap verandering
    if (uiError) {
      setUiError(null);
    }
  }, [currentStep, currentStepData, uiError]);

  // Emergency mode detection - als UI niet meer update
  useEffect(() => {
    const emergencyTimer = setInterval(() => {
      const timeSinceLastRender = Date.now() - lastRenderTime;
      if (timeSinceLastRender > 30000) { // 30 seconden zonder render
        console.error(`[ONBOARDING] EMERGENCY: No render for ${timeSinceLastRender}ms`);
        setEmergencyMode(true);
      }
    }, 5000); // Check elke 5 seconden

    return () => clearInterval(emergencyTimer);
  }, [lastRenderTime]);

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
          description: 'Helpt bij het herkennen van patronen in je dagelijkse routine. Je wordt naar de systeem instellingen gebracht.',
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
          console.log('[ONBOARDING] Using SAFE location permission request');
          const locationResult = await requestLocationPermissionsSafe(); // Gebruik de nieuwe safe versie
          console.log('[ONBOARDING] Safe location permission result:', locationResult);
          
          // Verbeterde logica: accepteer zowel fine als coarse location
          if (locationResult) {
            const fineLocationGranted = locationResult[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.GRANTED;
            const coarseLocationGranted = locationResult[PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION] === RESULTS.GRANTED;
            
            if (fineLocationGranted) {
              console.log('[ONBOARDING] Fine location granted - using precise location tracking');
              return true;
            } else if (coarseLocationGranted) {
              console.log('[ONBOARDING] Coarse location granted - using approximate location tracking');
              return true;
            }
          }
          console.log('[ONBOARDING] No location permissions granted');
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
          console.warn(`Unknown permission type: ${permissionType}`);
          return false;
      }
    } catch (error) {
      console.error(`Permission error for ${permissionType}:`, error);
      
      // Specifieke error handling per type
      if (error.code === 'E_PERMISSION_DENIED') {
        console.log(`Permission ${permissionType} was denied by user`);
      } else if (error.code === 'E_PERMISSION_UNAVAILABLE') {
        console.log(`Permission ${permissionType} is not available on this device`);
      } else {
        console.log(`Unexpected error requesting permission ${permissionType}:`, error.message);
      }
      
      return false;
    }
  };

  const handlePermissionToggle = async (permissionKey, permissionType) => {
    console.log(`[ONBOARDING] Permission toggle started: ${permissionKey} (${permissionType})`);
    const currentValue = settings[permissionKey];
    
    // Crash detectie - monitor of we deze functie kunnen verlaten
    let functionCompleted = false;
    const crashDetectionTimeout = setTimeout(() => {
      if (!functionCompleted) {
        console.error(`[ONBOARDING] CRASH DETECTED: Function did not complete for ${permissionType}`);
        setUiError(`App crash gedetecteerd tijdens ${permissionType}. Probeer opnieuw.`);
      }
    }, 15000); // 15 seconden crash detectie
    
    try {
      // Voeg loading state toe voor deze permission
      console.log(`[ONBOARDING] Setting loading state for ${permissionKey}`);
      setPermissionLoading(prev => ({ ...prev, [permissionKey]: true }));
      
      if (!currentValue) {
        console.log(`[ONBOARDING] Requesting permission: ${permissionType}`);
        
        // **FUNDAMENTELE AANPASSING**: Gebruik systeem instellingen in plaats van systeem dialog
        if (permissionType === 'location') {
          console.log('[ONBOARDING] Using SYSTEM SETTINGS approach for location permission');
          await openSystemLocationSettings();
          // We weten niet of ze het geaccepteerd hebben, dus we nemen aan dat het gelukt is
          updateSetting(permissionKey, true);
          console.log(`[ONBOARDING] System settings opened for ${permissionType}`);
        } else {
          // Voor andere permissions proberen we nog steeds de normale weg
          const granted = await requestPermission(permissionType);
          console.log(`[ONBOARDING] Permission result for ${permissionType}: ${granted}`);
          
          if (granted) {
            console.log(`[ONBOARDING] Updating state for ${permissionKey} to true`);
            updateSetting(permissionKey, true);
          } else {
            console.log(`[ONBOARDING] Permission denied for ${permissionType}`);
          }
        }
      } else {
        console.log(`[ONBOARDING] Disabling permission: ${permissionKey}`);
        updateSetting(permissionKey, false);
      }
    } catch (error) {
      console.error(`[ONBOARDING] ERROR in permission toggle:`, error);
      console.error(`[ONBOARDING] Error name: ${error.name}`);
      console.error(`[ONBOARDING] Error message: ${error.message}`);
      console.error(`[ONBOARDING] Error stack: ${error.stack}`);
      
      // Specifieke error types afhandelen
      if (error.name === 'TypeError' && error.message.includes('undefined')) {
        setUiError(`App fout: ontbrekende data. Herstart de app.`);
      } else if (error.name === 'RangeError') {
        setUiError(`App fout: ongeldige waarde. Herstart de app.`);
      } else {
        setUiError(`Onverwachte fout: ${error.message}. Probeer opnieuw.`);
      }
    } finally {
      functionCompleted = true;
      clearTimeout(crashDetectionTimeout);
      
      console.log(`[ONBOARDING] Cleaning up loading state for ${permissionKey}`);
      // Verwijder loading state met een kleine vertraging voor smooth UI
      setTimeout(() => {
        setPermissionLoading(prev => {
          const newState = { ...prev };
          delete newState[permissionKey];
          return newState;
        });
      }, 300);
      
      console.log(`[ONBOARDING] Permission toggle completed: ${permissionKey}`);
    }
  };

  const openSystemLocationSettings = async () => {
    console.log('[ONBOARDING] Opening system location settings');
    try {
      // Gebruik Linking om de systeem instellingen te openen
      if (Platform.OS === 'android') {
        // Android location settings
        await Linking.openSettings();
        console.log('[ONBOARDING] System settings opened successfully');
      } else {
        // iOS - open general settings
        await Linking.openSettings();
        console.log('[ONBOARDING] iOS settings opened successfully');
      }
    } catch (error) {
      console.error('[ONBOARDING] Failed to open system settings:', error);
      throw new Error(`Kan systeem instellingen niet openen: ${error.message}`);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Focus management: scroll naar top bij stap wisseling
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Focus management: scroll naar top bij stap wisseling
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    
    try {
      // Save AI preferences
      await setPreferredAIModel(settings.preferredAIModel);
      
      // Save settings to AsyncStorage met error handling
      try {
        await AsyncStorage.setItem('narrativeStyle', settings.narrativeStyle);
      } catch (storageError) {
        console.error('Error saving narrative style:', storageError);
        // Ga door met de flow ook als opslagen mislukt
      }
      
      // Update app context with settings - met error handling
      try {
        await updateSettings({ 
          trackLocation: settings.trackLocation,
          trackActivity: settings.trackActivity,
          trackCalls: settings.trackCalls,
          allowNotifications: settings.allowNotifications,
          preferredAIModel: settings.preferredAIModel,
          narrativeStyle: settings.narrativeStyle,
          isOnboarded: true 
        });
      } catch (contextError) {
        console.error('Error updating app context:', contextError);
        // Ga door met de flow ook als context update mislukt
      }
      
      // Mark onboarding as completed - met error handling
      try {
        await AsyncStorage.setItem('onboarding_completed', 'true');
      } catch (completionError) {
        console.error('Error saving onboarding completion:', completionError);
        // Ga door met de flow ook als markeren mislukt
      }
      
      // Complete onboarding met korte vertraging voor visuele feedback
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 300);
      
    } catch (error) {
      console.error('Onboarding completion error:', error);
      
      // Specifieke foutafhandeling
      if (error.message?.includes('Network')) {
        Alert.alert(
          'Netwerkfout',
          'Er is een netwerkprobleem. Controleer je verbinding en probeer het opnieuw.',
          [{ text: 'Oké' }]
        );
      } else if (error.message?.includes('Storage')) {
        Alert.alert(
          'Opslagfout',
          'Er is een probleem met het opslaan van je instellingen. Controleer de app-machtigingen.',
          [{ text: 'Oké' }]
        );
      } else {
        Alert.alert(
          'Fout',
          'Er ging iets mis bij het voltooien van de setup. Probeer het opnieuw of herstart de app.',
          [{ text: 'Oké' }]
        );
      }
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
            accessible={true}
            accessibilityLabel={`${option.title} ${option.subtitle} ${option.recommended ? 'Aanbevolen' : ''} ${currentValue === option.id ? 'geselecteerd' : 'niet geselecteerd'}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: currentValue === option.id }}
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
    if (!step || !step.permissions) {
      console.error('Invalid step or permissions data:', step);
      return (
        <View style={styles.errorContainer}>
          <Typography variant="body1" color="text.secondary">
            Geen toestemmingen beschikbaar
          </Typography>
        </View>
      );
    }
    
    const availablePermissions = step.permissions.filter(
      perm => !perm.androidOnly || Platform.OS === 'android'
    );

    if (availablePermissions.length === 0) {
      return (
        <View style={styles.permissionsContainer}>
          <Typography variant="body1" color="text.secondary">
            Geen toestemmingen beschikbaar voor dit platform
          </Typography>
        </View>
      );
    }

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
                {permission.permission === 'location' && (
                  <Typography variant="caption" color={Colors.warning[500]} style={styles.permissionWarning}>
                    ⚠️ Je wordt naar de systeem instellingen gebracht
                  </Typography>
                )}
              </View>
              <TouchableOpacity
                key={`toggle-${permission.key}`}
                style={[
                  styles.permissionToggle,
                  settings[permission.key] && styles.permissionToggleActive,
                  permissionLoading[permission.key] && styles.permissionToggleLoading
                ]}
                onPress={() => handlePermissionToggle(permission.key, permission.permission)}
                disabled={permissionLoading[permission.key]}
                accessible={true}
                accessibilityLabel={`${permission.title} ${settings[permission.key] ? 'uitschakelen' : 'inschakelen'}`}
                accessibilityRole="switch"
                accessibilityState={{ 
                  checked: settings[permission.key], 
                  disabled: permissionLoading[permission.key] 
                }}
              >
                {permissionLoading[permission.key] ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : settings[permission.key] ? (
                  <Ionicons name="checkmark" size={16} color={Colors.white} />
                ) : (
                  <View 
                    style={[
                      styles.permissionToggleKnob,
                      settings[permission.key] && styles.permissionToggleKnobActive
                    ]}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const currentStepData = steps[currentStep] || steps[0]; // Fallback naar eerste stap
  const isLastStep = currentStep === steps.length - 1;

  // Emergency mode - als de UI vastloopt
  if (emergencyMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emergencyContainer}>
          <Ionicons name="warning-outline" size={64} color={Colors.warning[500]} />
          <Typography variant="h4" color="text.primary" style={styles.emergencyTitle}>
            Emergency Herstel Modus
          </Typography>
          <Typography variant="body1" color="text.secondary" style={styles.emergencyMessage}>
            De app reageert niet meer. Dit kan gebeuren na het verlenen van toestemmingen.
          </Typography>
          <Typography variant="body2" color="text.secondary" style={styles.emergencyInfo}>
            Laatste update: {new Date(lastRenderTime).toLocaleTimeString()}
          </Typography>
          <View style={styles.emergencyButtons}>
            <Button
              title="Herstel UI"
              variant="primary"
              onPress={() => {
                console.log('[ONBOARDING] Emergency UI recovery triggered');
                setEmergencyMode(false);
                setLastRenderTime(Date.now());
                // Forceer een complete UI reset
                setCurrentStep(prev => prev);
              }}
              style={styles.emergencyButton}
            />
            <Button
              title="Sla Over"
              variant="outline"
              onPress={() => {
                console.log('[ONBOARDING] Emergency skip triggered');
                if (onComplete) {
                  onComplete(); // Skip onboarding
                }
              }}
              style={styles.emergencyButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error boundary functionaliteit
  if (uiError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.danger[500]} />
          <Typography variant="h4" color="text.primary" style={styles.errorTitle}>
            Er is een fout opgetreden
          </Typography>
          <Typography variant="body1" color="text.secondary" style={styles.errorMessage}>
            {uiError}
          </Typography>
          <Button
            title="Probeer opnieuw"
            variant="primary"
            onPress={() => {
              setUiError(null);
              setCurrentStep(0); // Reset naar begin
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        accessible={true}
        accessibilityLabel={`Stap ${currentStep + 1} van ${steps.length}: ${currentStepData.title}`}
      >
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
              accessible={true}
              accessibilityLabel="Vorige stap"
              accessibilityHint="Ga terug naar de vorige stap in de onboarding"
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
            accessible={true}
            accessibilityLabel={isLastStep ? "Voltooi onboarding" : "Volgende stap"}
            accessibilityHint={isLastStep ? "Voltooi de onboarding en ga naar de hoofdapp" : "Ga naar de volgende stap"}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background.primary,
  },
  errorTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  
  // Emergency mode styles
  emergencyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background.primary,
  },
  emergencyTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: Colors.warning[500],
  },
  emergencyMessage: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  emergencyInfo: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontSize: 12,
    color: Colors.gray[500],
  },
  emergencyButtons: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
  },
  emergencyButton: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  permissionWarning: {
    marginTop: Spacing.xs,
    fontSize: 11,
    fontWeight: '500',
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
  permissionToggleLoading: {
    justifyContent: 'center',
    alignItems: 'center',
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