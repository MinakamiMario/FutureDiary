// src/utils/settingsStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import encryptionService from './encryptionService';
import errorHandler from '../services/errorLogger';

const SETTINGS_KEY = '@minakami_settings';

// Opslaan van app-instellingen
export const saveSettings = async (settings) => {
  try {
    // Validatie: controleer of settings bestaat en niet null is
    if (!settings || typeof settings !== 'object') {
      if (__DEV__) console.warn('Settings is null, undefined, or not an object. Using default settings.');
      settings = getDefaultSettings();
    }

    // Bepaal of we de instellingen moeten versleutelen
    if (settings.privacySettings && settings.privacySettings.storeEncrypted) {
      // Zorg ervoor dat encryptionService geïnitialiseerd is
      if (!encryptionService.isInitialized) {
        await encryptionService.initialize();
      }
      
      // Encrypt de gevoelige gegevens
      const encryptedSettings = await encryptionService.encryptData(settings);
      
      // Controleer of encryptie succesvol was
      if (encryptedSettings && encryptedSettings !== null) {
        await AsyncStorage.setItem(SETTINGS_KEY, encryptedSettings);
      } else {
        // In development/Expo Go, sla direct op als JSON (geen waarschuwing)
        if (__DEV__) {
          if (__DEV__) console.info('[SettingsStorage] Saving settings as plain JSON in development mode');
        } else {
          if (__DEV__) console.warn('[SettingsStorage] Encryption failed, saving as plain JSON');
        }
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
    } else {
      // Sla op als JSON
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    
    return true;
  } catch (error) {
    errorHandler.error('Fout bij opslaan instellingen', error, 'settingsStorage');
    return false;
  }
};

// Laden van app-instellingen
export const loadSettings = async () => {
  try {
    const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
    
    if (!storedSettings) {
      return getDefaultSettings();
    }
    
    try {
      // Probeer eerst te lezen als geëncrypteerde data
      const decryptedSettings = await encryptionService.decryptData(storedSettings);
      return decryptedSettings || JSON.parse(storedSettings);
    } catch (decryptError) {
      // Als decryptie mislukt, probeer te parsen als gewone JSON
      return JSON.parse(storedSettings);
    }
  } catch (error) {
    errorHandler.error('Fout bij laden instellingen', error, 'settingsStorage');
    return getDefaultSettings();
  }
};

// Reset instellingen naar standaardwaarden
export const resetSettings = async () => {
  try {
    const defaultSettings = getDefaultSettings();
    await saveSettings(defaultSettings);
    return defaultSettings;
  } catch (error) {
    errorHandler.error('Fout bij resetten instellingen', error, 'settingsStorage');
    return null;
  }
};

// Standaard instellingen
const getDefaultSettings = () => {
  return {
    trackLocation: true,
    trackActivity: true,
    trackCalls: true, // Enable voor demo mode
    allowNotifications: true,
    dailyNotifications: true,
    weeklyNotifications: true,
    darkMode: false,
    isOnboarded: false,
    privacySettings: {
      shareAnalytics: false,
      storeEncrypted: true,
      encryptCallData: true,
      retentionPeriod: 90 // dagen
    },
    activityGoals: {
      steps: 10000,
      activeMinutes: 30
    }
  };
};

// Opslaan van een individuele instelling
export const updateSetting = async (key, value) => {
  try {
    const currentSettings = await loadSettings();
    currentSettings[key] = value;
    return await saveSettings(currentSettings);
  } catch (error) {
    errorHandler.error(`Fout bij updaten instelling: ${key}`, error, 'settingsStorage');
    return false;
  }
};

// Opslaan van een geneste instelling
export const updateNestedSetting = async (parentKey, key, value) => {
  try {
    const currentSettings = await loadSettings();
    
    if (!currentSettings[parentKey]) {
      currentSettings[parentKey] = {};
    }
    
    currentSettings[parentKey][key] = value;
    return await saveSettings(currentSettings);
  } catch (error) {
    errorHandler.error(`Fout bij updaten geneste instelling: ${parentKey}.${key}`, error, 'settingsStorage');
    return false;
  }
};

// Verwijderen van alle instellingen (voor logout of app reset)
export const clearAllSettings = async () => {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
    return true;
  } catch (error) {
    errorHandler.error('Fout bij verwijderen alle instellingen', error, 'settingsStorage');
    return false;
  }
};