// src/utils/encryptionService.js
// React Native crypto alternatives
let Crypto = null;
try {
  // Try to use React Native crypto if available
  Crypto = require('react-native-crypto');
} catch (error) {
  if (__DEV__) console.info('[EncryptionService] react-native-crypto not available, using CryptoJS fallback');
}

// React Native secure storage alternatives
let SecureStore = null;
try {
  // Use React Native Keychain for secure storage
  SecureStore = require('react-native-keychain');
} catch (error) {
  if (__DEV__) console.info('[EncryptionService] react-native-keychain not available, using AsyncStorage fallback');
}
// Assume Android mobile app
import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BaseService from '../services/BaseService';
// Mock constants for React Native without Expo
const MockConstants = {
  executionEnvironment: 'standalone',
  manifest: {
    name: 'MinakamiApp',
    version: '1.0.0'
  }
};

const Constants = MockConstants;

// Utility function to detect if running in Expo Go
const isExpoGo = () => {
  // Always return false for bare React Native builds
  return false;
};

class EncryptionService extends BaseService {
  constructor() {
    super('EncryptionService');
    this.encryptionKey = null;
  }

  async onInitialize() {
    // Haal de encryptiesleutel op uit SecureStore of genereer een nieuwe
    const storedKey = await this.getStoredKey();
    
    if (storedKey) {
      this.encryptionKey = storedKey;
    } else {
      // Genereer een nieuwe sleutel
      this.encryptionKey = await this.generateEncryptionKey();
      // Bewaar de sleutel
      await this.storeKey(this.encryptionKey);
    }
    
    // Perform data cleanup and migration
    await this.cleanupCorruptedEncryptedData();
    await this.migrateLegacyData();
  }

  async getStoredKey() {
    if (false) {
      // Web platform ondersteunt SecureStore niet
      const key = localStorage.getItem('minakami_encryption_key');
      return key;
    } else if (SecureStore) {
      // Use React Native Keychain
      try {
        const credentials = await SecureStore.getGenericPassword();
        return credentials ? credentials.password : null;
      } catch (error) {
        if (__DEV__) console.warn('[EncryptionService] Keychain access failed, using AsyncStorage fallback');
        return await this.getStoredKeyAsyncStorage();
      }
    } else {
      // Use AsyncStorage as fallback
      return await this.getStoredKeyAsyncStorage();
    }
  }

  async getStoredKeyAsyncStorage() {
    try {
      const obfuscatedKey = await AsyncStorage.getItem('minakami_encryption_key');
      if (!obfuscatedKey) return null;
      
      // Try to deobfuscate - if it fails, assume it's a legacy unobfuscated key
      const deobfuscatedKey = this.deobfuscateKey(obfuscatedKey);
      if (deobfuscatedKey) {
        return deobfuscatedKey;
      } else {
        // Legacy key - migrate to obfuscated format
        if (__DEV__) console.info('[EncryptionService] Migrating legacy key to obfuscated format');
        await this.storeKeyAsyncStorage(obfuscatedKey);
        return obfuscatedKey;
      }
    } catch (error) {
      console.error('[EncryptionService] AsyncStorage access failed:', error);
      return null;
    }
  }

  async storeKey(key) {
    if (false) {
      // Web platform ondersteunt SecureStore niet
      localStorage.setItem('minakami_encryption_key', key);
    } else if (SecureStore) {
      // Use React Native Keychain
      try {
        await SecureStore.setGenericPassword('minakami', key);
      } catch (error) {
        if (__DEV__) console.warn('[EncryptionService] Keychain storage failed, using AsyncStorage fallback');
        await this.storeKeyAsyncStorage(key);
      }
    } else {
      // Use AsyncStorage as fallback
      await this.storeKeyAsyncStorage(key);
    }
  }

  async storeKeyAsyncStorage(key) {
    try {
      // Add additional obfuscation layer for AsyncStorage
      const obfuscatedKey = this.obfuscateKey(key);
      await AsyncStorage.setItem('minakami_encryption_key', obfuscatedKey);
    } catch (error) {
      console.error('[EncryptionService] AsyncStorage storage failed:', error);
    }
  }

  // Add key obfuscation for AsyncStorage fallback
  obfuscateKey(key) {
    // Simple XOR obfuscation with device-specific salt
    const salt = 'MinakamiApp_v1.0_' + (Date.now() % 1000000);
    let obfuscated = '';
    for (let i = 0; i < key.length; i++) {
      const keyChar = key.charCodeAt(i);
      const saltChar = salt.charCodeAt(i % salt.length);
      obfuscated += String.fromCharCode(keyChar ^ saltChar);
    }
    return this.base64Encode(obfuscated + '|' + salt); // Base64 encode with salt
  }

  deobfuscateKey(obfuscatedKey) {
    try {
      const decoded = this.base64Decode(obfuscatedKey);
      const [obfuscated, salt] = decoded.split('|');
      let key = '';
      for (let i = 0; i < obfuscated.length; i++) {
        const obfuscatedChar = obfuscated.charCodeAt(i);
        const saltChar = salt.charCodeAt(i % salt.length);
        key += String.fromCharCode(obfuscatedChar ^ saltChar);
      }
      return key;
    } catch (error) {
      if (__DEV__) console.error('[EncryptionService] Key deobfuscation failed:', error);
      return null;
    }
  }

  // React Native compatible base64 encoding
  base64Encode(str) {
    try {
      // Use CryptoJS for base64 encoding as it works in React Native
      const wordArray = CryptoJS.enc.Utf8.parse(str);
      return CryptoJS.enc.Base64.stringify(wordArray);
    } catch (error) {
      console.error('[EncryptionService] Base64 encoding failed:', error);
      return null;
    }
  }

  // React Native compatible base64 decoding
  base64Decode(str) {
    try {
      // Use CryptoJS for base64 decoding as it works in React Native
      const wordArray = CryptoJS.enc.Base64.parse(str);
      return CryptoJS.enc.Utf8.stringify(wordArray);
    } catch (error) {
      console.error('[EncryptionService] Base64 decoding failed:', error);
      return null;
    }
  }

  async generateEncryptionKey() {
    // In Expo Go development, always use fallback method
    if (__DEV__ || isExpoGo() || !Crypto) {
      if (__DEV__) console.info('[EncryptionService] Using fallback crypto generation (Expo Go/Development mode)');
      return this.generateFallbackKey();
    }
    
    try {
      // Probeer eerst de native crypto module (alleen in production APK)
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      // Converteer bytes naar een hex string
      return this.bytesToHex(randomBytes);
    } catch (error) {
      if (__DEV__) console.warn('Native crypto module niet beschikbaar, gebruik fallback methode:', error.message);
      
      // Fallback methode met JavaScript crypto
      return this.generateFallbackKey();
    }
  }

  generateFallbackKey() {
    // Genereer een pseudo-willekeurige sleutel met JavaScript + tijd/device info
    const chars = '0123456789abcdef';
    let result = '';
    
    // Voeg extra entropie toe met tijd en random waarden
    let entropy = Date.now().toString(16) + 
                  Math.random().toString(16).slice(2) + 
                  Math.random().toString(16).slice(2);
    
    // Voeg device info toe als beschikbaar
    try {
      if (typeof navigator !== 'undefined' && navigator.userAgent && typeof navigator.userAgent === 'string') {
        entropy += navigator.userAgent.length.toString(16);
      } else if (true) {
        // React Native fallback - gebruik platform info
        entropy += 'android'.length.toString(16);
      } else {
        // Laatste fallback
        entropy += 'rn'.length.toString(16);
      }
    } catch (e) {
      // Fallback voor extra entropie als navigator niet beschikbaar is
      entropy += Math.random().toString(16).slice(2);
    }
    
    // Combineer entropy met random generatie
    const combinedSeed = entropy + Math.random().toString();
    
    // Zorg dat combinedSeed lang genoeg is
    let seed = combinedSeed;
    while (seed.length < 64) {
      seed += Math.random().toString(16).slice(2);
    }
    
    for (let i = 0; i < 64; i++) { // 64 hex chars = 32 bytes
      const charIndex = Math.abs(seed.charCodeAt(i % seed.length) + Math.floor(Math.random() * 1000)) % chars.length;
      result += chars.charAt(charIndex);
    }
    
    if (__DEV__) console.info('[EncryptionService] Generated fallback key with enhanced entropy');
    return result;
  }

  generateFallbackIV(byteLength) {
    // Genereer een pseudo-willekeurige IV zonder CryptoJS.lib.WordArray.random
    const chars = '0123456789abcdef';
    let result = '';
    
    // Extra entropie voor IV generatie met veilige fallback
    let timestamp = Date.now();
    let randomSeed = Math.random() * 1000000;
    
    // Zorg dat byteLength een geldig nummer is
    const safeByteLength = Math.max(1, Math.min(32, byteLength || 16));
    
    for (let i = 0; i < safeByteLength * 2; i++) { // 2 hex chars per byte
      try {
        const entropy = Math.floor((timestamp + randomSeed + i * Math.random()) % chars.length);
        result += chars.charAt(entropy);
      } catch (e) {
        // Ultimate fallback - gebruik simpelere random
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    // Controleer of resultaat correct is
    if (!result || result.length !== safeByteLength * 2) {
      if (__DEV__) console.warn('[EncryptionService] Fallback IV generation issue, using safe fallback');
      // Genereer een veilige fallback
      result = '';
      for (let i = 0; i < safeByteLength * 2; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    // Parse als WordArray voor CryptoJS compatibiliteit
    return CryptoJS.enc.Hex.parse(result);
  }

  bytesToHex(bytes) {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Helper functie om te detecteren of data in het oude formaat is
  isOldFormat(encryptedString) {
    try {
      const parsed = JSON.parse(encryptedString);
      // Oude formaat heeft 'data' en 'hash' properties
      return parsed.hasOwnProperty('data') && parsed.hasOwnProperty('hash') && !parsed.hasOwnProperty('iv');
    } catch {
      return false;
    }
  }

  async encryptData(data) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Converteer data naar JSON string
      const jsonData = JSON.stringify(data);
      
      // In development/Expo Go, gebruik eenvoudige AES-CBC
      if (__DEV__ || isExpoGo()) {
        if (__DEV__) console.info('[EncryptionService] Using simplified AES-CBC encryption (Expo Go/Development mode)');
        const key = CryptoJS.enc.Hex.parse(this.encryptionKey);
        const iv = this.generateFallbackIV(16); // 128-bit IV voor CBC
        
        const encrypted = CryptoJS.AES.encrypt(jsonData, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        
        // Combineer IV en encrypted data
        const encryptedPayload = {
          iv: CryptoJS.enc.Hex.stringify(iv),
          data: encrypted.toString(),
          version: 'v2-cbc' // Markeer als CBC versie
        };
        
        return JSON.stringify(encryptedPayload);
      }
      
      // Gebruik echte AES-256-GCM encryptie voor production
      const key = CryptoJS.enc.Hex.parse(this.encryptionKey);
      const iv = this.generateFallbackIV(12); // 96-bit IV voor GCM
      
      const encrypted = CryptoJS.AES.encrypt(jsonData, key, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      });
      
      // Combineer IV en encrypted data
      const encryptedPayload = {
        iv: CryptoJS.enc.Hex.stringify(iv),
        data: encrypted.toString(),
        version: 'v2' // Markeer als nieuwe versie
      };
      
      return JSON.stringify(encryptedPayload);
    } catch (error) {
      console.error('[EncryptionService] Encryption error:', error);
      console.error('[EncryptionService] Encryption error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return null;
    }
  }

  async decryptData(encryptedString) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Validatie: controleer of encryptedString bestaat en niet leeg is
      if (!encryptedString || typeof encryptedString !== 'string' || encryptedString.trim() === '') {
        if (__DEV__) console.debug('Decryption skipped: empty or invalid encrypted string');
        return null;
      }

      // Check of dit oude formaat data is
      if (this.isOldFormat(encryptedString)) {
        return await this.decryptOldFormat(encryptedString);
      }

      // Try to parse as JSON first
      let encryptedPayload;
      try {
        encryptedPayload = JSON.parse(encryptedString);
      } catch (parseError) {
        if (__DEV__) console.warn('[EncryptionService] Invalid JSON format, treating as corrupted data');
        // Clear corrupted data
        return null;
      }
      
      const { iv, data, version } = encryptedPayload;
      
      // Valideer dat iv en data bestaan
      if (!iv || !data) {
        if (__DEV__) console.debug('Decryption skipped: missing iv or data in encrypted payload');
        return null;
      }
      
      const key = CryptoJS.enc.Hex.parse(this.encryptionKey);
      const ivWordArray = CryptoJS.enc.Hex.parse(iv);
      
      let decrypted;
      let decryptedString = '';
      
      try {
        // Check of dit CBC versie is (development mode)
        if (version === 'v2-cbc') {
          if (__DEV__) console.info('[EncryptionService] Decrypting CBC data (development mode)');
          decrypted = CryptoJS.AES.decrypt(data, key, {
            iv: ivWordArray,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          });
        } else {
          // GCM versie (production)
          decrypted = CryptoJS.AES.decrypt(data, key, {
            iv: ivWordArray,
            mode: CryptoJS.mode.GCM,
            padding: CryptoJS.pad.NoPadding
          });
        }
        
        decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
        
        // Handle UTF-8 decoding errors gracefully
        if (!decryptedString || decryptedString.length === 0) {
          if (__DEV__) console.debug('Decryption resulted in empty string - likely corrupted data');
          return null;
        }
        
        // Try to parse as JSON, handle parsing errors
        try {
          return JSON.parse(decryptedString);
        } catch (jsonError) {
          if (__DEV__) console.warn('[EncryptionService] Decrypted data is not valid JSON, returning as string');
          return decryptedString;
        }
        
      } catch (cryptoError) {
        if (__DEV__) {
          console.warn('[EncryptionService] CryptoJS decryption failed:', cryptoError.message);
          console.warn('[EncryptionService] This likely indicates corrupted or incompatible encrypted data');
          console.warn('[EncryptionService] Stacktrace:', cryptoError.stack);
        }
        
        // Data is corrupted - clean it up
        if (__DEV__) console.warn('[EncryptionService] Treating as corrupted data');
        return null;
      }
      
    } catch (error) {
      console.error('[EncryptionService] Decryption error:', error);
      if (__DEV__) {
        console.error('[EncryptionService] Stacktrace:', error.stack);
        console.error('[EncryptionService] Error details:', {
          message: error.message,
          type: error.constructor.name,
          stack: error.stack
        });
      }
      return null;
    }
  }

  // Backward compatibility voor oude data
  async decryptOldFormat(encryptedString) {
    try {
      // Parse de oude encryptedPayload
      const encryptedPayload = JSON.parse(encryptedString);
      const { data, hash } = encryptedPayload;
      
      // Verifieer de hash (oude methode)
      let computedHash;
      if (__DEV__ || isExpoGo() || !Crypto) {
        if (__DEV__) console.info('[EncryptionService] Using fallback hashing for old format (Expo Go/Development mode)');
        computedHash = this.hashWithFallback(data);
      } else {
        try {
          computedHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            data + this.encryptionKey
          );
        } catch (error) {
          if (__DEV__) console.warn('[EncryptionService] Native hash niet beschikbaar voor oude format, gebruik fallback');
          computedHash = this.hashWithFallback(data);
        }
      }
      
      if (computedHash !== hash) {
        console.error('Data integrity check failed for old format');
        return null;
      }
      
      // Parse en return de data
      return JSON.parse(data);
    } catch (error) {
      console.error('Old format decryption error:', error);
      return null;
    }
  }

  async hashSensitiveData(data) {
    // In Expo Go development, always use fallback method
    if (__DEV__ || isExpoGo() || !Crypto) {
      if (__DEV__) console.info('[EncryptionService] Using fallback hashing (Expo Go/Development mode)');
      return this.hashWithFallback(data);
    }
    
    // Gebruik native crypto voor het hashen van gevoelige data zoals telefoonnummers
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + this.encryptionKey
      );
      return hash;
    } catch (error) {
      if (__DEV__) console.warn('[EncryptionService] Native hash functie niet beschikbaar, gebruik fallback:', error.message);
      
      // Fallback met CryptoJS
      return this.hashWithFallback(data);
    }
  }

  async cleanupCorruptedEncryptedData() {
    if (__DEV__) console.info('[EncryptionService] Cleaning corrupted encrypted data...');
    
    const corruptedKeys = [];
    
    try {
      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const encryptedKeys = allKeys.filter(key => 
        key.startsWith('secure_') || key.includes('encrypted_')
      );
      
      for (const key of encryptedKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            // Test decryption without returning data
            const testResult = await this.testDecryption(value);
            if (!testResult.isValid) {
              corruptedKeys.push(key);
              if (__DEV__) console.warn(`[EncryptionService] Detected corrupted: ${key} - ${testResult.error}`);
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (error) {
          corruptedKeys.push(key);
          if (__DEV__) console.warn(`[EncryptionService] Removing corrupted key: ${key} - ${error.message}`);
          await AsyncStorage.removeItem(key);
        }
      }
      
      if (corruptedKeys.length > 0) {
        console.log(`[EncryptionService] Cleaned ${corruptedKeys.length} corrupted keys:`, corruptedKeys);
      } else {
        console.log('[EncryptionService] No corrupted data found');
      }
      
    } catch (error) {
      console.error('[EncryptionService] Error during cleanup:', error);
    }
  }

  async testDecryption(encryptedString) {
    try {
      if (!encryptedString || typeof encryptedString !== 'string') {
        return { isValid: false, error: 'Invalid string format' };
      }

      // Quick format check
      if (encryptedString.length < 10) {
        return { isValid: false, error: 'Too short to be valid encrypted data' };
      }

      // Try to parse as JSON first
      let payload;
      try {
        payload = JSON.parse(encryptedString);
      } catch {
        return { isValid: false, error: 'Invalid JSON format' };
      }

      // Check required fields
      if (!payload.iv || !payload.data) {
        return { isValid: false, error: 'Missing required fields (iv/data)' };
      }

      // Try to decrypt (without returning data)
      const key = CryptoJS.enc.Hex.parse(this.encryptionKey);
      const iv = CryptoJS.enc.Hex.parse(payload.iv);
      
      const decrypted = CryptoJS.AES.decrypt(payload.data, key, {
        iv: iv,
        mode: payload.version === 'v2-cbc' ? CryptoJS.mode.CBC : CryptoJS.mode.GCM,
        padding: payload.version === 'v2-cbc' ? CryptoJS.pad.Pkcs7 : CryptoJS.pad.NoPadding
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString || decryptedString.length === 0) {
        return { isValid: false, error: 'Decryption failed - likely wrong key or corrupted data' };
      }

      return { isValid: true };
      
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  async migrateLegacyData() {
    if (__DEV__) console.info('[EncryptionService] Checking for legacy data to migrate...');
    
    const legacyKeys = [
      'claude_api_key',
      'openai_api_key',
      'claude_api_key_legacy',
      'openai_api_key_legacy'
    ];
    
    for (const legacyKey of legacyKeys) {
      try {
        const legacyValue = await AsyncStorage.getItem(legacyKey);
        if (legacyValue) {
          if (__DEV__) console.log(`[EncryptionService] Found legacy data: ${legacyKey}`);
          
          // Migrate to new secure format
          const secureKey = legacyKey.replace('_legacy', '').replace('_api_key', '_api_key');
          const success = await this.setSecureApiKey(`secure_${secureKey}`, legacyValue);
          
          if (success) {
            await AsyncStorage.removeItem(legacyKey);
            if (__DEV__) console.log(`[EncryptionService] Migrated: ${legacyKey} → secure_${secureKey}`);
          }
        }
      } catch (error) {
        console.warn(`[EncryptionService] Error migrating ${legacyKey}:`, error.message);
      }
    }
  }

  hashWithFallback(data) {
    try {
      const hash = CryptoJS.SHA256(data + this.encryptionKey);
      return hash.toString(CryptoJS.enc.Hex);
    } catch (error) {
      console.error('Fallback hashing error:', error);
      return null;
    }
  }


  async encryptPhoneNumber(phoneNumber) {
    // Specifieke functie voor het encrypten van telefoonnummers
    if (!phoneNumber) {
      return null;
    }
    
    // Bewaar de laatste 4 cijfers in plain text
    const lastFourDigits = phoneNumber.slice(-4);
    const restOfNumber = phoneNumber.slice(0, -4);
    
    // Hash alleen het eerste deel van het nummer
    const hashedPart = await this.hashSensitiveData(restOfNumber);
    if (!hashedPart) {
      return null;
    }
    
    // Gebruik de eerste 8 karakters van de hash + de laatste 4 cijfers
    return hashedPart.substring(0, 8) + lastFourDigits;
  }
}

// Singleton instance
const encryptionService = new EncryptionService();
export default encryptionService;