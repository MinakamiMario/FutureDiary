// src/screens/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../utils/appContext';
// Assume Android mobile app
import { AI_MODEL_TYPES, setPreferredAIModel, isBrowserContext } from '../services/aiNarrativeService';
import { NARRATIVE_STYLES } from '../utils/narrativeStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Card from '../components/ui/Card';
import Typography from '../components/ui/Typography';
import Button from '../components/ui/Button';
import { Colors, Spacing, Typography as DesignTypography } from '../styles/designSystem';

import locationService from '../services/locationService';
import activityService from '../services/activityService';
import callLogService from '../services/callLogService';
import notificationService from '../services/notificationService';

// Import de echte permissions van permissions.js
import {
  requestAllCorePermissions,
  requestLocationPermissions as requestLocationPermissionsFromUtils,
  requestCallLogPermission,
  requestPhoneStatePermission,
  requestActivityRecognitionPermission,
  requestNotificationPermission,
  requestBodySensorsPermission,
  checkAllPermissionsStatus,
  isPermissionGranted,
  PERMISSIONS,
  RESULTS
} from '../utils/permissions';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ onComplete }) => {
  const { updateSettings } = useAppContext();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);
  const [settings, setSettings] = useState({
    trackLocation: true,
    trackActivity: true,
    trackCalls: true,
    allowNotifications: true,
    dailyNotifications: true,
    weeklyNotifications: true,
    preferredAIModel: AI_MODEL_TYPES.TEMPLATE,
    narrativeStyle: NARRATIVE_STYLES.STANDARD,
    privacySettings: {
      shareAnalytics: false,
      storeEncrypted: true,
      encryptCallData: true,
      retentionPeriod: 90 // dagen
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [permissionsRequested, setPermissionsRequested] = useState(new Set());

  // Vraag automatisch permissies aan voor ingeschakelde settings bij eerste keer bekijken
  const requestPermissionsForEnabledSettings = async (pageId, setting) => {
    if (!setting || permissionsRequested.has(setting)) {
      return; // Geen setting of al gevraagd
    }

    const isEnabled = setting.includes('.') 
      ? settings[setting.split('.')[0]][setting.split('.')[1]]
      : settings[setting];

    if (isEnabled && ['trackActivity', 'trackLocation', 'trackCalls', 'allowNotifications'].includes(setting)) {
      console.log(`🔄 Auto-requesting permissions for enabled setting: ${setting}`);
      setPermissionsRequested(prev => new Set([...prev, setting]));
      
      // Vraag permission aan maar update setting niet (is al true)
      try {
        switch (setting) {
          case 'trackActivity':
            await requestActivityPermissions();
            break;
          case 'trackLocation':
            await requestLocationPermissions();
            break;
          case 'trackCalls':
            await requestCallPermissions();
            break;
          case 'allowNotifications':
            await requestNotificationPermissions();
            break;
        }
      } catch (error) {
        console.error(`❌ Auto-permission error for ${setting}:`, error);
      }
    }
  };

  // Onboarding pagina's - Elke stap vertelt een ander verhaal
  const pages = [
    {
      id: 'welcome',
      title: 'Hallo! 👋',
      description: 'Dit is het begin van een persoonlijke ontdekkingstocht. We gaan samen kijken naar hoe jij jouw dagen echt doorbrengt.',
      icon: 'hand-left-outline',
    },
    {
      id: 'ai-preference',
      title: 'Jouw Verhaalgenerator',
      description: 'Hoe wil je dat je dagverhalen worden gemaakt? Kies uit verschillende opties van eenvoudig tot geavanceerd.',
      icon: 'bulb-outline',
      type: 'choice',
      setting: 'preferredAIModel',
      choices: [
        {
          id: AI_MODEL_TYPES.TEMPLATE,
          title: 'Eenvoudige Sjablonen',
          description: 'Snelle verhalen zonder internet nodig',
          icon: 'document-text-outline',
          badge: 'Standaard'
        },
        {
          id: AI_MODEL_TYPES.WEBLLM,
          title: 'Lokale AI',
          description: 'Creatievere verhalen, geen internet nodig',
          icon: 'hardware-chip-outline',
          badge: 'Gratis'
        },
        {
          id: AI_MODEL_TYPES.CLAUDE,
          title: 'Claude AI',
          description: 'Geavanceerde verhalen met Anthropic\'s Claude',
          icon: 'sparkles-outline',
          badge: 'Premium'
        },
        {
          id: AI_MODEL_TYPES.CHATGPT,
          title: 'ChatGPT',
          description: 'Intelligente verhalen met OpenAI\'s ChatGPT',
          icon: 'chatbubbles-outline',
          badge: 'Premium'
        }
      ]
    },
    {
      id: 'narrative-style',
      title: 'Jouw Vertelstijl',
      description: 'In welke stijl wil je dat je verhalen worden verteld? Kies wat bij jou past.',
      icon: 'brush-outline',
      type: 'choice',
      setting: 'narrativeStyle',
      choices: [
        {
          id: NARRATIVE_STYLES.STANDARD,
          title: 'Standaard',
          description: 'Heldere, directe verhalen',
          icon: 'document-outline'
        },
        {
          id: NARRATIVE_STYLES.CASUAL,
          title: 'Casual',
          description: 'Vriendelijk en ontspannen',
          icon: 'happy-outline'
        },
        {
          id: NARRATIVE_STYLES.DETAILED,
          title: 'Gedetailleerd',
          description: 'Uitgebreide verhalen met veel context',
          icon: 'list-outline'
        },
        {
          id: NARRATIVE_STYLES.PROFESSIONAL,
          title: 'Professioneel',
          description: 'Formele, rapport-achtige stijl',
          icon: 'business-outline'
        },
        {
          id: NARRATIVE_STYLES.POETIC,
          title: 'Poëtisch',
          description: 'Creatief met mooie beeldspraak',
          icon: 'flower-outline'
        }
      ]
    },
    {
      id: 'activity',
      title: 'Beweging in Beeld',
      description: 'Zit je veel of beweeg je genoeg? We tellen je stappen en herkennen of je loopt, staat still of actief bent.',
      icon: 'walk-outline',
      setting: 'trackActivity',
    },
    {
      id: 'location',
      title: 'Jouw Stammplekken',
      description: 'Waar ben je eigenlijk de hele dag? We maken een kaart van je favoriete plekken zonder je exacte route te volgen.',
      icon: 'location-outline',
      setting: 'trackLocation',
    },
    {
      id: 'calls',
      title: 'Met wie praat je?',
      description: 'Hoe vaak bel je eigenlijk en hoe lang? We tellen alleen hoe vaak en hoe lang, niet met wie.',
      icon: 'call-outline',
      setting: 'trackCalls',
      androidOnly: true,
    },
    {
      id: 'notifications',
      title: 'Dagelijkse Terugblik',
      description: 'Elke avond een kort overzichtje: hoe actief was je vandaag en waar heb je tijd doorgebracht.',
      icon: 'notifications-outline',
      setting: 'allowNotifications',
    },
    {
      id: 'privacy',
      title: 'Alles Blijft van Jou',
      description: 'Geen zorgen - alles blijft op je telefoon. We delen niks met anderen en je kunt altijd alles uitzetten.',
      icon: 'shield-checkmark-outline',
      setting: 'privacySettings.shareAnalytics',
      reversed: true,
    },
  ];

  // Update een instelling met optionele permissie-aanvragen
  const updateSetting = async (setting, value) => {
    if (setting.includes('.')) {
      // Update een geneste instelling
      const [parent, child] = setting.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      // Update een reguliere instelling
      setSettings(prev => ({
        ...prev,
        [setting]: value
      }));
    }
  };
  
  // Vraag permissies aan voor specifieke instellingen - DIRECT bij toggle
  const requestPermissionForSetting = async (setting, value) => {
    console.log(`🔄 Toggle ${setting} to ${value}`);
    
    if (!value) {
      // Als uitgeschakeld, geen permissies nodig, gewoon uitzetten
      await updateSetting(setting, value);
      return;
    }
    
    try {
      let permissionGranted = false;
      
      switch (setting) {
        case 'trackActivity':
          console.log('🚶‍♂️ Requesting activity permissions...');
          // Vraag DIRECT activiteit permissies aan bij toggle
          permissionGranted = await requestActivityPermissions();
          if (permissionGranted) {
            await updateSetting(setting, value);
            Alert.alert(
              'Beweging in Beeld Ingeschakeld! 🚶‍♂️',
              'We kunnen nu je stappen tellen en je activiteiten herkennen.',
              [{ text: 'Geweldig!', style: 'default' }]
            );
          } else {
            console.log('❌ Activity permission denied');
            Alert.alert(
              'Toestemming Nodig',
              'Voor bewegingsherkenning hebben we toegang nodig tot je activiteitssensoren.',
              [{ text: 'Begrijp ik', style: 'default' }]
            );
            return; // Verlaat functie zonder setting te updaten
          }
          break;
          
        case 'trackLocation':
          console.log('📍 Requesting location permissions...');
          // Vraag DIRECT locatie permissies aan bij toggle
          permissionGranted = await requestLocationPermissions();
          if (permissionGranted) {
            await updateSetting(setting, value);
            Alert.alert(
              'Locatie Tracking Ingeschakeld! 📍',
              'We kunnen nu zien waar je de meeste tijd doorbrengt. Je privacy blijft beschermd.',
              [{ text: 'Perfect!', style: 'default' }]
            );
          } else {
            console.log('❌ Location permission denied');
            Alert.alert(
              'Locatie Toestemming Nodig',
              'Voor locatie tracking hebben we toegang nodig tot je locatie.',
              [{ text: 'Begrijp ik', style: 'default' }]
            );
            return; // Verlaat functie zonder setting te updaten
          }
          break;
          
        case 'trackCalls':
          console.log('📞 Requesting call permissions...');
          // Vraag DIRECT telefoon permissies aan bij toggle (alleen Android)
          if (Platform.OS === 'android') {
            permissionGranted = await requestCallPermissions();
            if (permissionGranted) {
              await updateSetting(setting, value);
              Alert.alert(
                'Oproep Tracking Ingeschakeld! 📞',
                'We tellen nu je gespreksduur. Wie je belt blijft privé.',
                [{ text: 'Oké!', style: 'default' }]
              );
            } else {
              console.log('❌ Call permission denied');
              Alert.alert(
                'Telefoon Toestemming Nodig',
                'Voor oproep tracking hebben we toegang nodig tot je telefoongegevens.',
                [{ text: 'Begrijp ik', style: 'default' }]
              );
              return; // Verlaat functie zonder setting te updaten
            }
          } else {
            // iOS - geen expliciete call permissions nodig
            await updateSetting(setting, value);
            permissionGranted = true;
          }
          break;
          
        case 'allowNotifications':
          console.log('🔔 Requesting notification permissions...');
          // Vraag DIRECT notificatie permissies aan bij toggle
          permissionGranted = await requestNotificationPermissions();
          if (permissionGranted) {
            await updateSetting(setting, value);
            Alert.alert(
              'Notificaties Ingeschakeld! 🔔',
              'Je krijgt nu dagelijkse samenvattingen van je activiteiten.',
              [{ text: 'Top!', style: 'default' }]
            );
          } else {
            console.log('❌ Notification permission denied');
            Alert.alert(
              'Notificatie Toestemming Nodig',
              'Voor dagelijkse samenvattingen hebben we toestemming nodig voor notificaties.',
              [{ text: 'Begrijp ik', style: 'default' }]
            );
            return; // Verlaat functie zonder setting te updaten
          }
          break;
          
        default:
          // Voor andere instellingen (AI model, stijl, privacy) geen permissies nodig
          console.log(`✅ No permissions needed for ${setting}`);
          await updateSetting(setting, value);
          permissionGranted = true;
          break;
      }
      
      console.log(`✅ Setting ${setting} updated to ${value}`);
      
    } catch (error) {
      console.error('❌ Error requesting permissions for', setting, ':', error);
      Alert.alert(
        'Permissie Probleem',
        `Er ging iets mis bij het aanvragen van toestemming voor ${setting}. Probeer het later opnieuw.`,
        [{ text: 'Oké', style: 'default' }]
      );
    }
  };
  
  // Permissie helper functies - gebruik de echte permissions.js functies
  const requestActivityPermissions = async () => {
    try {
      console.log('🔐 Requesting activity permissions...');
      const result = await requestActivityRecognitionPermission();
      const bodySensorsResult = await requestBodySensorsPermission();
      
      // For activity tracking, we need at least one permission to be granted
      return isPermissionGranted(result) || isPermissionGranted(bodySensorsResult);
    } catch (error) {
      console.error('Activity permission error:', error);
      return false;
    }
  };
  
  const requestLocationPermissions = async () => {
    try {
      console.log('🔐 Requesting location permissions...');
      const results = await requestLocationPermissionsFromUtils();
      
      // requestLocationPermissionsFromUtils returns an object with permission results
      if (results && typeof results === 'object' && !results.error) {
        return isPermissionGranted(results[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]) || 
               isPermissionGranted(results[PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION]);
      }
      return false;
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  };
  
  const requestCallPermissions = async () => {
    try {
      console.log('🔐 Requesting call permissions...');
      if (Platform.OS === 'android') {
        const callLogResult = await requestCallLogPermission();
        const phoneStateResult = await requestPhoneStatePermission();
        
        // For call tracking, we need at least call log permission
        return isPermissionGranted(callLogResult) || isPermissionGranted(phoneStateResult);
      }
      return true; // iOS doesn't need explicit call permissions
    } catch (error) {
      console.error('Call permission error:', error);
      return false;
    }
  };
  
  const requestNotificationPermissions = async () => {
    try {
      console.log('🔐 Requesting notification permissions...');
      const result = await requestNotificationPermission();
      return isPermissionGranted(result);
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  };

  // Ga naar de volgende pagina
  const nextPage = async () => {
    const filteredPages = false 
      ? pages.filter(page => !page.androidOnly) 
      : pages;
    
    if (currentPage < filteredPages.length - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      scrollViewRef.current?.scrollTo({
        x: newPage * width,
        animated: true
      });
      
      // Auto-request permissions voor de nieuwe pagina als setting enabled is
      const nextPageData = filteredPages[newPage];
      if (nextPageData && nextPageData.setting) {
        setTimeout(() => {
          requestPermissionsForEnabledSettings(nextPageData.id, nextPageData.setting);
        }, 500); // Kleine delay om scroll animatie te voltooien
      }
    } else {
      finishOnboarding();
    }
  };

  // Ga naar de vorige pagina
  const prevPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      scrollViewRef.current?.scrollTo({
        x: newPage * width,
        animated: true
      });
    }
  };

  // Vervolledig de onboarding - ALLEEN settings opslaan, geen nieuwe permissions
  const finishOnboarding = async () => {
    setIsLoading(true);
    
    try {
      console.log('🚀 Starting onboarding completion...');
      console.log('📋 Current settings:', settings);
      
      // Start services alleen als de gebruiker toestemming heeft gegeven tijdens toggles
      // GEEN nieuwe permission requests hier - die zijn al gebeurd bij toggles!
      
      // Start services conservatief - alleen als settings enabled zijn
      try {
        if (settings.trackLocation && locationService && typeof locationService.startTracking === 'function') {
          console.log('📍 Starting location service...');
          try {
            await locationService.startTracking(); // Permissions al gevraagd bij toggle
          } catch (locError) {
            console.warn('⚠️ Location service warning:', locError);
          }
        }
        
        if (settings.trackActivity && activityService && typeof activityService.startMonitoring === 'function') {
          console.log('🚶‍♂️ Starting activity service...');
          try {
            await activityService.startMonitoring(); // Permissions al gevraagd bij toggle
          } catch (actError) {
            console.warn('⚠️ Activity service warning:', actError);
          }
        }
        
        if (settings.trackCalls && callLogService) {
          console.log('📞 Call log service ready...');
          // Call permissions al gevraagd bij toggle, start geen nieuwe request
        }
        
        if (settings.allowNotifications && notificationService && typeof notificationService.initialize === 'function') {
          console.log('🔔 Starting notification service...');
          try {
            await notificationService.initialize(); // Permissions al gevraagd bij toggle
            
            if (settings.dailyNotifications && typeof notificationService.scheduleDaily === 'function') {
              await notificationService.scheduleDaily(
                'Dagelijkse samenvatting',
                'Bekijk je activiteiten van vandaag',
                20, 0 // 20:00 uur
              );
            }
            
            if (settings.weeklyNotifications && typeof notificationService.scheduleWeeklySummary === 'function') {
              await notificationService.scheduleWeeklySummary();
            }
          } catch (notError) {
            console.warn('⚠️ Notification service warning:', notError);
          }
        }
      } catch (serviceError) {
        // Service errors shouldn't block onboarding completion
        console.warn('⚠️ Service initialization warning:', serviceError);
      }
      
      // Sla AI en stijl voorkeuren op
      console.log('💾 Saving AI preferences...');
      console.log('🤖 Selected AI Model:', settings.preferredAIModel);
      console.log('🎨 Selected Narrative Style:', settings.narrativeStyle);
      try {
        await setPreferredAIModel(settings.preferredAIModel);
        await AsyncStorage.setItem('narrativeStyle', settings.narrativeStyle);
        
        // Verificatie dat de keuze is opgeslagen
        const savedModel = await AsyncStorage.getItem('preferredAIModel');
        const savedStyle = await AsyncStorage.getItem('narrativeStyle');
        console.log('✅ Verified saved AI Model:', savedModel);
        console.log('✅ Verified saved Narrative Style:', savedStyle);
        
        if (settings.preferredAIModel === AI_MODEL_TYPES.CHATGPT) {
          console.log('🤖 ChatGPT selected! User will need to add API key in settings.');
        }
      } catch (prefError) {
        console.warn('⚠️ Preference saving warning:', prefError);
      }
      
      // Sla de instellingen op en markeer de onboarding als voltooid
      console.log('✅ Saving settings and completing onboarding...');
      const finalSettings = {
        ...settings,
        isOnboarded: true
      };
      
      console.log('📋 Final settings to save:', {
        preferredAIModel: finalSettings.preferredAIModel,
        narrativeStyle: finalSettings.narrativeStyle,
        trackLocation: finalSettings.trackLocation,
        trackActivity: finalSettings.trackActivity,
        trackCalls: finalSettings.trackCalls,
        allowNotifications: finalSettings.allowNotifications
      });
      
      // Sla settings op via context
      await updateSettings(finalSettings);
      
      // Markeer onboarding als voltooid in AsyncStorage (backup)
      await AsyncStorage.setItem('onboarding_completed', 'true');
      
      console.log('🎉 Onboarding completed successfully!');
      console.log('🔄 Calling onComplete function...', typeof onComplete);
      
      // Small delay to ensure state is saved
      setTimeout(() => {
        if (onComplete && typeof onComplete === 'function') {
          console.log('✅ Executing onComplete...');
          onComplete();
        } else {
          console.error('❌ onComplete is not available:', onComplete);
          // Force navigation via AsyncStorage change
          console.log('🔄 Forcing app reload by updating storage...');
          AsyncStorage.setItem('force_app_reload', 'true').then(() => {
            Alert.alert(
              'Setup Voltooid!',
              'Herstart de app om te beginnen.',
              [{ text: 'OK' }]
            );
          });
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Critical error during onboarding:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        settings: settings,
        onComplete: typeof onComplete
      });
      
      Alert.alert(
        'Setup Probleem',
        `Er ging iets mis: ${error.message}. Wil je het opnieuw proberen?`,
        [
          { 
            text: 'Opnieuw', 
            onPress: () => {
              setIsLoading(false);
              setTimeout(() => finishOnboarding(), 1000);
            }
          },
          { 
            text: 'Overslaan', 
            onPress: async () => {
              // Emergency completion - just save basic state
              try {
                await AsyncStorage.setItem('onboarding_completed', 'true');
                await AsyncStorage.setItem('emergency_completion', 'true');
                Alert.alert('Basis setup opgeslagen. Herstart de app.');
              } catch (emergencyError) {
                console.error('Emergency save failed:', emergencyError);
              }
            },
            style: 'cancel' 
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Render een keuze optie voor choice-type pagina's
  const renderChoice = (page) => {
    const currentValue = settings[page.setting];
    
    // All choices are now available including WebLLM via WebView bridge
    let availableChoices = page.choices;
    
    return (
      <View style={styles.choicesContainer}>
        <ScrollView 
          horizontal 
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChoicesContent}
          style={styles.horizontalChoicesScroll}
        >
          {availableChoices.map((choice, index) => (
            <TouchableOpacity
              key={choice.id}
              style={[
                styles.choiceCard,
                styles.horizontalChoiceCard,
                currentValue === choice.id && styles.choiceCardSelected
              ]}
              onPress={() => {
                // Voor narrative style geen permissies nodig
                if (page.setting === 'narrativeStyle' || page.setting === 'privacySettings.shareAnalytics') {
                  updateSetting(page.setting, choice.id);
                } else {
                  requestPermissionForSetting(page.setting, choice.id);
                }
              }}
            >
              <View style={styles.choiceHeader}>
                <Ionicons 
                  name={choice.icon} 
                  size={28} 
                  color={currentValue === choice.id ? Colors.primary[500] : Colors.gray[400]} 
                />
                {choice.badge && (
                  <View style={styles.choiceBadge}>
                    <Typography variant="caption" color="white">
                      {choice.badge}
                    </Typography>
                  </View>
                )}
              </View>
              <Typography 
                variant="h6" 
                color={currentValue === choice.id ? "primary" : "text.primary"}
                style={styles.choiceTitle}
                numberOfLines={2}
              >
                {choice.title}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                style={styles.choiceDescription}
                numberOfLines={3}
              >
                {choice.description}
              </Typography>
              {currentValue === choice.id && (
                <View style={styles.choiceCheckmark}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary[500]} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Horizontal pagination dots */}
        <View style={styles.choicePagination}>
          {availableChoices.map((choice, index) => (
            <View
              key={`choice-dot-${index}`}
              style={[
                styles.choicePaginationDot,
                settings[page.setting] === choice.id && styles.choicePaginationDotActive
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  // Render een toggle knop voor een instelling
  const renderToggle = (settingKey, reversed = false) => {
    const getValue = () => {
      if (settingKey.includes('.')) {
        const [parent, child] = settingKey.split('.');
        return settings[parent][child];
      }
      return settings[settingKey];
    };
    
    const isEnabled = getValue();
    const finalEnabled = reversed ? !isEnabled : isEnabled;
    
    return (
      <TouchableOpacity
        style={[
          styles.toggleButton,
          finalEnabled ? styles.toggleEnabled : styles.toggleDisabled
        ]}
        onPress={() => requestPermissionForSetting(settingKey, !isEnabled)}
      >
        <View 
          style={[
            styles.toggleCircle,
            finalEnabled ? styles.toggleCircleEnabled : styles.toggleCircleDisabled
          ]}
        />
      </TouchableOpacity>
    );
  };

  // Huidige pagina
  const currentPageData = pages[currentPage];
  
  // Filter Android-specifieke pagina's indien nodig
  const filteredPages = false 
    ? pages.filter(page => !page.androidOnly) 
    : pages;
  
  const isLastPage = currentPage === filteredPages.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - alleen app naam, geen welkomstekst */}
      <View style={styles.header}>
        <Typography variant="h1" color={Colors.primary[500]} style={styles.appTitle}>
          Minakami
        </Typography>
      </View>
      
      {/* Pagination dots */}
      <View style={styles.pagination}>
        {filteredPages.map((_, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.paginationDot,
              index === currentPage && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
      
      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {filteredPages.map((page, index) => (
          <View 
            key={page.id} 
            style={[styles.page, { width }]}
            {...(index === currentPage ? { accessibilityState: { selected: true } } : {})}
          >
            <Card style={styles.pageCard}>
              <View style={styles.iconContainer}>
                <Ionicons name={page.icon} size={72} color={Colors.primary[500]} />
              </View>
              
              <Typography variant="h4" color="text.primary" style={styles.pageTitle}>
                {page.title}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" style={styles.pageDescription}>
                {page.description}
              </Typography>
              
              {page.type === 'choice' ? (
                renderChoice(page)
              ) : page.setting && (
                <View style={styles.settingContainer}>
                  <Typography variant="body2" color="text.secondary">
                    {page.reversed ? 'Uit' : 'Aan'}
                  </Typography>
                  
                  {renderToggle(page.setting, page.reversed)}
                  
                  <Typography variant="body2" color="text.secondary">
                    {page.reversed ? 'Aan' : 'Uit'}
                  </Typography>
                </View>
              )}
            </Card>
          </View>
        ))}
      </ScrollView>
      
      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <View style={styles.navigationButtons}>
          {currentPage > 0 ? (
            <Button
              title="Vorige"
              variant="outline"
              size="medium"
              leftIcon={<Ionicons name="arrow-back" size={20} color={Colors.primary[500]} />}
              onPress={prevPage}
            />
          ) : (
            <View style={{ width: 100 }} />
          )}
          
          {currentPage < filteredPages.length - 1 ? (
            <Button
              title="Volgende"
              variant="primary"
              size="large"
              onPress={nextPage}
            />
          ) : (
            <Button
              title={isLoading ? "Bezig..." : "Aan de slag"}
              variant="primary"
              size="large"
              onPress={nextPage}
              disabled={isLoading}
              loading={isLoading}
            />
          )}
        </View>
        
        {currentPage < filteredPages.length - 1 && (
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={() => {
              const lastPage = filteredPages.length - 1;
              setCurrentPage(lastPage);
              scrollViewRef.current?.scrollTo({
                x: lastPage * width,
                animated: true
              });
            }}
          >
            <Typography variant="body2" color={Colors.primary[500]}>
              Overslaan
            </Typography>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Privacy note */}
      <Card style={styles.privacyCard} variant="outlined">
        <Typography variant="caption" color="text.secondary" align="center">
          Je gegevens blijven lokaal op je telefoon. Je kunt je instellingen altijd wijzigen via het instellingenscherm.
        </Typography>
      </Card>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  appTitle: {
    color: Colors.primary[500],
    marginBottom: Spacing.xs,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray[300],
    marginHorizontal: Spacing.xs,
  },
  paginationDotActive: {
    backgroundColor: Colors.primary[500],
    width: 24,
    height: 8,
  },
  scrollContainer: {
    // Add any scroll container styles
  },
  page: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  pageCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.md,
    padding: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  pageDescription: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  settingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  toggleButton: {
    width: 56,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    padding: 2,
  },
  toggleEnabled: {
    backgroundColor: Colors.primary[500],
  },
  toggleDisabled: {
    backgroundColor: Colors.gray[300],
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  toggleCircleEnabled: {
    alignSelf: 'flex-end',
  },
  toggleCircleDisabled: {
    alignSelf: 'flex-start',
  },
  navigationContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: Spacing.md,
  },
  privacyCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
  },
  
  // Choice-specific styles
  choicesContainer: {
    marginTop: Spacing.lg,
    height: 200, // Fixed height for horizontal scroll
  },
  horizontalChoicesScroll: {
    flexGrow: 0,
  },
  horizontalChoicesContent: {
    paddingHorizontal: Spacing.sm,
  },
  choiceCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    position: 'relative',
    minHeight: 160,
  },
  horizontalChoiceCard: {
    width: width * 0.75, // 75% of screen width for better visibility with 4 options
    marginHorizontal: Spacing.xs,
  },
  choiceCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  choiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  choiceBadge: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  choiceTitle: {
    marginBottom: Spacing.xs,
    textAlign: 'left',
  },
  choiceDescription: {
    lineHeight: 18,
    textAlign: 'left',
    flex: 1,
  },
  choiceCheckmark: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  choicePagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  choicePaginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray[300],
    marginHorizontal: Spacing.xs / 2,
  },
  choicePaginationDotActive: {
    backgroundColor: Colors.primary[500],
    width: 16,
    height: 6,
  },
});
export default OnboardingScreen;