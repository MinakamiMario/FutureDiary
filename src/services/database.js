/**
 * LEGACY DATABASE SERVICE - DEPRECATED
 * 
 * This file has been refactored to use the new repository pattern.
 * The new structure is located in /src/database/
 * 
 * This file now acts as a simple proxy to maintain backwards compatibility.
 * For new code, import directly from '../database'
 * 
 * ✅ BEFORE: 3,213 lines, 102KB monolith
 * ✅ AFTER: 12 lines, clean proxy to repositories
 */

import databaseService from '../database';

// Export the new database service as the default
export default databaseService;