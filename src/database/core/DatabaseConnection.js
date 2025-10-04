import SQLite from 'react-native-sqlite-2';
import BaseService from '../../services/BaseService';

/**
 * Core database connection and base operations
 * Provides a foundation for all repository classes
 */
class DatabaseConnection extends BaseService {
  constructor() {
    super('DatabaseConnection');
    this.db = null;
  }

  async onInitialize() {
    if (this.db) {
      return; // Already initialized
    }

    // Open the database
    this.db = SQLite.openDatabase(
      'minakami.db',
      '1.0',
      'Minakami Database',
      200000,
    );

    await this.log('Database connection initialized successfully');
  }

  /**
   * Get the database instance
   */
  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
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

  async requestStoragePermissions() {
    // iOS doesn't need specific permissions for SQLite
    return true;
  }
}

// Singleton instance
const databaseConnection = new DatabaseConnection();
export default databaseConnection;