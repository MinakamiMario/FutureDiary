// reset-database-emulator.js - Script om database te resetten op emulator
// Alleen voor development testing!

import databaseService from './src/services/database.js';

export const resetDatabaseForEmulatorTesting = async () => {
  if (!__DEV__) {
    console.error('❌ Database reset alleen toegestaan in development mode');
    return false;
  }

  try {
    console.log('🔄 Starting database reset for emulator...');

    // Initialize database service first
    await databaseService.initialize();

    // Reset the database
    await databaseService.resetDatabaseForEmulator();

    console.log('✅ Database reset completed successfully!');
    console.log('📱 App should now have a fresh database');

    return true;
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    return false;
  }
};

// Voor development console access
if (__DEV__ && typeof global !== 'undefined') {
  global.resetDatabaseForEmulator = resetDatabaseForEmulatorTesting;
  console.log('🧪 Database reset utility available:');
  console.log('   - global.resetDatabaseForEmulator()');
}

export default {
  resetDatabaseForEmulatorTesting,
};
