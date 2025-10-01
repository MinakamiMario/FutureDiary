// src/utils/contactsHelper.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import errorHandler from '../services/errorLogger';

// Mock contacts for React Native without Expo
// In a real production app, you would use react-native-contacts or similar

// Cache voor contacten om veelvuldige aanvragen te voorkomen
let contactsCache = {};

// Mock contact data for demo purposes
const mockContacts = {
  31612345678: 'Jan Jansen',
  31687654321: 'Piet Pietersen',
  31611223344: 'Marie van der Berg',
  31655667788: 'Anna de Vries',
  31699887766: 'Klaas van Dijk',
};

// Initialiseer contacten als gegevens nodig zijn
const initializeContacts = async () => {
  try {
    // In bare React Native, we can't use expo-contacts
    // Use mock data for now
    if (typeof console !== 'undefined') {
      if (__DEV__)
        console.info(
          'Using mock contacts - expo-contacts not available in bare React Native',
        );
    }
    contactsCache = mockContacts;
    await AsyncStorage.setItem('contactsCache', JSON.stringify(contactsCache));
    return true;
  } catch (error) {
    await errorHandler.error(
      'Error initializing contacts',
      error,
      'contactsHelper.js',
    );
    return false;
  }
};

// Vernieuw de cache met contacten
const refreshContactsCache = async () => {
  try {
    // Use mock data since expo-contacts is not available
    contactsCache = mockContacts;
    await AsyncStorage.setItem('contactsCache', JSON.stringify(contactsCache));
    if (typeof console !== 'undefined') {
      if (__DEV__) console.info('Mock contacts cache refreshed');
    }
  } catch (error) {
    await errorHandler.error(
      'Error refreshing contacts cache',
      error,
      'contactsHelper.js',
    );
  }
};

// Laad contactencache uit opslag
const loadContactsCache = async () => {
  try {
    const cachedContacts = await AsyncStorage.getItem('contactsCache');
    if (cachedContacts) {
      contactsCache = JSON.parse(cachedContacts);
      return true;
    }
    return false;
  } catch (error) {
    await errorHandler.error(
      'Error loading contacts cache',
      error,
      'contactsHelper.js',
    );
    return false;
  }
};

// Hulpfunctie om telefoonnummers te normaliseren
const normalizePhoneNumber = phoneNumber => {
  if (!phoneNumber) return '';
  return phoneNumber.replace(/\D/g, '');
};

// Haal contactnaam op basis van telefoonnummer
export const getContactName = phoneNumber => {
  if (!phoneNumber) return null;

  // Normaliseer het telefoonnummer
  const normalizedNumber = normalizePhoneNumber(phoneNumber);

  // Controleer cache
  return contactsCache[normalizedNumber] || null;
};

// Initialiseer contacten als het bestand wordt geladen
(async () => {
  // Probeer eerst de cache te laden
  const cacheLoaded = await loadContactsCache();

  // Als cache niet geladen kon worden, initialiseer contacten als dat is toegestaan
  if (!cacheLoaded) {
    await initializeContacts();
  }
})();

export default {
  getContactName,
  refreshContactsCache,
  initializeContacts,
};
