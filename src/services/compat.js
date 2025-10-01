// src/services/compat.js
// Backward compatibility patch for existing code

import databaseService from './database';
import encryptionService from '../utils/encryptionService';
import errorHandler from './errorLogger';

// Ensure all services are initialized with the new BaseService pattern
export const initializeServices = async () => {
  const results = await Promise.allSettled([
    databaseService.initialize(),
    encryptionService.initialize(),
    errorHandler.initialize()
  ]);

  const successes = results.filter(r => r.status === 'fulfilled').length;
  const failures = results.filter(r => r.status === 'rejected').length;

  if (__DEV__) console.log(`Services initialized: ${successes} successful, ${failures} failed`);
  
  return {
    database: results[0],
    encryption: results[1],
    errorHandler: results[2]
  };
};

// Auto-initialize on import
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  setTimeout(() => {
    initializeServices().catch(console.error);
  }, 100);
}

export { databaseService, encryptionService, errorHandler };