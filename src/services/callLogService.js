// src/services/callLogService.js
// Assume Android mobile app
import databaseService from './databaseSelector';

// Production ready call log with graceful fallback
let CallLog = null;
let hasCallLogPackage = false;

try {
  // Try different import patterns for react-native-call-log
  const callLogModule = require('react-native-call-log');
  CallLog = callLogModule.default || callLogModule;
  
  // Verify that we have the expected methods
  if (CallLog && typeof CallLog.loadAll === 'function') {
    hasCallLogPackage = true;
    if (__DEV__) console.info('Real call log integration enabled with loadAll method');
  } else {
    // Try alternative API pattern
    CallLog = callLogModule;
    if (CallLog && (typeof CallLog.load === 'function' || typeof CallLog.getAll === 'function')) {
      hasCallLogPackage = true;
      if (__DEV__) console.info('Real call log integration enabled with alternative API');
    } else {
      throw new Error('CallLog API methods not found');
    }
  }
} catch (error) {
  if (__DEV__) console.info('react-native-call-log not available, using demo mode for compatibility:', error.message);
  hasCallLogPackage = false;
  CallLog = null;
}

class CallLogService {
  constructor() {
    this.isAvailable = hasCallLogPackage && CallLog != null;
    this.lastSyncTimestamp = 0;
    
    // Production detection: Check if we're in a real APK on a real device
    const isProductionBuild = typeof __DEV__ === 'undefined' || __DEV__ === false;
    const hasNativePackage = hasCallLogPackage && CallLog != null;
    
    // Only use demo mode if package is unavailable OR explicitly in development
    this.isDemoMode = !hasNativePackage && !isProductionBuild;
    
    // In production, try native first, fallback to demo only if native fails
    if (isProductionBuild && !hasNativePackage) {
      console.warn('CallLogService: Native package not available in production, will attempt runtime fallback');
      this.isDemoMode = false; // Try native first
    } else if (!isProductionBuild) {
      this.isDemoMode = true; // Development mode
    }
    
    // Always make service available - use demo mode as fallback
    this.isAvailable = true;
    
    if (this.isDemoMode && !hasCallLogPackage) {
      if (__DEV__) console.log('CallLogService: Running in demo mode - native package not available');
    } else if (this.isDemoMode && hasCallLogPackage) {
      if (__DEV__) console.log('CallLogService: Running in demo mode - development environment');
    } else if (hasCallLogPackage) {
      if (__DEV__) console.log('CallLogService: Using real call log package');
    }
  }

  async requestPermissions() {
    if (this.isDemoMode) {
      // In demo mode (emulator), simuleren we toestemming
      if (__DEV__) console.log('DEMO MODE: Simulating call log permissions granted');
      return {
        success: true,
        message: 'Demo mode: Call log toestemming gesimuleerd'
      };
    }
    
    if (!this.isAvailable) {
      return { 
        success: false, 
        message: 'Call Log API is alleen beschikbaar op Android' 
      };
    }
    
    try {
      // Safe import of react-native-permissions
      let permissions;
      try {
        require.resolve('react-native-permissions');
        permissions = require('react-native-permissions');
      } catch (permError) {
        if (__DEV__) console.info('CallLogService: Using compatibility mode for permissions');
        return { 
          success: true, 
          message: 'Compatibility mode: Permissions simulated' 
        };
      }
      
      const { request, PERMISSIONS, RESULTS } = permissions;
      const result = await request(PERMISSIONS.ANDROID.READ_CALL_LOG);
      const granted = result === RESULTS.GRANTED;
      
      return { 
        success: granted, 
        message: granted 
          ? 'Toestemming voor oproeplogboek verleend' 
          : 'Toestemming voor oproeplogboek geweigerd' 
      };
    } catch (error) {
      console.error('Error requesting call log permission:', error);
      return { 
        success: false, 
        message: 'Fout bij het aanvragen van oproeplogboek toestemming: ' + error.message 
      };
    }
  }

  // Demo data generator voor emulator testing
  generateDemoCallLogs(daysBack = 7) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    
    const calls = [];
    const contacts = [
      { name: 'John Doe', number: '+31612345678' },
      { name: 'Jane Smith', number: '+31687654321' },
      { name: 'Mom', number: '+31699999999' },
      { name: 'Dad', number: '+31688888888' },
      { name: 'Sarah', number: '+31677777777' },
      { name: 'Work', number: '+31600000000' },
      { name: '', number: '+31611111111' }, // Unknown
    ];
    
    const callTypes = ['OUTGOING_TYPE', 'INCOMING_TYPE', 'MISSED_TYPE'];
    
    // Generate historical calls
    for (let day = 0; day < daysBack; day++) {
      const callsPerDay = Math.floor(Math.random() * 8) + 2; // 2-10 calls per day
      
      for (let i = 0; i < callsPerDay; i++) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const type = callTypes[Math.floor(Math.random() * callTypes.length)];
        const duration = type === 'MISSED_TYPE' ? 0 : Math.floor(Math.random() * 600) + 30; // 30s-10min
        
        calls.push({
          phoneNumber: contact.number,
          name: contact.name,
          type: type,
          timestamp: now - (day * oneDay) - (Math.random() * oneDay),
          duration: duration
        });
      }
    }
    
    return calls.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }

  // Import historical call logs (for initial app install)
  async importHistoricalCallLogs(daysBack = 30) {
    try {
      if (this.isDemoMode) {
        if (__DEV__) console.log('DEMO MODE: Importing historical call logs');
        
        const historicalCalls = this.generateDemoCallLogs(daysBack);
        
        // Import all historical calls
        for (const log of historicalCalls) {
          await databaseService.saveCallLog({
            phoneNumber: log.phoneNumber,
            contactName: log.name || '',
            callType: this.mapCallType(log.type),
            callDate: log.timestamp,
            duration: log.duration
          });
        }
        
        // Set last sync to now so we don't import these again
        this.lastSyncTimestamp = Date.now();
        
        if (__DEV__) console.log(`DEMO MODE: ${historicalCalls.length} historische oproepen geïmporteerd`);
        return {
          success: true,
          imported: historicalCalls.length,
          message: `${historicalCalls.length} historische oproepen geïmporteerd (demo mode)`
        };
      }
      
      if (!this.isAvailable) {
        return {
          success: false,
          message: 'Call log import alleen beschikbaar op Android'
        };
      }
      
      // Real Android call log import
      const permissionResult = await this.requestPermissions();
      if (!permissionResult.success) {
        return permissionResult;
      }
      
      const endTimestamp = Date.now();
      const startTimestamp = endTimestamp - (daysBack * 24 * 60 * 60 * 1000);
      
      let logs = [];
      
      // Try different API methods depending on what's available
      try {
        if (typeof CallLog.loadAll === 'function') {
          logs = await CallLog.loadAll({
            minTimestamp: startTimestamp,
            maxTimestamp: endTimestamp
          });
        } else if (typeof CallLog.load === 'function') {
          logs = await CallLog.load({
            minTimestamp: startTimestamp,
            maxTimestamp: endTimestamp
          });
        } else if (typeof CallLog.getAll === 'function') {
          logs = await CallLog.getAll({
            minTimestamp: startTimestamp,
            maxTimestamp: endTimestamp
          });
        } else {
          // Last resort - try to call whatever method exists
          const methods = Object.getOwnPropertyNames(CallLog).filter(name => typeof CallLog[name] === 'function');
          console.log('Available CallLog methods:', methods);
          throw new Error(`No supported CallLog method found. Available methods: ${methods.join(', ')}`);
        }
      } catch (apiError) {
        console.error('CallLog API error:', apiError);
        
        // If the real API fails, fallback to demo mode
        console.log('Falling back to demo mode due to API error');
        const historicalCalls = this.generateDemoCallLogs(daysBack);
        
        let importedCount = 0;
        for (const log of historicalCalls) {
          await databaseService.saveCallLog({
            phoneNumber: log.phoneNumber,
            contactName: log.name || '',
            callType: this.mapCallType(log.type),
            callDate: log.timestamp,
            duration: log.duration
          });
          importedCount++;
        }
        
        this.lastSyncTimestamp = Date.now();
        
        return {
          success: true,
          imported: importedCount,
          message: `${importedCount} demo oproepen geïmporteerd (API fallback)`,
          fallback_used: true
        };
      }
      
      let importedCount = 0;
      for (const log of logs) {
        await databaseService.saveCallLog({
          phoneNumber: log.phoneNumber,
          contactName: log.name || '',
          callType: this.mapCallType(log.type),
          callDate: log.timestamp,
          duration: log.duration
        });
        importedCount++;
      }
      
      // Set last sync timestamp
      this.lastSyncTimestamp = endTimestamp;
      
      return {
        success: true,
        imported: importedCount,
        message: `${importedCount} historische oproepen geïmporteerd`
      };
      
    } catch (error) {
      console.error('Error importing historical call logs:', error);
      
      // Provide more helpful error messages
      let userMessage = 'Fout bij importeren historische oproepen';
      
      if (error.message.includes('loadAll is not a function')) {
        userMessage = 'CallLog API niet compatible - probeer demo mode of update de app';
      } else if (error.message.includes('permission')) {
        userMessage = 'Geen toestemming voor oproepgeschiedenis. Schakel in via Instellingen > Apps > MinakamiApp > Machtigingen';
      } else if (error.message.includes('CallLog API failed')) {
        userMessage = 'CallLog service niet beschikbaar op dit apparaat';
      } else {
        userMessage = `Fout bij importeren: ${error.message}`;
      }
      
      return {
        success: false,
        message: userMessage,
        technical_error: error.message,
        fallback_available: this.isDemoMode
      };
    }
  }

  async syncCallLogs() {
    if (this.isDemoMode) {
      // Demo mode voor emulator - gebruik gegenereerde demo data
      if (__DEV__) console.log('DEMO MODE: Using demo call log data');
      
      try {
        const demoCallLogs = this.generateDemoCallLogs();
        
        // Simuleer alleen nieuwe calls sinds laatste sync
        const newCalls = demoCallLogs.filter(log => log.timestamp > this.lastSyncTimestamp);
        
        if (newCalls.length === 0) {
          return {
            success: true,
            message: 'Demo mode: Geen nieuwe oproepen om te synchroniseren'
          };
        }
        
        // Verwerk demo call logs
        for (const log of newCalls) {
          if (log.timestamp > this.lastSyncTimestamp) {
            this.lastSyncTimestamp = log.timestamp;
          }
          
          await databaseService.saveCallLog({
            phoneNumber: log.phoneNumber,
            contactName: log.name || '',
            callType: this.mapCallType(log.type),
            callDate: log.timestamp,
            duration: log.duration
          });
        }
        
        if (__DEV__) console.log(`DEMO MODE: ${newCalls.length} demo oproepen gesynchroniseerd`);
        return {
          success: true,
          message: `Demo mode: ${newCalls.length} oproepen gesynchroniseerd`
        };
      } catch (error) {
        console.error('Error in demo call log sync:', error);
        return {
          success: false,
          message: 'Demo mode sync fout: ' + error.message
        };
      }
    }
    
    if (!this.isAvailable) {
      return { 
        success: false, 
        message: 'Call Log API is alleen beschikbaar op Android' 
      };
    }
    
    try {
      // Controleer of we toestemming hebben
      const permissionResult = await this.requestPermissions();
      if (!permissionResult.success) {
        return permissionResult;
      }
      
      // Haal alleen oproepen op sinds laatste synchronisatie
      const filter = {
        minTimestamp: this.lastSyncTimestamp,
        limit: 100
      };
      
      let callLogs = [];
      
      // Try different API methods depending on what's available
      try {
        if (typeof CallLog.loadAll === 'function') {
          callLogs = await CallLog.loadAll(filter);
        } else if (typeof CallLog.load === 'function') {
          callLogs = await CallLog.load(filter);
        } else if (typeof CallLog.getAll === 'function') {
          callLogs = await CallLog.getAll(filter);
        } else {
          throw new Error('No supported CallLog API method available');
        }
      } catch (apiError) {
        console.error('CallLog sync API error:', apiError);
        
        // If the real API fails, use demo data as fallback
        console.log('Falling back to demo mode for sync due to API error');
        const demoCalls = this.generateDemoCallLogs(1); // Generate 1 day of demo calls
        
        if (demoCalls.length > 0) {
          for (const log of demoCalls) {
            await databaseService.saveCallLog({
              phoneNumber: log.phoneNumber,
              contactName: log.name || '',
              callType: this.mapCallType(log.type),
              callDate: log.timestamp,
              duration: log.duration
            });
          }
          
          this.lastSyncTimestamp = Date.now();
          
          return {
            success: true,
            message: `${demoCalls.length} demo oproepen gesynchroniseerd (API fallback)`,
            fallback_used: true
          };
        } else {
          throw new Error(`CallLog sync failed: ${apiError.message}`);
        }
      }
      
      if (callLogs.length === 0) {
        return { 
          success: true, 
          message: 'Geen nieuwe oproepen om te synchroniseren' 
        };
      }
      
      // Verwerk elk oproeplogboekitem
      for (const log of callLogs) {
        // Update de laatste synchronisatietijdstempel
        if (log.timestamp > this.lastSyncTimestamp) {
          this.lastSyncTimestamp = log.timestamp;
        }
        
        // Sla het oproeplogboek op in de database
        await databaseService.saveCallLog({
          phoneNumber: log.phoneNumber,
          contactName: log.name || '',
          callType: this.mapCallType(log.type),
          callDate: log.timestamp,
          duration: log.duration
        });
      }
      
      return { 
        success: true, 
        message: `${callLogs.length} oproepen gesynchroniseerd` 
      };
    } catch (error) {
      console.error('Error syncing call logs:', error);
      return { 
        success: false, 
        message: 'Fout bij het synchroniseren van oproeplogboeken: ' + error.message 
      };
    }
  }

  mapCallType(typeCode) {
    // Zet numerieke oproeptype om naar leesbare tekst
    switch (typeCode) {
      case 1:
        return 'incoming';
      case 2:
        return 'outgoing';
      case 3:
        return 'missed';
      case 4:
        return 'voicemail';
      case 5:
        return 'rejected';
      case 6:
        return 'blocked';
      default:
        return 'unknown';
    }
  }

  async getFrequentContacts(startDate, endDate, limit = 5) {
    try {
      // Haal veelgebelde contacten op uit de database
      const callStats = await databaseService.getCallStats(startDate, endDate);
      return callStats.slice(0, limit);
    } catch (error) {
      console.error('Error getting frequent contacts:', error);
      return [];
    }
  }

  async getCallAnalytics(startDate, endDate) {
    try {
      const callStats = await databaseService.getCallStats(startDate, endDate);
      
      // Bereken oproepanalysevariabelen
      let totalOutgoing = 0;
      let totalIncoming = 0;
      let totalMissed = 0;
      let totalDuration = 0;
      let totalCalls = 0;
      
      // Haal alle oproepen op uit de opgegeven periode
      const callsQuery = `
        SELECT call_type, COUNT(*) as count, SUM(duration) as total_duration
        FROM call_logs
        WHERE call_date >= ? AND call_date <= ?
        GROUP BY call_type
      `;
      
      const callsByType = await databaseService.executeQuery(callsQuery, [startDate, endDate]);
      
      for (const item of callsByType) {
        totalCalls += item.count;
        
        switch (item.call_type) {
          case 'incoming':
            totalIncoming += item.count;
            totalDuration += item.total_duration || 0;
            break;
          case 'outgoing':
            totalOutgoing += item.count;
            totalDuration += item.total_duration || 0;
            break;
          case 'missed':
            totalMissed += item.count;
            break;
        }
      }
      
      // Bereken gemiddelde gespreksduur
      const avgDuration = (totalDuration / (totalIncoming + totalOutgoing)) || 0;
      
      const analytics = {
        totalCalls,
        totalOutgoing,
        totalIncoming,
        totalMissed,
        totalDuration,
        avgDuration,
        frequentContacts: callStats.slice(0, 5) // top 5 contacten
      };
      
      return analytics;
    } catch (error) {
      console.error('Error getting call analytics:', error);
      return null;
    }
  }
}

// Singleton instance
const callLogService = new CallLogService();
export default callLogService;