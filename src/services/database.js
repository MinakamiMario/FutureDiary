import SQLite from 'react-native-sqlite-2';
import {formatDateToYYYYMMDD} from '../utils/formatters';
import performanceService from './performanceService';
import BaseService from './BaseService';
// Import samsungHealthService lazily to avoid circular dependency

class DatabaseService extends BaseService {
  constructor() {
    super('DatabaseService');
  }

  async requestStoragePermissions() {
    // iOS doesn't need specific permissions for SQLite
    return true;
  }

  // Helper methods to convert react-native-sqlite-2 API
  async execAsync(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          () => resolve(),
          (tx, error) => reject(error),
        );
      });
    });
  }

  async getAll(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (tx, result) => {
            const rows = [];
            for (let i = 0; i < result.rows.length; i++) {
              rows.push(result.rows.item(i));
            }
            resolve(rows);
          },
          (tx, error) => reject(error),
        );
      });
    });
  }

  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (tx, result) => {
            resolve({
              insertId: result.insertId,
              rowsAffected: result.rowsAffected,
            });
          },
          (tx, error) => reject(error),
        );
      });
    });
  }

  async getFirst(query, params = []) {
    const rows = await this.getAll(query, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async onInitialize() {
    // Open the database
    this.db = SQLite.openDatabase(
      'minakami.db',
      '1.0',
      'Minakami Database',
      200000,
    );

    // Create tables using react-native-sqlite-2 transaction API
    await new Promise((resolve, reject) => {
      this.db.transaction(
        tx => {
          // Create all tables in sequence
          tx.executeSql(`CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          duration INTEGER,
          details TEXT,
          source TEXT DEFAULT 'manual',
          metadata TEXT,
          calories INTEGER DEFAULT 0,
          distance REAL DEFAULT 0,
          sport_type TEXT,
          strava_id TEXT,
          heart_rate_avg INTEGER,
          heart_rate_max INTEGER,
          elevation_gain REAL DEFAULT 0
        )`);

          tx.executeSql(`CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          timestamp INTEGER NOT NULL,
          accuracy REAL,
          name TEXT,
          visit_count INTEGER DEFAULT 1,
          last_visited INTEGER
        )`);

          tx.executeSql(`CREATE TABLE IF NOT EXISTS call_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT NOT NULL,
          contact_name TEXT,
          call_type TEXT NOT NULL,
          call_date INTEGER NOT NULL,
          duration INTEGER,
          is_analyzed BOOLEAN DEFAULT 0
        )`);

          tx.executeSql(`CREATE TABLE IF NOT EXISTS daily_summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          morning_activity TEXT,
          afternoon_activity TEXT,
          evening_activity TEXT,
          night_activity TEXT,
          total_steps INTEGER DEFAULT 0,
          total_active_time INTEGER DEFAULT 0,
          most_visited_location INTEGER,
          most_called_contact TEXT,
          summary_data TEXT,
          FOREIGN KEY (most_visited_location) REFERENCES locations (id)
        )`);

          tx.executeSql(`CREATE TABLE IF NOT EXISTS narrative_summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          summary TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

          tx.executeSql(`CREATE TABLE IF NOT EXISTS user_daily_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          note_text TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

          tx.executeSql(`CREATE TABLE IF NOT EXISTS app_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          app_name TEXT NOT NULL,
          package_name TEXT,
          category TEXT,
          duration INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          session_date TEXT NOT NULL,
          source TEXT DEFAULT 'manual'
        )`);
        },
        reject,
        resolve,
      );
    });

    // Run database migrations to add missing columns for existing users
    try {
      await this.runMigrations();
    } catch (migrationError) {
      await this.error('Migration failed, but database is functional', migrationError);
      // Continue - database is still usable with base schema
    }

    // Create performance indexes
    try {
      await this.createPerformanceIndexes();
    } catch (indexError) {
      await this.warn('Performance indexes creation failed', indexError);
      // Non-critical - database works without indexes, just slower
    }

    await this.log(
      'Database initialized successfully',
    );
  }

  // Create database indexes for better query performance
  async createPerformanceIndexes() {
    await new Promise((resolve, reject) => {
      this.db.transaction(
        tx => {
          // Indexes for activities table
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities(start_time)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_type_time ON activities(type, start_time)',
          );
          // Additional Strava-specific indexes
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_strava_id ON activities(strava_id)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_source ON activities(source)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_sport_type ON activities(sport_type)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_sport_type ON activities(sport_type)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_strava_id ON activities(strava_id)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_source ON activities(source)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_calories ON activities(calories)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_activities_distance ON activities(distance)',
          );

          // Indexes for locations table
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations(timestamp)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_locations_visit_count ON locations(visit_count)',
          );

          // Indexes for call_logs table
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_call_logs_date ON call_logs(call_date)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON call_logs(phone_number)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_call_logs_phone_date ON call_logs(phone_number, call_date)',
          );

          // Indexes for app_usage table
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_app_usage_date ON app_usage(session_date)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_app_usage_app ON app_usage(app_name)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_app_usage_timestamp ON app_usage(timestamp)',
          );
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_app_usage_app_date ON app_usage(app_name, session_date)',
          );

          // Indexes for daily_summaries table
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date)',
          );

          // Indexes for narrative_summaries table
          tx.executeSql(
            'CREATE INDEX IF NOT EXISTS idx_narrative_summaries_date ON narrative_summaries(date)',
          );
        },
        reject,
        resolve,
      );
    });

    await this.log('Performance indexes created successfully');
  }

  // Database migrations for existing users
  async runMigrations() {
    try {
      // Check current database schema version
      let currentVersion = await this.getDatabaseVersion();
      await this.log(`Current database version: ${currentVersion}`);

      // Force complete database reset for development emulator (NEVER in production)
      if (__DEV__ && currentVersion === 0) {
        await this.log(
          'Development mode: Fresh database detected, ensuring all tables exist',
        );
        try {
          // Create missing tables that might be needed
          await new Promise((resolve, reject) => {
            this.db.transaction(
              tx => {
                // Create health_data table if missing (needed for health service)
                tx.executeSql(`CREATE TABLE IF NOT EXISTS health_data (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  type TEXT NOT NULL,
                  value REAL NOT NULL,
                  unit TEXT,
                  timestamp INTEGER NOT NULL,
                  source TEXT DEFAULT 'manual',
                  metadata TEXT
                )`);
              },
              reject,
              resolve,
            );
          });
          await this.log('Ensured all required tables exist');
        } catch (createError) {
          await this.warn('Could not create required tables', createError);
        }
      }

      // Migration 1: Add missing columns to activities table (source, metadata, calories, distance, sports-related)
      if (currentVersion < 1) {
        await this.log('Running migration 1: Adding sports-related columns');
        await this.migrateTo1();
        await this.log('Migration 1 completed successfully');
      }

      // Migration 2: Add health_data table and app_usage table
      if (currentVersion < 2) {
        await this.migrateTo2();
      }

      // Migration 3: Add health_highlight column to daily_summaries
      if (currentVersion < 3) {
        await this.migrateTo3();
      }

      // Migration 4: Add advanced data fusion tables
      if (currentVersion < 4) {
        await this.migrateTo4();
      }

      // Migration 5: Add Strava integration tables
      if (currentVersion < 5) {
        await this.migrateTo5();
      }

      // Set database version after all migrations
      await this.setDatabaseVersion(5);
      await this.log('Database migrations completed successfully');

      // Debug database structure in development
      await this.debugDatabaseStructure();
      
      // Optimize database performance
      await this.optimizeDatabase();
      
    } catch (error) {
      await this.error('Database migration failed', error);
      throw error;
    }
  }
  
  // Test database connection
  async testConnection() {
    try {
      await this.getAll('SELECT 1 as test');
      await this.log('Database connection test successful');
    } catch (error) {
      await this.error('Database connection test failed', error);
      throw new Error('Database connection is not working');
    }
  }
  
  // Optimize database performance
  async optimizeDatabase() {
    try {
      // Analyze database for optimization opportunities
      await this.execAsync('ANALYZE');
      
      // Update table statistics
      await this.execAsync('PRAGMA optimize');
      
      await this.log('Database optimization completed');
    } catch (error) {
      // Optimization failure is not critical
      await this.warn('Database optimization failed', error);
    }
  }

  // Get current database schema version
  async getDatabaseVersion() {
    try {
      // Check if version table exists
      const tables = await this.getAll(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='database_version'
      `);

      if (tables.length === 0) {
        // Create version table if it doesn't exist using proper transaction
        await new Promise((resolve, reject) => {
          this.db.transaction(
            tx => {
              tx.executeSql(`CREATE TABLE database_version (
                version INTEGER PRIMARY KEY
              )`);
              tx.executeSql(`INSERT INTO database_version (version) VALUES (0)`);
            },
            reject,
            resolve,
          );
        });
        return 0;
      }

      // Get current version
      const result = await this.getAll(
        'SELECT version FROM database_version LIMIT 1',
      );
      return result.length > 0 ? result[0].version : 0;
    } catch (error) {
      await this.error('Error getting database version', error);
      return 0;
    }
  }

  // Set database schema version
  async setDatabaseVersion(version) {
    try {
      // Ensure version table exists first
      await this.getDatabaseVersion();
      
      // Update version using proper transaction
      await new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            tx.executeSql('UPDATE database_version SET version = ?', [version]);
          },
          reject,
          resolve,
        );
      });
      
      await this.log(`Database version updated to ${version}`);
    } catch (error) {
      await this.error('Error setting database version', error);
      throw error;
    }
  }

  // Migration 1: Add sports-related columns to activities table
  async migrateTo1() {
    try {
      await this.log(
        'Starting migration to version 1: Adding missing columns to activities table',
      );

      // Check if columns already exist by trying to query them
      const columnsToAdd = [
        {name: 'source', definition: "TEXT DEFAULT 'manual'"},
        {name: 'metadata', definition: 'TEXT'},
        {name: 'calories', definition: 'INTEGER DEFAULT 0'},
        {name: 'distance', definition: 'REAL DEFAULT 0'},
        {name: 'sport_type', definition: 'TEXT'},
        {name: 'strava_id', definition: 'TEXT'},
        {name: 'heart_rate_avg', definition: 'INTEGER'},
        {name: 'heart_rate_max', definition: 'INTEGER'},
        {name: 'elevation_gain', definition: 'REAL DEFAULT 0'},
      ];

      for (const column of columnsToAdd) {
        try {
          // Check if column exists by trying to select it
          await this.getAll(`SELECT ${column.name} FROM activities LIMIT 1`);
          await this.log(`Column ${column.name} already exists, skipping`);
        } catch (error) {
          // Column doesn't exist, add it
          try {
            await this.execAsync(
              `ALTER TABLE activities ADD COLUMN ${column.name} ${column.definition}`,
            );
            await this.log(`Added column: ${column.name} ${column.definition}`);
          } catch (alterError) {
            await this.error(`Failed to add column ${column.name}`, alterError);
            // Continue with other columns
          }
        }
      }

      await this.log('Migration to version 1 completed successfully');
    } catch (error) {
      await this.error('Migration to version 1 failed', error);
      throw error;
    }
  }

  // Migration 2: Add health_data and app_usage tables
  async migrateTo2() {
    try {
      await this.log(
        'Starting migration to version 2: Adding health_data and app_usage tables',
      );

      // Create health_data table for imported health data
      await this.execAsync(`
        CREATE TABLE IF NOT EXISTS health_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          value REAL NOT NULL,
          unit TEXT,
          source TEXT DEFAULT 'imported',
          timestamp INTEGER NOT NULL,
          metadata TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);

      // Create index for health_data queries
      await this.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_health_data_type_timestamp 
        ON health_data (type, timestamp)
      `);

      // Create app_usage table for digital wellness tracking (or add missing columns if it exists)
      try {
        // First try to create the table - will be ignored if it already exists
        await this.execAsync(`
          CREATE TABLE IF NOT EXISTS app_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name TEXT NOT NULL,
            duration INTEGER NOT NULL,
            category TEXT,
            timestamp INTEGER NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
          )
        `);

        // Add missing columns if they don't exist
        const columnsToAdd = [
          {name: 'usage_time', definition: 'INTEGER'},
          {name: 'package_name', definition: 'TEXT'},
          {name: 'session_date', definition: 'TEXT'},
          {name: 'source', definition: "TEXT DEFAULT 'manual'"},
        ];

        for (const column of columnsToAdd) {
          try {
            await this.getAll(`SELECT ${column.name} FROM app_usage LIMIT 1`);
            await this.log(
              `Column ${column.name} already exists in app_usage table`,
            );
          } catch (error) {
            try {
              await this.execAsync(
                `ALTER TABLE app_usage ADD COLUMN ${column.name} ${column.definition}`,
              );
              await this.log(`Added column: ${column.name} to app_usage table`);
            } catch (alterError) {
              await this.error(
                `Failed to add column ${column.name} to app_usage`,
                alterError,
              );
            }
          }
        }
      } catch (error) {
        await this.error('Failed to create/update app_usage table', error);
      }

      // Create index for app_usage queries
      await this.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_app_usage_timestamp 
        ON app_usage (timestamp)
      `);

      // Add timestamp column to activities table if missing (for better queries)
      try {
        await this.getAll(`SELECT timestamp FROM activities LIMIT 1`);
        await this.log('Column timestamp already exists in activities table');
      } catch (error) {
        try {
          await this.execAsync(
            `ALTER TABLE activities ADD COLUMN timestamp INTEGER`,
          );
          // Copy start_time values to timestamp column for existing records
          await this.execAsync(
            `UPDATE activities SET timestamp = start_time WHERE timestamp IS NULL`,
          );
          await this.log('Added timestamp column to activities table');
        } catch (alterError) {
          await this.error(
            'Failed to add timestamp column to activities',
            alterError,
          );
        }
      }

      await this.log('Migration to version 2 completed successfully');
    } catch (error) {
      await this.error('Migration to version 2 failed', error);
      throw error;
    }
  }

  // Migration 3: Add health_highlight column to daily_summaries
  async migrateTo3() {
    try {
      await this.log('Starting migration to version 3: Adding health_highlight column');

      // Add health_highlight column to daily_summaries table
      await new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            tx.executeSql(
              'ALTER TABLE daily_summaries ADD COLUMN health_highlight TEXT',
            );
          },
          error => {
            // Column might already exist, check if table structure is correct
            this.db.transaction(
              tx => {
                tx.executeSql(
                  'PRAGMA table_info(daily_summaries)',
                  [],
                  (_, result) => {
                    const columns = [];
                    for (let i = 0; i < result.rows.length; i++) {
                      columns.push(result.rows.item(i).name);
                    }
                    if (columns.includes('health_highlight')) {
                      resolve(); // Column already exists
                    } else {
                      reject(error); // Column doesn't exist and ALTER failed
                    }
                  },
                );
              },
              reject,
              resolve,
            );
          },
          resolve,
        );
      });

      await this.log('Migration to version 3 completed successfully');
    } catch (error) {
      await this.error('Migration to version 3 failed', error);
      throw error;
    }
  }

  // Migration 4: Add advanced data fusion tables
  async migrateTo4() {
    try {
      await this.log('Starting migration to version 4: Adding advanced data fusion tables');

      // Create shadow_validation_logs table
      await this.execAsync(`
        CREATE TABLE IF NOT EXISTS shadow_validation_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          primary_value REAL,
          shadow_source TEXT NOT NULL,
          shadow_value REAL,
          deviation REAL,
          severity TEXT CHECK(severity IN ('low', 'medium', 'high')),
          created_at INTEGER NOT NULL
        )
      `);

      // Create data_lineage table
      await this.execAsync(`
        CREATE TABLE IF NOT EXISTS data_lineage (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          data_type TEXT NOT NULL,
          value REAL,
          primary_source TEXT NOT NULL,
          confidence REAL,
          contributors TEXT,
          transformations TEXT,
          created_at INTEGER NOT NULL
        )
      `);

      // Create event_correlations table
      await this.execAsync(`
        CREATE TABLE IF NOT EXISTS event_correlations (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          rule_id TEXT NOT NULL,
          events TEXT NOT NULL,
          confidence REAL,
          strength REAL,
          narrative_type TEXT,
          narrative_text TEXT,
          created_at INTEGER NOT NULL
        )
      `);

      // Create confidence_data table for UI visualization
      await this.execAsync(`
        CREATE TABLE IF NOT EXISTS confidence_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          data_type TEXT NOT NULL,
          value REAL,
          source TEXT NOT NULL,
          confidence REAL,
          lineage_id TEXT,
          boost_reasons TEXT,
          created_at INTEGER NOT NULL
        )
      `);

      // Create indexes for better query performance
      await this.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_shadow_validation_timestamp 
        ON shadow_validation_logs (timestamp)
      `);

      await this.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_data_lineage_timestamp 
        ON data_lineage (timestamp)
      `);

      await this.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_event_correlations_timestamp 
        ON event_correlations (timestamp)
      `);

      await this.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_confidence_data_timestamp 
        ON confidence_data (timestamp)
      `);

      await this.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_confidence_data_type 
        ON confidence_data (data_type, timestamp)
      `);

      await this.log('Migration to version 4 completed successfully');
    } catch (error) {
      await this.error('Migration to version 4 failed', error);
      throw error;
    }
  }

  // Debug function to check database structure
  async debugDatabaseStructure() {
    // Only run in development AND if explicitly enabled
    if (!__DEV__ || !this.db) return;

    try {
      // List all tables
      const tables = await this.getAll(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);

      await this.log('Database tables:');
      for (const table of tables) {
        await this.log(`- ${table.name}`);

        // Get table structure with error handling
        try {
          const columns = await this.getAll(`PRAGMA table_info(${table.name})`);
          for (const col of columns) {
            await this.log(`  ${col.name}: ${col.type}`);
          }
        } catch (colError) {
          await this.warn(`Could not get columns for table ${table.name}`, colError);
        }
      }
    } catch (error) {
      // Debug failure is non-critical
      await this.warn('Debug database structure failed', error);
    }
  }

  // Complete database reset for emulator testing (DEVELOPMENT ONLY)
  async resetDatabaseForEmulator() {
    if (!__DEV__) {
      throw new Error('Database reset only allowed in development mode');
    }

    try {
      await this.log('🔄 RESETTING DATABASE FOR EMULATOR TESTING');
      
      // Get all tables
      const tables = await this.getAll(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);

      // Drop all tables
      await new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            // Drop all existing tables
            for (const table of tables) {
              tx.executeSql(`DROP TABLE IF EXISTS ${table.name}`);
            }
          },
          reject,
          resolve,
        );
      });

      await this.log('✅ All tables dropped, reinitializing database...');
      
      // Force reinitialization
      this.isInitialized = false;
      await this.initialize();
      
      await this.log('✅ Database reset complete - fresh start!');
      
    } catch (error) {
      await this.error('Failed to reset database for emulator', error);
      throw error;
    }
  }

  // ensureInitialized is now handled by BaseService through onInitialize

  /**
   * Veilige wrapper voor getAllAsync met foutafhandeling, null-checks en performance tracking
   * @param {string} query - SQL query string
   * @param {Array} [params=[]] - Query parameters
   * @returns {Promise<Array>} Query results or empty array on error
   */
  async safeGetAllAsync(query, params = []) {
    const queryName = this.extractQueryName(query);

    return await performanceService.trackQuery(
      queryName,
      async () => {
        await this.ensureInitialized();

        if (!this.db) {
          if (__DEV__) console.warn('Database is niet geïnitialiseerd');
          return [];
        }

        try {
          let result = await this.getAll(query, params);

          // Handle different SQLite implementations
          if (result === null || result === undefined) {
            if (__DEV__) console.warn('Query resultaat is null of undefined');
            return [];
          }

          // Modern SQLite implementations return direct array
          if (Array.isArray(result)) {
            return result;
          }

          // Handle legacy format (object with _array property)
          if (
            typeof result === 'object' &&
            result !== null &&
            result._array !== undefined
          ) {
            return result._array;
          }

          // Handle case where result might be an object without _array
          if (typeof result === 'object' && result !== null) {
            if (__DEV__) console.warn('Query resultaat is object zonder _array:', result);
            return [];
          }

          if (__DEV__) console.warn(
            'Onverwacht query resultaat format:',
            typeof result,
            result,
          );
          return [];
        } catch (error) {
          console.error('Database query error:', error); // Keep errors in production
          return [];
        }
      },
      params,
    );
  }

  // Extract query name for performance tracking
  extractQueryName(query) {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) {
      const fromMatch = trimmed.match(/FROM\s+(\w+)/);
      return fromMatch ? `SELECT_${fromMatch[1]}` : 'SELECT_UNKNOWN';
    } else if (trimmed.startsWith('INSERT')) {
      const intoMatch = trimmed.match(/INTO\s+(\w+)/);
      return intoMatch ? `INSERT_${intoMatch[1]}` : 'INSERT_UNKNOWN';
    } else if (trimmed.startsWith('UPDATE')) {
      const tableMatch = trimmed.match(/UPDATE\s+(\w+)/);
      return tableMatch ? `UPDATE_${tableMatch[1]}` : 'UPDATE_UNKNOWN';
    } else if (trimmed.startsWith('DELETE')) {
      const fromMatch = trimmed.match(/FROM\s+(\w+)/);
      return fromMatch ? `DELETE_${fromMatch[1]}` : 'DELETE_UNKNOWN';
    }
    return 'UNKNOWN_QUERY';
  }

  // Execute generic query - for compatibility with error messages
  async executeQuery(query, params = []) {
    return await this.safeGetAllAsync(query, params);
  }

  // Generic method to insert data into any table - for compatibility with summaryService
  async insertDataToSQLite(tableName, data) {
    try {
      await this.ensureInitialized();
      // Generate columns and placeholders from data object
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data)
        .map(() => '?')
        .join(', ');
      const values = Object.values(data);

      const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

      const result = await this.run(query, values);
      return result.lastInsertRowId;
    } catch (error) {
      console.error(`Error inserting data into ${tableName}:`, error);
      throw error;
    }
  }

  // Get data for a specific day - optimized with specific columns
  async getDataByDay(date = new Date()) {
    try {
      await this.ensureInitialized();
      const formattedDate =
        date instanceof Date ? date.toISOString().split('T')[0] : date;

      const startOfDay = new Date(formattedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(formattedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const startTimestamp = startOfDay.getTime();
      const endTimestamp = endOfDay.getTime();

      // Retrieve relevant data for the day with optimized queries
      const activities = await this.getActivities(startTimestamp, endTimestamp);

      // Optimized locations query - select only needed columns
      const locations = await this.safeGetAllAsync(
        `SELECT id, latitude, longitude, timestamp, name, visit_count 
         FROM locations 
         WHERE timestamp >= ? AND timestamp <= ?
         ORDER BY visit_count DESC`,
        [startTimestamp, endTimestamp],
      );

      // Optimized calls query - select only needed columns
      const calls = await this.safeGetAllAsync(
        `SELECT id, phone_number, contact_name, call_type, call_date, duration 
         FROM call_logs 
         WHERE call_date >= ? AND call_date <= ?
         ORDER BY call_date DESC`,
        [startTimestamp, endTimestamp],
      );

      return {
        date: formattedDate,
        activities,
        locations,
        calls,
      };
    } catch (error) {
      console.error('Error getting data for day:', error);
      return {
        date: date instanceof Date ? date.toISOString().split('T')[0] : date,
        activities: [],
        locations: [],
        calls: [],
      };
    }
  }

  // Optimized daily summary generation with better queries
  async generateDailySummary(date = new Date().toISOString().split('T')[0]) {
    return this.safeExecute(async () => {
      // Valideer dat de datum niet in de toekomst ligt
      const today = new Date();
      const selectedDate = new Date(date);

      // Reset tijd naar middernacht voor vergelijking
      today.setHours(23, 59, 59, 999);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        return {
          success: false,
          error: 'FUTURE_DATE',
          message:
            'Kan geen dagboek genereren voor een toekomstige datum. Selecteer een datum van vandaag of eerder.',
          date: date,
        };
      }

      await this.ensureInitialized();

      // Get Health Connect data for the day
      let healthSummary = null;
      try {
        // Lazy load healthDataService to avoid circular dependency
        const healthDataService = require('./healthDataService').default;
        if (healthDataService && healthDataService.getHealthStats) {
          // Call without parameters - service determines date range internally
          healthSummary = await healthDataService.getHealthStats();
        }
      } catch (healthError) {
        // Health data not critical - continue without it
        await this.warn('Health Connect data not available for summary', healthError);
      }

      // Parallel query execution for better performance
      const [activitiesResult, callsResult, locationsResult, healthDataResult] =
        await Promise.all([
          // Optimized activities query
          this.safeGetAllAsync(
            `
          SELECT type, COUNT(*) as count 
          FROM activities 
          WHERE DATE(start_time/1000, 'unixepoch') = ?
          GROUP BY type 
          ORDER BY count DESC 
          LIMIT 1
        `,
            [date],
          ),

          // Optimized calls query
          this.safeGetAllAsync(
            `
          SELECT phone_number, contact_name, COUNT(*) as call_count 
          FROM call_logs 
          WHERE DATE(call_date/1000, 'unixepoch') = ?
          GROUP BY phone_number 
          ORDER BY call_count DESC 
          LIMIT 1
        `,
            [date],
          ),

          // Optimized locations query
          this.safeGetAllAsync(
            `
          SELECT latitude, longitude, COUNT(*) as visit_count 
          FROM locations 
          WHERE DATE(timestamp/1000, 'unixepoch') = ?
          GROUP BY latitude, longitude 
          ORDER BY visit_count DESC 
          LIMIT 1
        `,
            [date],
          ),

          // Get Health Connect data from activities table
          this.safeGetAllAsync(
            `
          SELECT type, SUM(calories) as total_calories, SUM(distance) as total_distance, COUNT(*) as count
          FROM activities 
          WHERE DATE(start_time/1000, 'unixepoch') = ? AND source = 'health_connect'
          GROUP BY type 
          ORDER BY count DESC
        `,
            [date],
          ),
        ]);

      const mostCommonActivity =
        activitiesResult.length > 0 ? activitiesResult[0].type : null;

      const mostCalledContact =
        callsResult.length > 0 ? callsResult[0].contact_name : null;

      const mostVisitedLocation =
        locationsResult.length > 0 ? locationsResult[0].id : null;

      // Process health data for summary
      let healthHighlight = null;
      if (healthSummary && healthSummary.daily) {
        const daily = healthSummary.daily;
        if (daily.steps > 10000) {
          healthHighlight = `Indrukwekkende ${daily.steps} stappen`;
        } else if (daily.steps > 0) {
          healthHighlight = `${daily.steps} stappen`;
        }
        
        if (daily.calories > 0) {
          if (!healthHighlight) {
            healthHighlight = `${daily.calories} calorieën verbrand`;
          }
        }
      }

      // Prepare summary with Health Connect data
      const summary = {
        date,
        morningActivity: mostCommonActivity,
        mostCalledContact,
        mostVisitedLocation: mostVisitedLocation
          ? `${mostVisitedLocation.latitude},${mostVisitedLocation.longitude}`
          : null,
        healthHighlight, // Health Connect highlight
        summaryData: JSON.stringify({
          activities: activitiesResult,
          calls: callsResult,
          locations: locationsResult,
          healthData: {
            summary: healthSummary,
            details: healthDataResult
          },
        }),
      };

      // Save and return summary
      await this.saveDailySummary(summary);
      return summary;
    });
  }

  // Wrap operations in a safe execution method
  async safeExecute(operation) {
    try {
      await this.ensureInitialized();
      return await operation();
    } catch (error) {
      console.error('Safe execute error:', error);
      throw error;
    }
  }

  // Save activity with migration-aware column handling
  async saveActivity(activity) {
    await this.ensureInitialized();

    const {
      type,
      startTime,
      endTime,
      duration,
      details,
      source = 'manual',
      metadata = null,
      calories = 0,
      distance = 0,
      sport_type = null,
      strava_id = null,
      heart_rate_avg = null,
      heart_rate_max = null,
      elevation_gain = 0,
    } = activity;

    try {
      // Try modern insert with all columns first
      const result = await this.run(
        `INSERT INTO activities (type, start_time, end_time, duration, details, source, metadata, calories, distance, sport_type, strava_id, heart_rate_avg, heart_rate_max, elevation_gain)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          type,
          startTime,
          endTime,
          duration,
          JSON.stringify(details),
          source,
          metadata ? JSON.stringify(metadata) : null,
          calories,
          distance,
          sport_type,
          strava_id,
          heart_rate_avg,
          heart_rate_max,
          elevation_gain,
        ],
      );
      return result.lastInsertRowId;
    } catch (error) {
      // If insert fails due to missing columns, try basic insert with core columns only
      if (error.message && error.message.includes('no such column')) {
        await this.warn(
          'Using fallback insert due to missing columns, migration may be needed',
          error,
        );

        try {
          const result = await this.run(
            `INSERT INTO activities (type, start_time, end_time, duration, details)
             VALUES (?, ?, ?, ?, ?)`,
            [type, startTime, endTime, duration, JSON.stringify(details)],
          );
          return result.lastInsertRowId;
        } catch (fallbackError) {
          await this.error(
            'Both modern and fallback activity insert failed',
            fallbackError,
          );
          throw fallbackError;
        }
      } else {
        // Re-throw non-column errors
        throw error;
      }
    }
  }

  // Migration-aware get activities with fallback column selection
  async getActivities(startDate, endDate) {
    await this.ensureInitialized();

    try {
      // Try modern select with all columns first
      return await this.safeGetAllAsync(
        `SELECT id, type, start_time, end_time, duration, source, calories, distance, sport_type, strava_id, heart_rate_avg, heart_rate_max, elevation_gain, metadata, details
         FROM activities
         WHERE start_time >= ? AND start_time <= ?
         ORDER BY start_time DESC`,
        [startDate, endDate],
      );
    } catch (error) {
      // If select fails due to missing columns, try basic select with core columns only
      if (error.message && error.message.includes('no such column')) {
        await this.warn(
          'Using fallback select due to missing columns, migration may be needed',
          error,
        );

        return await this.safeGetAllAsync(
          `SELECT id, type, start_time, end_time, duration, details
           FROM activities
           WHERE start_time >= ? AND start_time <= ?
           ORDER BY start_time DESC`,
          [startDate, endDate],
        );
      } else {
        // Re-throw non-column errors
        throw error;
      }
    }
  }

  // Save location with optimized duplicate detection
  async saveLocation(location) {
    await this.ensureInitialized();
    const {latitude, longitude, timestamp, accuracy, name} = location;

    // Optimized existing location check using index
    const existingLocations = await this.safeGetAllAsync(
      `SELECT id, visit_count FROM locations
       WHERE ABS(latitude - ?) < 0.0001 AND ABS(longitude - ?) < 0.0001
       LIMIT 1`,
      [latitude, longitude],
    );

    if (existingLocations.length > 0) {
      // Update existing location
      const existingLocation = existingLocations[0];
      await this.run(
        `UPDATE locations
         SET visit_count = visit_count + 1, last_visited = ?
         WHERE id = ?`,
        [timestamp, existingLocation.id],
      );
      return existingLocation.id;
    } else {
      // Save new location
      const result = await this.run(
        `INSERT INTO locations (latitude, longitude, timestamp, accuracy, name, last_visited)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [latitude, longitude, timestamp, accuracy, name || null, timestamp],
      );
      return result.lastInsertRowId;
    }
  }

  // Alias for saveLocation to maintain compatibility
  async addLocation(location) {
    return await this.saveLocation(location);
  }

  // Optimized frequent locations query
  async getFrequentLocations(limit = 10) {
    await this.ensureInitialized();
    return await this.safeGetAllAsync(
      `SELECT id, latitude, longitude, name, visit_count, last_visited
       FROM locations
       ORDER BY visit_count DESC
       LIMIT ?`,
      [limit],
    );
  }

  // Get locations visited within a specific date range
  async getLocationsByDateRange(startDate, endDate, limit = 10) {
    await this.ensureInitialized();
    return await this.safeGetAllAsync(
      `SELECT id, latitude, longitude, name, timestamp, accuracy, 
              COALESCE(visit_count, 1) as visit_count, 
              COALESCE(last_visited, timestamp) as last_visited
       FROM locations 
       WHERE timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [startDate, endDate, limit],
    );
  }

  // Save call log
  async saveCallLog(callLog) {
    await this.ensureInitialized();
    const {phoneNumber, contactName, callType, callDate, duration} = callLog;
    const result = await this.run(
      `INSERT INTO call_logs (phone_number, contact_name, call_type, call_date, duration)
       VALUES (?, ?, ?, ?, ?)`,
      [phoneNumber, contactName, callType, callDate, duration],
    );
    return result.lastInsertRowId;
  }

  // Optimized call stats with specific columns
  async getCallStats(startDate, endDate) {
    await this.ensureInitialized();
    return await this.safeGetAllAsync(
      `SELECT 
        phone_number, 
        contact_name,
        COUNT(*) as call_count, 
        SUM(duration) as total_duration,
        AVG(duration) as avg_duration
       FROM call_logs
       WHERE call_date >= ? AND call_date <= ?
       GROUP BY phone_number
       ORDER BY call_count DESC`,
      [startDate, endDate],
    );
  }

  // Save daily summary
  async saveDailySummary(summary) {
    await this.ensureInitialized();
    const {
      date,
      morningActivity,
      afternoonActivity,
      eveningActivity,
      nightActivity,
      totalSteps,
      totalActiveTime,
      mostVisitedLocation,
      mostCalledContact,
      summaryData,
      healthHighlight,
    } = summary;

    // Optimized existence check using index
    const existingResult = await this.safeGetAllAsync(
      'SELECT id FROM daily_summaries WHERE date = ? LIMIT 1',
      [date],
    );

    if (existingResult.length > 0) {
      // Update existing summary
      await this.run(
        `UPDATE daily_summaries
         SET 
           morning_activity = ?,
           afternoon_activity = ?,
           evening_activity = ?,
           night_activity = ?,
           total_steps = ?,
           total_active_time = ?,
           most_visited_location = ?,
           most_called_contact = ?,
           summary_data = ?,
           health_highlight = ?
         WHERE date = ?`,
        [
          morningActivity,
          afternoonActivity,
          eveningActivity,
          nightActivity,
          totalSteps || 0,
          totalActiveTime || 0,
          mostVisitedLocation || null, // Zet NULL als er geen geldige location ID is
          mostCalledContact,
          summaryData ? JSON.stringify(summaryData) : null,
          healthHighlight,
          date,
        ],
      );
      return existingResult[0].id;
    } else {
      // Insert new summary
      const result = await this.run(
        `INSERT INTO daily_summaries (
          date, morning_activity, afternoon_activity, evening_activity,
          night_activity, total_steps, total_active_time,
          most_visited_location, most_called_contact, summary_data, health_highlight
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          date,
          morningActivity,
          afternoonActivity,
          eveningActivity,
          nightActivity,
          totalSteps || 0,
          totalActiveTime || 0,
          mostVisitedLocation || null, // Zet NULL als er geen geldige location ID is
          mostCalledContact,
          summaryData ? JSON.stringify(summaryData) : null,
          healthHighlight,
        ],
      );
      return result.lastInsertRowId;
    }
  }

  // Optimized daily summary retrieval
  async getDailySummary(date) {
    await this.ensureInitialized();
    const result = await this.safeGetAllAsync(
      'SELECT * FROM daily_summaries WHERE date = ? LIMIT 1',
      [date],
    );
    return result.length > 0 ? result[0] : null;
  }

  // Get weekly summary
  async getWeeklySummary(startDate, endDate) {
    await this.ensureInitialized();
    return await this.safeGetAllAsync(
      `SELECT date, total_steps, total_active_time, morning_activity, most_called_contact
       FROM daily_summaries
       WHERE date >= ? AND date <= ?
       ORDER BY date`,
      [startDate, endDate],
    );
  }

  // Optimized most common activities
  async getMostCommonActivities() {
    try {
      await this.ensureInitialized();
      return await this.safeGetAllAsync(`
        SELECT type, COUNT(*) as activityCount 
        FROM activities 
        GROUP BY type 
        ORDER BY activityCount DESC 
        LIMIT 5
      `);
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }

  // Optimized most called numbers
  async getMostCalledNumbers() {
    try {
      await this.ensureInitialized();
      return await this.safeGetAllAsync(`
        SELECT phone_number, contact_name, COUNT(*) as callCount 
        FROM call_logs 
        GROUP BY phone_number 
        ORDER BY callCount DESC 
        LIMIT 5
      `);
    } catch (error) {
      console.error('Error fetching called numbers:', error);
      return [];
    }
  }

  // Optimized most visited locations
  async getMostVisitedLocations() {
    try {
      await this.ensureInitialized();
      return await this.safeGetAllAsync(`
        SELECT latitude, longitude, name, COUNT(*) as visitCount 
        FROM locations 
        GROUP BY latitude, longitude 
        ORDER BY visitCount DESC 
        LIMIT 5
      `);
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  // Optimized visited places query
  async getVisitedPlaces(startTime, endTime, limit = 10) {
    try {
      await this.ensureInitialized();
      return await this.safeGetAllAsync(
        `
        SELECT id, latitude, longitude, name, visit_count, timestamp
        FROM locations
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY visit_count DESC
        LIMIT ?
      `,
        [startTime, endTime, limit],
      );
    } catch (error) {
      console.error('Error fetching visited places:', error);
      return [];
    }
  }

  // Optimized current location query
  async getCurrentLocation() {
    try {
      await this.ensureInitialized();
      const result = await this.safeGetAllAsync(`
        SELECT id, latitude, longitude, name, timestamp
        FROM locations
        ORDER BY timestamp DESC
        LIMIT 1
      `);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error fetching current location:', error);
      return null;
    }
  }

  // Optimized trends calculation with parallel queries
  async getTrends(days = 7) {
    try {
      await this.ensureInitialized();
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];

      // Parallel execution for better performance
      const [summaries, activities] = await Promise.all([
        this.getWeeklySummary(startDateStr, endDateStr),
        this.getMostCommonActivities(),
      ]);

      // Process data for trends visualization
      const stepsPerDay = [];
      const activeTimePerDay = [];
      let totalSteps = 0;
      let totalActiveTime = 0;

      summaries.forEach(summary => {
        stepsPerDay.push({
          date: summary.date,
          steps: summary.total_steps || 0,
        });

        activeTimePerDay.push({
          date: summary.date,
          activeTime: summary.total_active_time || 0,
        });

        totalSteps += summary.total_steps || 0;
        totalActiveTime += summary.total_active_time || 0;
      });

      const avgSteps = summaries.length > 0 ? totalSteps / summaries.length : 0;
      const avgActiveTime =
        summaries.length > 0 ? totalActiveTime / summaries.length : 0;

      // Calculate simple trends (percentage change)
      const stepsChange =
        summaries.length > 1
          ? ((summaries[summaries.length - 1].total_steps || 0) /
              (summaries[0].total_steps || 1) -
              1) *
            100
          : 0;

      const activeTimeChange =
        summaries.length > 1
          ? ((summaries[summaries.length - 1].total_active_time || 0) /
              (summaries[0].total_active_time || 1) -
              1) *
            100
          : 0;

      // Process activity types distribution
      const activityTypes = {};
      activities.forEach(activity => {
        activityTypes[activity.type || 'unknown'] = activity.activityCount || 0;
      });

      return {
        daysInPeriod: days,
        stepsPerDay,
        activeTimePerDay,
        avgSteps,
        avgActiveTime,
        stepsChange,
        activeTimeChange,
        activityTypes,
        summaries,
      };
    } catch (error) {
      console.error('Error fetching trends:', error);
      return {
        daysInPeriod: days,
        stepsPerDay: [],
        activeTimePerDay: [],
        avgSteps: 0,
        avgActiveTime: 0,
        stepsChange: 0,
        activeTimeChange: 0,
        activityTypes: {},
        summaries: [],
      };
    }
  }

  /**
   * Safely execute a database transaction with performance optimization
   * @param {Function} callback - Function that returns a promise to execute in transaction
   * @returns {Promise<any>} Result of the callback
   */
  async transaction(callback) {
    await this.ensureInitialized();

    const startTime = Date.now();
    try {
      // Start transaction if supported
      if (this.db.transactionAsync) {
        const result = await this.db.transactionAsync(async tx => {
          return await callback(tx);
        });
        
        // Log slow transactions in development
        const duration = Date.now() - startTime;
        if (__DEV__ && duration > 1000) {
          if (__DEV__) console.warn(`Slow transaction detected: ${duration}ms`);
        }
        
        return result;
      } else {
        // Fallback if transactions aren't supported
        const result = await callback(this.db);
        
        // Log slow operations in development
        const duration = Date.now() - startTime;
        if (__DEV__ && duration > 1000) {
          if (__DEV__) console.warn(`Slow database operation detected: ${duration}ms`);
        }
        
        return result;
      }
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Batch multiple database operations for better performance
   * @param {Array} operations - Array of database operations
   * @returns {Promise<Array>} Array of results
   */
  async batchOperations(operations) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return [];
    }

    // Use transaction for batch operations
    return await this.transaction(async (tx) => {
      const results = [];
      for (const operation of operations) {
        try {
          const result = await operation(tx || this.db);
          results.push(result);
        } catch (error) {
          console.error('Batch operation failed:', error);
          results.push(null);
        }
      }
      return results;
    });
  }

  // ----- APP USAGE FUNCTIONS -----

  /**
   * Slaat app usage data op in de database
   * @param {Object} appUsage - App usage data
   * @param {string} appUsage.app_name - Naam van de app
   * @param {string} appUsage.package_name - Package name van de app
   * @param {string} appUsage.category - Categorie van de app
   * @param {number} appUsage.duration - Gebruiksduur in seconden
   * @param {number} appUsage.timestamp - Unix timestamp
   * @param {string} appUsage.session_date - Datum in YYYY-MM-DD formaat
   * @param {string} appUsage.source - Bron van de data (manual, android, ios)
   * @returns {Promise<number>} - ID van de opgeslagen record
   */
  async saveAppUsage(appUsage) {
    try {
      if (!appUsage.app_name || !appUsage.duration || !appUsage.timestamp) {
        throw new Error('App name, duration and timestamp are required');
      }

      await this.ensureInitialized();
      const {
        app_name,
        package_name,
        category,
        duration,
        timestamp,
        session_date,
        source = 'manual',
      } = appUsage;

      const result = await this.run(
        `INSERT INTO app_usage (app_name, package_name, category, duration, timestamp, session_date, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          app_name,
          package_name,
          category,
          duration,
          timestamp,
          session_date || formatDateToYYYYMMDD(new Date(timestamp)),
          source,
        ],
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error saving app usage:', error);
      throw error;
    }
  }

  /**
   * Haalt app usage data op voor een specifieke datum
   * @param {string|Date} date - De datum om op te halen
   * @returns {Promise<Array>} - Array met app usage data
   */
  async getAppUsageByDate(date) {
    try {
      if (!date) {
        throw new Error('Date is required');
      }

      await this.ensureInitialized();
      const formattedDate = formatDateToYYYYMMDD(date);

      return await this.safeGetAllAsync(
        `SELECT id, app_name, package_name, category, duration, timestamp, source
         FROM app_usage
         WHERE session_date = ?
         ORDER BY duration DESC`,
        [formattedDate],
      );
    } catch (error) {
      console.error('Error retrieving app usage by date:', error);
      throw error;
    }
  }

  /**
   * Haalt app usage data op binnen een datumbereik
   * @param {string|Date} startDate - Begin van het datumbereik
   * @param {string|Date} endDate - Einde van het datumbereik
   * @returns {Promise<Array>} - Array met app usage data
   */
  async getAppUsageByDateRange(startDate, endDate) {
    try {
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }

      await this.ensureInitialized();
      const formattedStartDate = formatDateToYYYYMMDD(startDate);
      const formattedEndDate = formatDateToYYYYMMDD(endDate);

      return await this.safeGetAllAsync(
        `SELECT id, app_name, package_name, category, duration, timestamp, session_date, source
         FROM app_usage
         WHERE session_date >= ? AND session_date <= ?
         ORDER BY session_date DESC, duration DESC`,
        [formattedStartDate, formattedEndDate],
      );
    } catch (error) {
      console.error('Error retrieving app usage by date range:', error);
      throw error;
    }
  }

  /**
   * Haalt totale app usage per app op binnen een periode
   * @param {string|Date} startDate - Begin van de periode
   * @param {string|Date} endDate - Einde van de periode
   * @returns {Promise<Array>} - Array met totale app usage per app
   */
  async getAppUsageSummary(startDate, endDate) {
    try {
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }

      await this.ensureInitialized();
      const formattedStartDate = formatDateToYYYYMMDD(startDate);
      const formattedEndDate = formatDateToYYYYMMDD(endDate);

      return await this.safeGetAllAsync(
        `SELECT 
          app_name,
          package_name,
          category,
          SUM(duration) as total_duration,
          COUNT(*) as usage_count,
          AVG(duration) as avg_duration,
          MIN(timestamp) as first_use,
          MAX(timestamp) as last_use
         FROM app_usage
         WHERE session_date >= ? AND session_date <= ?
         GROUP BY app_name, package_name
         ORDER BY total_duration DESC`,
        [formattedStartDate, formattedEndDate],
      );
    } catch (error) {
      console.error('Error retrieving app usage summary:', error);
      throw error;
    }
  }

  /**
   * Haalt categorie-gebaseerde app usage op
   * @param {string|Date} startDate - Begin van de periode
   * @param {string|Date} endDate - Einde van de periode
   * @returns {Promise<Array>} - Array met categorie usage
   */
  async getAppUsageByCategory(startDate, endDate) {
    try {
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }

      await this.ensureInitialized();
      const formattedStartDate = formatDateToYYYYMMDD(startDate);
      const formattedEndDate = formatDateToYYYYMMDD(endDate);

      return await this.safeGetAllAsync(
        `SELECT 
          category,
          SUM(duration) as total_duration,
          COUNT(*) as usage_count,
          COUNT(DISTINCT app_name) as app_count
         FROM app_usage
         WHERE session_date >= ? AND session_date <= ?
         GROUP BY category
         ORDER BY total_duration DESC`,
        [formattedStartDate, formattedEndDate],
      );
    } catch (error) {
      console.error('Error retrieving app usage by category:', error);
      throw error;
    }
  }

  /**
   * Haalt de meest gebruikte apps op
   * @param {number} limit - Maximum aantal apps om terug te geven
   * @param {string|Date} startDate - Optioneel begin van de periode
   * @param {string|Date} endDate - Optioneel einde van de periode
   * @returns {Promise<Array>} - Array met meest gebruikte apps
   */
  async getTopApps(limit = 10, startDate = null, endDate = null) {
    try {
      await this.ensureInitialized();

      let query = `
        SELECT 
          app_name,
          package_name,
          category,
          SUM(duration) as total_duration,
          COUNT(*) as usage_count,
          AVG(duration) as avg_duration
        FROM app_usage
      `;

      let params = [];

      if (startDate && endDate) {
        const formattedStartDate = formatDateToYYYYMMDD(startDate);
        const formattedEndDate = formatDateToYYYYMMDD(endDate);
        query += ` WHERE session_date >= ? AND session_date <= ?`;
        params = [formattedStartDate, formattedEndDate];
      }

      query += `
        GROUP BY app_name, package_name
        ORDER BY total_duration DESC
        LIMIT ?
      `;
      params.push(limit);

      return await this.safeGetAllAsync(query, params);
    } catch (error) {
      console.error('Error retrieving top apps:', error);
      throw error;
    }
  }

  /**
   * Haalt app usage trends op over een periode
   * @param {number} days - Aantal dagen om terug te kijken
   * @returns {Promise<Object>} - Object met trends data
   */
  async getAppUsageTrends(days = 7) {
    try {
      await this.ensureInitialized();
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];

      // Get daily usage data
      const dailyUsage = await this.safeGetAllAsync(
        `SELECT 
          session_date,
          SUM(duration) as total_duration,
          COUNT(*) as usage_count,
          COUNT(DISTINCT app_name) as unique_apps
         FROM app_usage
         WHERE session_date >= ? AND session_date <= ?
         GROUP BY session_date
         ORDER BY session_date`,
        [startDateStr, endDateStr],
      );

      // Get category trends
      const categoryTrends = await this.safeGetAllAsync(
        `SELECT 
          session_date,
          category,
          SUM(duration) as category_duration
         FROM app_usage
         WHERE session_date >= ? AND session_date <= ?
         GROUP BY session_date, category
         ORDER BY session_date, category_duration DESC`,
        [startDateStr, endDateStr],
      );

      // Calculate totals and averages
      let totalDuration = 0;
      let totalUsage = 0;
      let maxDuration = 0;
      let minDuration = Infinity;

      dailyUsage.forEach(day => {
        totalDuration += day.total_duration || 0;
        totalUsage += day.usage_count || 0;
        maxDuration = Math.max(maxDuration, day.total_duration || 0);
        minDuration = Math.min(minDuration, day.total_duration || Infinity);
      });

      const avgDailyDuration =
        dailyUsage.length > 0 ? totalDuration / dailyUsage.length : 0;
      const avgDailyUsage =
        dailyUsage.length > 0 ? totalUsage / dailyUsage.length : 0;

      // Calculate trend direction
      const trendDirection =
        dailyUsage.length > 1
          ? ((dailyUsage[dailyUsage.length - 1]?.total_duration || 0) /
              (dailyUsage[0]?.total_duration || 1) -
              1) *
            100
          : 0;

      return {
        daysInPeriod: days,
        dailyUsage,
        categoryTrends,
        totals: {
          totalDuration,
          totalUsage,
          avgDailyDuration,
          avgDailyUsage,
          maxDuration,
          minDuration: minDuration === Infinity ? 0 : minDuration,
        },
        trendDirection,
      };
    } catch (error) {
      console.error('Error retrieving app usage trends:', error);
      return {
        daysInPeriod: days,
        dailyUsage: [],
        categoryTrends: [],
        totals: {
          totalDuration: 0,
          totalUsage: 0,
          avgDailyDuration: 0,
          avgDailyUsage: 0,
          maxDuration: 0,
          minDuration: 0,
        },
        trendDirection: 0,
      };
    }
  }

  /**
   * Verwijdert app usage data voor een specifieke datum
   * @param {string|Date} date - De datum om te verwijderen
   * @returns {Promise<boolean>} - True als verwijdering succesvol was
   */
  async deleteAppUsageByDate(date) {
    try {
      if (!date) {
        throw new Error('Date is required');
      }

      await this.ensureInitialized();
      const formattedDate = formatDateToYYYYMMDD(date);

      const result = await this.run(
        `DELETE FROM app_usage WHERE session_date = ?`,
        [formattedDate],
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting app usage by date:', error);
      throw error;
    }
  }

  /**
   * Verwijdert alle app usage data voor een specifieke app
   * @param {string} appName - Naam van de app om te verwijderen
   * @returns {Promise<number>} - Aantal verwijderde records
   */
  async deleteAppUsageByApp(appName) {
    try {
      if (!appName) {
        throw new Error('App name is required');
      }

      await this.ensureInitialized();

      const result = await this.run(
        `DELETE FROM app_usage WHERE app_name = ?`,
        [appName],
      );

      return result.changes;
    } catch (error) {
      console.error('Error deleting app usage by app:', error);
      throw error;
    }
  }

  /**
   * Optimaliseert de app_usage tabel door oude records te verwijderen
   * @param {number} daysToKeep - Aantal dagen aan data om te behouden
   * @returns {Promise<number>} - Aantal verwijderde records
   */
  async cleanupAppUsage(daysToKeep = 90) {
    try {
      await this.ensureInitialized();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      const result = await this.run(
        `DELETE FROM app_usage WHERE session_date < ?`,
        [cutoffDateStr],
      );

      // Vacuum the database to reclaim space
      await this.execAsync('VACUUM');

      await this.log(`Cleaned up ${result.changes} old app usage records`);
      return result.changes;
    } catch (error) {
      console.error('Error cleaning up app usage:', error);
      throw error;
    }
  }

  /**
   * Haalt samenvatting op voor dagelijkse app usage samen met andere activiteiten
   * @param {string|Date} date - De datum om op te halen
   * @returns {Promise<Object>} - Complete dagelijkse samenvatting
   */
  async getCompleteDailySummary(date = new Date()) {
    try {
      const formattedDate =
        date instanceof Date ? date.toISOString().split('T')[0] : date;

      // Get all data for the day in parallel
      const [basicData, appUsage, appUsageByApp, appUsageByCategory] =
        await Promise.all([
          this.getDataByDay(date),
          this.getAppUsageByDate(date),
          this.getAppUsageSummary(formattedDate, formattedDate),
          this.getAppUsageByCategory(formattedDate, formattedDate),
        ]);

      // Calculate app usage totals
      let totalAppUsage = 0;
      let mostUsedApp = null;
      let mostUsedCategory = null;

      if (appUsageByApp.length > 0) {
        mostUsedApp = appUsageByApp[0];
        totalAppUsage = appUsageByApp.reduce(
          (sum, app) => sum + (app.total_duration || 0),
          0,
        );
      }

      if (appUsageByCategory.length > 0) {
        mostUsedCategory = appUsageByCategory[0];
      }

      return {
        ...basicData,
        appUsage: {
          totalDuration: totalAppUsage,
          usageCount: appUsage.length,
          uniqueApps: appUsageByApp.length,
          mostUsedApp,
          mostUsedCategory,
          apps: appUsageByApp,
          categories: appUsageByCategory,
          detailed: appUsage,
        },
      };
    } catch (error) {
      console.error('Error retrieving complete daily summary:', error);
      return this.getDataByDay(date);
    }
  }

  /**
   * Haalt app usage data op voor integratie in verhalen
   * @param {string|Date} startDate - Begin van de periode
   * @param {string|Date} endDate - Einde van de periode
   * @returns {Promise<Object>} - Gestructureerde data voor verhalen
   */
  async getAppUsageForStories(startDate, endDate) {
    try {
      const [appUsage, categoryUsage] = await Promise.all([
        this.getAppUsageSummary(startDate, endDate),
        this.getAppUsageByCategory(startDate, endDate),
      ]);

      // Format data for narrative generation
      const topApps = appUsage.slice(0, 5).map(app => ({
        name: app.app_name,
        duration: app.total_duration,
        count: app.usage_count,
        category: app.category,
      }));

      const topCategories = categoryUsage.map(cat => ({
        name: cat.category || 'Overige',
        duration: cat.total_duration,
        count: cat.usage_count,
      }));

      const totalDuration = appUsage.reduce(
        (sum, app) => sum + (app.total_duration || 0),
        0,
      );
      const totalApps = appUsage.length;

      return {
        totalDuration,
        totalApps,
        topApps,
        topCategories,
        dailyBreakdown: appUsage,
        insights: this.generateAppUsageInsights(appUsage, categoryUsage),
      };
    } catch (error) {
      console.error('Error retrieving app usage for stories:', error);
      return {
        totalDuration: 0,
        totalApps: 0,
        topApps: [],
        topCategories: [],
        dailyBreakdown: [],
        insights: [],
      };
    }
  }

  /**
   * Genereert inzichten over app usage patronen
   * @param {Array} appUsage - Array met app usage data
   * @param {Array} categoryUsage - Array met categorie usage data
   * @returns {Array} - Array met inzichten
   */
  generateAppUsageInsights(appUsage, categoryUsage) {
    const insights = [];

    if (appUsage.length === 0) return insights;

    const totalDuration = appUsage.reduce(
      (sum, app) => sum + (app.total_duration || 0),
      0,
    );

    // Find most used app
    const mostUsedApp = appUsage[0];
    if (mostUsedApp && mostUsedApp.total_duration > totalDuration * 0.3) {
      insights.push({
        type: 'heavy_usage',
        app: mostUsedApp.app_name,
        duration: mostUsedApp.total_duration,
        percentage: Math.round(
          (mostUsedApp.total_duration / totalDuration) * 100,
        ),
      });
    }

    // Find productive vs entertainment ratio
    const productiveApps = ['Productivity', 'Education', 'Business', 'Finance'];
    const entertainmentApps = ['Games', 'Entertainment', 'Social', 'Shopping'];

    const productiveDuration = categoryUsage
      .filter(cat => productiveApps.includes(cat.category))
      .reduce((sum, cat) => sum + (cat.total_duration || 0), 0);

    const entertainmentDuration = categoryUsage
      .filter(cat => entertainmentApps.includes(cat.category))
      .reduce((sum, cat) => sum + (cat.total_duration || 0), 0);

    if (entertainmentDuration > productiveDuration * 2) {
      insights.push({
        type: 'entertainment_heavy',
        entertainmentDuration,
        productiveDuration,
        ratio: Math.round(entertainmentDuration / productiveDuration),
      });
    }

    return insights;
  }

  // ----- NARRATIVE SUMMARY FUNCTIONS -----

  /**
   * Slaat een narratieve samenvatting op in de database
   * @param {string|Date} date - De datum voor de samenvatting
   * @param {string} summary - De tekstuele inhoud van de samenvatting
   * @returns {Promise<number>} - ID van de opgeslagen samenvatting
   */
  async saveNarrativeSummary(date, summary) {
    try {
      if (!date || !summary) {
        throw new Error('Date and summary are required');
      }

      await this.ensureInitialized();
      const formattedDate = formatDateToYYYYMMDD(date);

      // Optimized existence check using index
      const existingResult = await this.safeGetAllAsync(
        `SELECT id FROM narrative_summaries WHERE date = ? LIMIT 1;`,
        [formattedDate],
      );

      if (existingResult.length > 0) {
        // Update bestaande samenvatting
        const id = existingResult[0].id;
        await this.run(
          `UPDATE narrative_summaries SET summary = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?;`,
          [summary, id],
        );
        return id;
      } else {
        // Voeg nieuwe samenvatting toe
        const result = await this.run(
          `INSERT INTO narrative_summaries (date, summary) VALUES (?, ?);`,
          [formattedDate, summary],
        );
        return result.lastInsertRowId;
      }
    } catch (error) {
      console.error('Error saving narrative summary:', error);
      throw error;
    }
  }

  /**
   * Haalt een narratieve samenvatting op voor een specifieke datum
   * @param {string|Date} date - De datum om op te halen
   * @returns {Promise<Object|null>} - De samenvatting of null indien niet gevonden
   */
  async getNarrativeSummary(date) {
    try {
      if (!date) {
        throw new Error('Date is required');
      }

      await this.ensureInitialized();
      const formattedDate = formatDateToYYYYMMDD(date);

      const result = await this.safeGetAllAsync(
        `SELECT id, date, summary, created_at FROM narrative_summaries WHERE date = ? LIMIT 1;`,
        [formattedDate],
      );

      if (result.length > 0) {
        return result[0];
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error retrieving narrative summary:', error);
      throw error;
    }
  }

  /**
   * Haalt alle narratieve samenvattingen op binnen een datumbereik
   * @param {string|Date} startDate - Begin van het datumbereik
   * @param {string|Date} endDate - Einde van het datumbereik
   * @returns {Promise<Array>} - Array met samenvattingen
   */
  async getSavedNarrativeSummaries(startDate, endDate) {
    try {
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }

      await this.ensureInitialized();
      const formattedStartDate = formatDateToYYYYMMDD(startDate);
      const formattedEndDate = formatDateToYYYYMMDD(endDate);

      return await this.safeGetAllAsync(
        `SELECT id, date, summary, created_at FROM narrative_summaries 
         WHERE date >= ? AND date <= ?
         ORDER BY date DESC;`,
        [formattedStartDate, formattedEndDate],
      );
    } catch (error) {
      console.error('Error retrieving narrative summaries:', error);
      throw error;
    }
  }

  /**
   * Verwijdert een narratieve samenvatting
   * @param {string|Date} date - De datum van de te verwijderen samenvatting
   * @returns {Promise<boolean>} - True als verwijdering succesvol was
   */
  async deleteNarrativeSummary(date) {
    try {
      if (!date) {
        throw new Error('Date is required');
      }

      await this.ensureInitialized();
      const formattedDate = formatDateToYYYYMMDD(date);

      const result = await this.run(
        `DELETE FROM narrative_summaries WHERE date = ?;`,
        [formattedDate],
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting narrative summary:', error);
      throw error;
    }
  }

  // Sports/Workout specific methods with migration awareness
  async getActivitiesByType(type, startDate, endDate) {
    await this.ensureInitialized();

    try {
      // Try modern select with all columns first
      return await this.safeGetAllAsync(
        `SELECT id, type, start_time, end_time, duration, source, calories, distance, sport_type, strava_id, heart_rate_avg, heart_rate_max, elevation_gain, metadata, details
         FROM activities
         WHERE type = ? AND start_time >= ? AND start_time <= ?
         ORDER BY start_time DESC`,
        [type, startDate, endDate],
      );
    } catch (error) {
      // If select fails due to missing columns, try basic select
      if (error.message && error.message.includes('no such column')) {
        return await this.safeGetAllAsync(
          `SELECT id, type, start_time, end_time, duration, details
           FROM activities
           WHERE type = ? AND start_time >= ? AND start_time <= ?
           ORDER BY start_time DESC`,
          [type, startDate, endDate],
        );
      } else {
        throw error;
      }
    }
  }

  // Get sports activities with detailed filtering and migration awareness
  async getSportsActivities(startDate, endDate, sportType = null) {
    await this.ensureInitialized();

    try {
      // Try modern select with all columns first
      let query = `
        SELECT id, type, start_time, end_time, duration, source, calories, distance, sport_type, strava_id, heart_rate_avg, heart_rate_max, elevation_gain, metadata, details
        FROM activities
        WHERE (type = 'workout' OR type = 'strava_workout' OR sport_type IS NOT NULL)
        AND start_time >= ? AND start_time <= ?
      `;

      const params = [startDate, endDate];

      if (sportType) {
        query += ` AND sport_type = ?`;
        params.push(sportType);
      }

      query += ` ORDER BY start_time DESC`;

      return await this.safeGetAllAsync(query, params);
    } catch (error) {
      // If select fails due to missing columns, try basic select with type filtering only
      if (error.message && error.message.includes('no such column')) {
        let fallbackQuery = `
          SELECT id, type, start_time, end_time, duration, details
          FROM activities
          WHERE (type = 'workout' OR type = 'strava_workout')
          AND start_time >= ? AND start_time <= ?
          ORDER BY start_time DESC
        `;

        return await this.safeGetAllAsync(fallbackQuery, [startDate, endDate]);
      } else {
        throw error;
      }
    }
  }

  // Get activity statistics for sports with migration awareness
  async getSportsStats(startDate, endDate) {
    await this.ensureInitialized();

    try {
      // Try modern select with all sports columns
      const stats = await this.safeGetAllAsync(
        `
        SELECT 
          sport_type,
          COUNT(*) as activity_count,
          SUM(duration) as total_duration,
          SUM(calories) as total_calories,
          SUM(distance) as total_distance,
          AVG(duration) as avg_duration,
          AVG(calories) as avg_calories,
          MAX(heart_rate_max) as max_heart_rate,
          SUM(elevation_gain) as total_elevation
        FROM activities
        WHERE (type = 'workout' OR type = 'strava_workout' OR sport_type IS NOT NULL)
          AND start_time >= ? AND start_time <= ?
        GROUP BY sport_type
        ORDER BY total_duration DESC
      `,
        [startDate, endDate],
      );

      return stats;
    } catch (error) {
      // If select fails due to missing columns, return basic stats
      if (error.message && error.message.includes('no such column')) {
        const stats = await this.safeGetAllAsync(
          `
          SELECT 
            type,
            COUNT(*) as activity_count,
            SUM(duration) as total_duration
          FROM activities
          WHERE (type = 'workout' OR type = 'strava_workout')
            AND start_time >= ? AND start_time <= ?
          GROUP BY type
          ORDER BY total_duration DESC
        `,
          [startDate, endDate],
        );

        return stats;
      } else {
        throw error;
      }
    }
  }

  // Get workout summary for a specific date range with migration awareness
  async getWorkoutSummary(startDate, endDate) {
    await this.ensureInitialized();

    try {
      // Try modern select with sports columns
      const summary = await this.safeGetAllAsync(
        `
        SELECT 
          date(start_time/1000, 'unixepoch') as workout_date,
          SUM(duration) as daily_duration,
          SUM(calories) as daily_calories,
          SUM(distance) as daily_distance,
          COUNT(*) as daily_activities
        FROM activities
        WHERE (type = 'workout' OR type = 'strava_workout' OR sport_type IS NOT NULL)
          AND start_time >= ? AND start_time <= ?
        GROUP BY date(start_time/1000, 'unixepoch')
        ORDER BY workout_date DESC
      `,
        [startDate, endDate],
      );

      return summary;
    } catch (error) {
      // If select fails due to missing columns, return basic summary
      if (error.message && error.message.includes('no such column')) {
        const summary = await this.safeGetAllAsync(
          `
          SELECT 
            date(start_time/1000, 'unixepoch') as workout_date,
            SUM(duration) as daily_duration,
            COUNT(*) as daily_activities
          FROM activities
          WHERE (type = 'workout' OR type = 'strava_workout')
            AND start_time >= ? AND start_time <= ?
          GROUP BY date(start_time/1000, 'unixepoch')
          ORDER BY workout_date DESC
        `,
          [startDate, endDate],
        );

        return summary;
      } else {
        throw error;
      }
    }
  }

  // User Daily Notes Methods
  async saveUserNote(date, noteText, timestamp = null) {
    try {
      await this.ensureInitialized();
      const noteTimestamp = timestamp || Date.now();
      const dateStr = formatDateToYYYYMMDD(date);
      
      await this.run(
        `INSERT INTO user_daily_notes (date, note_text, timestamp) VALUES (?, ?, ?)`,
        [dateStr, noteText, noteTimestamp]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error saving user note:', error);
      throw error;
    }
  }

  async getUserNotesForDate(date) {
    try {
      await this.ensureInitialized();
      const dateStr = formatDateToYYYYMMDD(date);
      
      const notes = await this.getAll(
        `SELECT * FROM user_daily_notes 
         WHERE date = ? 
         ORDER BY timestamp ASC`,
        [dateStr]
      );
      
      return notes.map(note => ({
        id: note.id,
        text: note.note_text,
        timestamp: note.timestamp,
        timeAdded: new Date(note.created_at).toLocaleTimeString('nl-NL', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));
    } catch (error) {
      console.error('Error getting user notes:', error);
      return [];
    }
  }

  async updateUserNote(noteId, newText) {
    try {
      await this.ensureInitialized();
      
      await this.run(
        `UPDATE user_daily_notes 
         SET note_text = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newText, noteId]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user note:', error);
      throw error;
    }
  }

  async deleteUserNote(noteId) {
    try {
      await this.ensureInitialized();
      
      await this.run(
        `DELETE FROM user_daily_notes WHERE id = ?`,
        [noteId]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting user note:', error);
      throw error;
    }
  }

  async getUserNotesForDateRange(startDate, endDate) {
    try {
      await this.ensureInitialized();
      const startDateStr = formatDateToYYYYMMDD(startDate);
      const endDateStr = formatDateToYYYYMMDD(endDate);
      
      const notes = await this.getAll(
        `SELECT date, note_text, timestamp, created_at 
         FROM user_daily_notes 
         WHERE date BETWEEN ? AND ? 
         ORDER BY date DESC, timestamp ASC`,
        [startDateStr, endDateStr]
      );
      
      // Group by date
      const notesByDate = {};
      notes.forEach(note => {
        if (!notesByDate[note.date]) {
          notesByDate[note.date] = [];
        }
        notesByDate[note.date].push({
          text: note.note_text,
          timestamp: note.timestamp,
          timeAdded: new Date(note.created_at).toLocaleTimeString('nl-NL', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        });
      });
      
      return notesByDate;
    } catch (error) {
      console.error('Error getting user notes for date range:', error);
      return {};
    }
  }

  // Migration 5: Add Strava integration tables
  async migrateTo5() {
    try {
      await this.log('Starting migration to version 5: Adding Strava integration tables');

      // Create tables first (non-destructive)
      try {
        await this.execAsync(`
          CREATE TABLE IF NOT EXISTS athlete_profiles (
            athlete_id INTEGER PRIMARY KEY,
            username TEXT,
            firstname TEXT,
            lastname TEXT,
            profile_url TEXT,
            avatar_url TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            sex TEXT,
            premium INTEGER DEFAULT 0,
            summit INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )
        `);

        await this.execAsync(`
          CREATE TABLE IF NOT EXISTS sync_state (
            service TEXT PRIMARY KEY,
            last_sync_timestamp INTEGER DEFAULT 0,
            initial_sync_complete INTEGER DEFAULT 0,
            sync_count INTEGER DEFAULT 0,
            last_error TEXT,
            error_count INTEGER DEFAULT 0,
            updated_at INTEGER NOT NULL
          )
        `);
      } catch (tableError) {
        await this.warn('Could not create Strava tables', tableError);
        // Continue - tables might already exist
      }

      // Add columns in batches with error handling for each batch
      const columnBatches = [
        // Batch 1: Core columns
        [
          ['startTime', 'INTEGER'],
          ['endTime', 'INTEGER'],
          ['created_at', 'INTEGER DEFAULT 0'],
          ['updated_at', 'INTEGER DEFAULT 0']
        ],
        // Batch 2: Speed and power metrics
        [
          ['average_speed', 'REAL DEFAULT 0'],
          ['max_speed', 'REAL DEFAULT 0'],
          ['average_cadence', 'REAL DEFAULT 0'],
          ['average_watts', 'REAL DEFAULT 0'],
          ['max_watts', 'REAL DEFAULT 0'],
          ['kilojoules', 'REAL DEFAULT 0'],
          ['device_watts', 'INTEGER DEFAULT 0']
        ],
        // Batch 3: Health and elevation metrics
        [
          ['has_heartrate', 'INTEGER DEFAULT 0'],
          ['elev_high', 'REAL DEFAULT 0'],
          ['elev_low', 'REAL DEFAULT 0']
        ],
        // Batch 4: Social and achievement metrics
        [
          ['pr_count', 'INTEGER DEFAULT 0'],
          ['achievement_count', 'INTEGER DEFAULT 0'],
          ['kudos_count', 'INTEGER DEFAULT 0'],
          ['comment_count', 'INTEGER DEFAULT 0'],
          ['athlete_count', 'INTEGER DEFAULT 0'],
          ['photo_count', 'INTEGER DEFAULT 0']
        ],
        // Batch 5: Activity metadata
        [
          ['trainer', 'INTEGER DEFAULT 0'],
          ['commute', 'INTEGER DEFAULT 0'],
          ['manual', 'INTEGER DEFAULT 0'],
          ['private', 'INTEGER DEFAULT 0'],
          ['visibility', 'TEXT'],
          ['flagged', 'INTEGER DEFAULT 0'],
          ['gear_id', 'TEXT']
        ],
        // Batch 6: Location and external data
        [
          ['start_latitude', 'REAL'],
          ['start_longitude', 'REAL'],
          ['end_latitude', 'REAL'],
          ['end_longitude', 'REAL'],
          ['external_id', 'TEXT'],
          ['upload_id', 'TEXT']
        ],
        // Batch 7: Advanced metrics
        [
          ['weighted_average_watts', 'REAL DEFAULT 0'],
          ['suffer_score', 'REAL DEFAULT 0'],
          ['workout_type', 'INTEGER'],
          ['description', 'TEXT']
        ]
      ];

      // Process batches with individual error handling
      for (let i = 0; i < columnBatches.length; i++) {
        try {
          for (const [columnName, columnDefinition] of columnBatches[i]) {
            await this.addColumnIfNotExists('activities', columnName, columnDefinition);
          }
          await this.log(`Migration batch ${i + 1}/${columnBatches.length} completed`);
        } catch (batchError) {
          await this.warn(`Migration batch ${i + 1} failed, continuing...`, batchError);
          // Continue with next batch
        }
      }

      // Create indexes (non-critical)
      try {
        await this.execAsync('CREATE INDEX IF NOT EXISTS idx_activities_strava_id ON activities(strava_id)');
        await this.execAsync('CREATE INDEX IF NOT EXISTS idx_activities_source ON activities(source)');
        await this.execAsync('CREATE INDEX IF NOT EXISTS idx_activities_sport_type ON activities(sport_type)');
        await this.execAsync('CREATE INDEX IF NOT EXISTS idx_activities_startTime ON activities(startTime)');
        await this.execAsync('CREATE INDEX IF NOT EXISTS idx_activities_source_start ON activities(source, startTime)');
        await this.execAsync('CREATE INDEX IF NOT EXISTS idx_sync_state_service ON sync_state(service)');
        await this.execAsync('CREATE INDEX IF NOT EXISTS idx_athlete_profiles_athlete_id ON athlete_profiles(athlete_id)');
      } catch (indexError) {
        await this.warn('Some indexes could not be created', indexError);
        // Non-critical - continue
      }

      await this.log('Migration to version 5 completed (with possible partial failures)');
    } catch (error) {
      await this.error('Migration to version 5 failed', error);
      // Don't throw - database is still usable
    }
  }

  // Helper method to add column if it doesn't exist
  async addColumnIfNotExists(tableName, columnName, columnDefinition) {
    try {
      // Check if column exists
      const tableInfo = await this.getAll(`PRAGMA table_info(${tableName})`);
      const columnExists = tableInfo.some(col => col.name === columnName);
      
      if (!columnExists) {
        await this.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
        await this.log(`Added column ${columnName} to ${tableName}`);
      }
    } catch (error) {
      // Column might already exist or other constraint, log but don't fail
      await this.warn(`Could not add column ${columnName} to ${tableName}`, error);
    }
  }

  // ----- STRAVA INTEGRATION METHODS -----

  /**
   * Save Strava activity to database
   * @param {Object} activityData - Strava activity data
   * @returns {Promise<number>} - Insert ID
   */
  async saveStravaActivity(activityData) {
    try {
      await this.ensureInitialized();
      
      const query = `
        INSERT OR REPLACE INTO activities 
        (strava_id, type, start_time, end_time, duration, details, source, 
         calories, distance, sport_type, heart_rate_avg, heart_rate_max, 
         elevation_gain, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await this.run(query, [
        activityData.strava_id,
        'strava_workout',
        activityData.start_date ? new Date(activityData.start_date).getTime() : activityData.start_time,
        activityData.start_date ? new Date(activityData.start_date).getTime() + (activityData.moving_time * 1000) : activityData.end_time,
        activityData.moving_time ? Math.round(activityData.moving_time / 60) : activityData.duration, // minutes
        activityData.name || activityData.details || '',
        'strava',
        activityData.calories || 0,
        activityData.distance || 0, // meters
        activityData.sport_type || activityData.type?.toLowerCase() || 'workout',
        activityData.average_heartrate || activityData.heart_rate_avg || null,
        activityData.max_heartrate || activityData.heart_rate_max || null,
        activityData.total_elevation_gain || activityData.elevation_gain || 0,
        JSON.stringify(activityData.metadata || activityData),
        Date.now(),
        Date.now()
      ]);
      
      return result.insertId;
    } catch (error) {
      await this.error('Error saving Strava activity', error);
      throw error;
    }
  }

  /**
   * Save Strava athlete profile to database
   * @param {Object} athleteData - Strava athlete data
   * @returns {Promise<number>} - Insert ID
   */
  async saveStravaAthlete(athleteData) {
    try {
      await this.ensureInitialized();
      
      // Create athlete_profiles table if it doesn't exist
      await this.execAsync(`
        CREATE TABLE IF NOT EXISTS athlete_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          strava_id INTEGER UNIQUE,
          username TEXT,
          firstname TEXT,
          lastname TEXT,
          bio TEXT,
          city TEXT,
          state TEXT,
          country TEXT,
          sex TEXT,
          premium BOOLEAN,
          summit BOOLEAN,
          created_at TEXT,
          updated_at TEXT,
          badge_type_id INTEGER,
          weight REAL,
          profile_medium TEXT,
          profile TEXT,
          friend TEXT,
          follower TEXT,
          follower_count INTEGER,
          friend_count INTEGER,
          mutual_friend_count INTEGER,
          athlete_type INTEGER,
          date_preference TEXT,
          measurement_preference TEXT,
          clubs TEXT,
          ftp INTEGER,
          sync_date TEXT
        )
      `);
      
      const query = `
        INSERT OR REPLACE INTO athlete_profiles 
        (strava_id, username, firstname, lastname, bio, city, state, country, 
         sex, premium, summit, created_at, updated_at, badge_type_id, weight,
         profile_medium, profile, friend, follower, follower_count, friend_count,
         mutual_friend_count, athlete_type, date_preference, measurement_preference,
         clubs, ftp, sync_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await this.run(query, [
        athleteData.strava_id,
        athleteData.username,
        athleteData.firstname,
        athleteData.lastname,
        athleteData.bio,
        athleteData.city,
        athleteData.state,
        athleteData.country,
        athleteData.sex,
        athleteData.premium ? 1 : 0,
        athleteData.summit ? 1 : 0,
        athleteData.created_at,
        athleteData.updated_at,
        athleteData.badge_type_id,
        athleteData.weight,
        athleteData.profile_medium,
        athleteData.profile,
        athleteData.friend,
        athleteData.follower,
        athleteData.follower_count,
        athleteData.friend_count,
        athleteData.mutual_friend_count,
        athleteData.athlete_type,
        athleteData.date_preference,
        athleteData.measurement_preference,
        athleteData.clubs,
        athleteData.ftp,
        athleteData.sync_date
      ]);
      
      return result.insertId;
    } catch (error) {
      await this.error('Error saving Strava athlete', error);
      throw error;
    }
  }

  /**
   * Get Strava activities from database
   * @param {number} limit - Number of activities to retrieve
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - Array of Strava activities
   */
  async getStravaActivities(limit = 50, offset = 0) {
    try {
      await this.ensureInitialized();
      
      const query = `
        SELECT * FROM activities 
        WHERE source = 'strava' 
        ORDER BY start_time DESC 
        LIMIT ? OFFSET ?
      `;
      
      const activities = await this.safeGetAllAsync(query, [limit, offset]);
      
      // Parse metadata for each activity
      return activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {}
      }));
    } catch (error) {
      await this.error('Error getting Strava activities', error);
      return [];
    }
  }

  /**
   * Get Strava analytics for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Analytics data
   */
  async getStravaAnalytics(startDate, endDate) {
    try {
      await this.ensureInitialized();
      
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();
      
      // Get total activities
      const totalActivitiesResult = await this.safeGetAllAsync(
        `SELECT COUNT(*) as count FROM activities 
         WHERE source = 'strava' AND start_time >= ? AND start_time <= ?`,
        [startTimestamp, endTimestamp]
      );
      
      // Get total distance
      const totalDistanceResult = await this.safeGetAllAsync(
        `SELECT SUM(distance) as total_distance FROM activities 
         WHERE source = 'strava' AND start_time >= ? AND start_time <= ? AND distance > 0`,
        [startTimestamp, endTimestamp]
      );
      
      // Get total moving time
      const totalTimeResult = await this.safeGetAllAsync(
        `SELECT SUM(duration) as total_time FROM activities 
         WHERE source = 'strava' AND start_time >= ? AND start_time <= ?`,
        [startTimestamp, endTimestamp]
      );
      
      // Get total elevation gain
      const totalElevationResult = await this.safeGetAllAsync(
        `SELECT SUM(elevation_gain) as total_elevation FROM activities 
         WHERE source = 'strava' AND start_time >= ? AND start_time <= ? AND elevation_gain > 0`,
        [startTimestamp, endTimestamp]
      );
      
      // Get activity types
      const activityTypesResult = await this.safeGetAllAsync(
        `SELECT sport_type, COUNT(*) as count, SUM(distance) as total_distance, SUM(duration) as total_time
         FROM activities 
         WHERE source = 'strava' AND start_time >= ? AND start_time <= ?
         GROUP BY sport_type
         ORDER BY count DESC`,
        [startTimestamp, endTimestamp]
      );
      
      // Get weekly trends
      const weeklyTrendsResult = await this.safeGetAllAsync(
        `SELECT 
           DATE(start_time/1000, 'unixepoch', 'weekday 1', '-6 days') as week_start,
           COUNT(*) as activity_count,
           SUM(distance) as total_distance,
           SUM(duration) as total_time
         FROM activities 
         WHERE source = 'strava' AND start_time >= ? AND start_time <= ?
         GROUP BY week_start
         ORDER BY week_start`,
        [startTimestamp, endTimestamp]
      );
      
      const totalActivities = totalActivitiesResult[0]?.count || 0;
      const totalDistance = totalDistanceResult[0]?.total_distance || 0;
      const totalMovingTime = totalTimeResult[0]?.total_time || 0;
      const totalElevationGain = totalElevationResult[0]?.total_elevation || 0;
      
      return {
        totalActivities,
        totalDistance: Math.round(totalDistance),
        totalMovingTime: Math.round(totalMovingTime),
        totalElevationGain: Math.round(totalElevationGain),
        averageDistance: totalActivities > 0 ? Math.round(totalDistance / totalActivities) : 0,
        averageMovingTime: totalActivities > 0 ? Math.round(totalMovingTime / totalActivities) : 0,
        activityTypes: activityTypesResult.reduce((acc, type) => {
          acc[type.sport_type] = {
            count: type.count,
            totalDistance: Math.round(type.total_distance || 0),
            totalTime: Math.round(type.total_time || 0)
          };
          return acc;
        }, {}),
        weeklyTrends: weeklyTrendsResult.map(week => ({
          weekStart: week.week_start,
          activityCount: week.activity_count,
          totalDistance: Math.round(week.total_distance || 0),
          totalTime: Math.round(week.total_time || 0)
        }))
      };
    } catch (error) {
      await this.error('Error getting Strava analytics', error);
      return {
        totalActivities: 0,
        totalDistance: 0,
        totalMovingTime: 0,
        totalElevationGain: 0,
        averageDistance: 0,
        averageMovingTime: 0,
        activityTypes: {},
        weeklyTrends: []
      };
    }
  }

  /**
   * Clear all Strava data from database
   * @returns {Promise<boolean>} - Success status
   */
  async clearStravaData() {
    try {
      await this.ensureInitialized();
      
      // Delete Strava activities
      await this.run(`DELETE FROM activities WHERE source = 'strava'`);
      
      // Delete athlete profiles if table exists
      try {
        await this.run(`DELETE FROM athlete_profiles`);
      } catch (error) {
        // Table might not exist, ignore
      }
      
      // Delete Strava sync state
      await this.run(`DELETE FROM sync_state WHERE service = 'strava'`);
      
      await this.log('Cleared all Strava data from database');
      return true;
    } catch (error) {
      await this.error('Error clearing Strava data', error);
      return false;
    }
  }

  /**
   * Get Strava activities for narrative generation
   * @param {number} startTimestamp - Start timestamp
   * @param {number} endTimestamp - End timestamp
   * @returns {Promise<Array>} - Array of Strava activities
   */
  async getStravaActivitiesForNarrative(startTimestamp, endTimestamp) {
    try {
      await this.ensureInitialized();
      
      const query = `
        SELECT * FROM activities 
        WHERE source = 'strava' 
        AND start_time >= ? AND start_time <= ?
        ORDER BY start_time DESC
      `;
      
      const activities = await this.safeGetAllAsync(query, [startTimestamp, endTimestamp]);
      
      // Parse metadata and format for narrative
      return activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
        formattedDuration: this.formatDuration(activity.duration || 0),
        formattedDistance: this.formatDistance(activity.distance || 0),
        formattedDate: new Date(activity.start_time).toLocaleDateString('nl-NL')
      }));
    } catch (error) {
      await this.error('Error getting Strava activities for narrative', error);
      return [];
    }
  }

  /**
   * Format duration in minutes to human readable format
   * @param {number} minutes - Duration in minutes
   * @returns {string} - Formatted duration
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}u ${remainingMinutes}min` : `${hours}u`;
  }

  /**
   * Format distance in meters to human readable format
   * @param {number} meters - Distance in meters
   * @returns {string} - Formatted distance
   */
  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    const kilometers = (meters / 1000).toFixed(1);
    return `${kilometers}km`;
  }
}

// Singleton instance
const databaseService = new DatabaseService();
export default databaseService;
