import databaseConnection from './DatabaseConnection';

/**
 * Database migrations and schema management
 * Separated from main database service for clarity
 */
class DatabaseMigrations {
  constructor() {
    this.connection = databaseConnection;
  }

  async initializeTables() {
    const db = this.connection.getDatabase();
    
    await new Promise((resolve, reject) => {
      db.transaction(
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
  }

  async runMigrations() {
    const db = this.connection.getDatabase();
    
    await new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          // Migration 1: Add missing columns to activities table
          tx.executeSql(
            `ALTER TABLE activities ADD COLUMN strava_id TEXT`,
            [],
            () => {},
            () => {} // Ignore if column exists
          );
          
          tx.executeSql(
            `ALTER TABLE activities ADD COLUMN heart_rate_avg INTEGER`,
            [],
            () => {},
            () => {}
          );
          
          tx.executeSql(
            `ALTER TABLE activities ADD COLUMN heart_rate_max INTEGER`,
            [],
            () => {},
            () => {}
          );
          
          tx.executeSql(
            `ALTER TABLE activities ADD COLUMN elevation_gain REAL DEFAULT 0`,
            [],
            () => {},
            () => {}
          );

          // Migration 2: Add missing columns to locations table
          tx.executeSql(
            `ALTER TABLE locations ADD COLUMN visit_count INTEGER DEFAULT 1`,
            [],
            () => {},
            () => {}
          );
          
          tx.executeSql(
            `ALTER TABLE locations ADD COLUMN last_visited INTEGER`,
            [],
            () => {},
            () => {}
          );

          // Migration 3: Add missing columns to call_logs table
          tx.executeSql(
            `ALTER TABLE call_logs ADD COLUMN is_analyzed BOOLEAN DEFAULT 0`,
            [],
            () => {},
            () => {}
          );

          // Migration 4: Add missing columns to app_usage table
          tx.executeSql(
            `ALTER TABLE app_usage ADD COLUMN source TEXT DEFAULT 'manual'`,
            [],
            () => {},
            () => {}
          );
        },
        error => {
          console.warn('Migration warning (expected for new installs):', error);
          resolve(); // Continue on migration errors - they're often expected
        },
        resolve,
      );
    });
  }

  async createPerformanceIndexes() {
    const db = this.connection.getDatabase();
    
    await new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          // Indexes for activities table
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities(start_time)`);
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`);
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_activities_source ON activities(source)`);
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_activities_strava_id ON activities(strava_id)`);

          // Indexes for locations table
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations(timestamp)`);
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude)`);

          // Indexes for call_logs table
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_call_logs_date ON call_logs(call_date)`);
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_call_logs_type ON call_logs(call_type)`);

          // Indexes for daily_summaries table
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date)`);

          // Indexes for narrative_summaries table
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_narrative_summaries_date ON narrative_summaries(date)`);

          // Indexes for user_daily_notes table
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_user_daily_notes_date ON user_daily_notes(date)`);
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_user_daily_notes_timestamp ON user_daily_notes(timestamp)`);

          // Indexes for app_usage table
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_app_usage_date ON app_usage(session_date)`);
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_app_usage_app_name ON app_usage(app_name)`);
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_app_usage_timestamp ON app_usage(timestamp)`);
        },
        reject,
        resolve,
      );
    });
  }

  async initializeDatabase() {
    await this.connection.initialize();
    await this.initializeTables();
    
    try {
      await this.runMigrations();
    } catch (migrationError) {
      console.warn('Migration failed, but database is functional', migrationError);
    }

    try {
      await this.createPerformanceIndexes();
    } catch (indexError) {
      console.warn('Performance indexes creation failed', indexError);
    }
  }
}

const databaseMigrations = new DatabaseMigrations();
export default databaseMigrations;