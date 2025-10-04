import databaseConnection from '../core/DatabaseConnection';
import { formatDateToYYYYMMDD } from '../../utils/formatters';
import performanceService from '../../services/performanceService';

/**
 * Repository for app usage-related database operations
 * Handles app_usage table CRUD operations
 */
class AppUsageRepository {
  constructor() {
    this.connection = databaseConnection;
  }

  async addAppUsage(usage) {
    const start = performanceService?.startTracking?.('db.addAppUsage');

    try {
      const result = await this.connection.run(
        `INSERT INTO app_usage (app_name, package_name, category, duration, timestamp, session_date, source) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          usage.app_name,
          usage.package_name,
          usage.category,
          usage.duration,
          usage.timestamp,
          usage.session_date,
          usage.source || 'manual',
        ],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getAppUsageForDate(date) {
    const start = performanceService?.startTracking?.('db.getAppUsageForDate');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const usage = await this.connection.getAll(
        `SELECT * FROM app_usage 
         WHERE session_date = ? 
         ORDER BY duration DESC`,
        [dateString],
      );

      performanceService?.endTracking?.(start);
      return usage;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getAppUsageForDateRange(startDate, endDate) {
    const start = performanceService?.startTracking?.('db.getAppUsageForDateRange');

    try {
      const startDateString = formatDateToYYYYMMDD(startDate);
      const endDateString = formatDateToYYYYMMDD(endDate);

      const usage = await this.connection.getAll(
        `SELECT * FROM app_usage 
         WHERE session_date >= ? AND session_date <= ? 
         ORDER BY session_date DESC, duration DESC`,
        [startDateString, endDateString],
      );

      performanceService?.endTracking?.(start);
      return usage;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getTopAppsForDate(date, limit = 10) {
    const start = performanceService?.startTracking?.('db.getTopAppsForDate');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const topApps = await this.connection.getAll(
        `SELECT 
           app_name,
           package_name,
           category,
           SUM(duration) as total_duration,
           COUNT(*) as session_count
         FROM app_usage 
         WHERE session_date = ? 
         GROUP BY app_name, package_name
         ORDER BY total_duration DESC 
         LIMIT ?`,
        [dateString, limit],
      );

      performanceService?.endTracking?.(start);
      return topApps;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getAppUsageStats(date) {
    const start = performanceService?.startTracking?.('db.getAppUsageStats');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const stats = await this.connection.getFirst(
        `SELECT 
           COUNT(DISTINCT app_name) as unique_apps,
           SUM(duration) as total_screen_time,
           COUNT(*) as total_sessions,
           AVG(duration) as avg_session_duration
         FROM app_usage 
         WHERE session_date = ?`,
        [dateString],
      );

      const categoryStats = await this.connection.getAll(
        `SELECT 
           category,
           SUM(duration) as total_duration,
           COUNT(*) as session_count
         FROM app_usage 
         WHERE session_date = ? AND category IS NOT NULL
         GROUP BY category
         ORDER BY total_duration DESC`,
        [dateString],
      );

      performanceService?.endTracking?.(start);
      return {
        ...stats,
        category_breakdown: categoryStats,
      };
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getAppTrends(appName, days = 7) {
    const start = performanceService?.startTracking?.('db.getAppTrends');

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends = await this.connection.getAll(
        `SELECT 
           session_date,
           SUM(duration) as total_duration,
           COUNT(*) as session_count
         FROM app_usage 
         WHERE app_name = ? 
         AND session_date >= ? AND session_date <= ?
         GROUP BY session_date
         ORDER BY session_date ASC`,
        [appName, formatDateToYYYYMMDD(startDate), formatDateToYYYYMMDD(endDate)],
      );

      performanceService?.endTracking?.(start);
      return trends;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async deleteAppUsage(id) {
    const start = performanceService?.startTracking?.('db.deleteAppUsage');

    try {
      const result = await this.connection.run(
        `DELETE FROM app_usage WHERE id = ?`,
        [id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async deleteAppUsageForDate(date) {
    const start = performanceService?.startTracking?.('db.deleteAppUsageForDate');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const result = await this.connection.run(
        `DELETE FROM app_usage WHERE session_date = ?`,
        [dateString],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getWeeklyUsageStats(startDate) {
    const start = performanceService?.startTracking?.('db.getWeeklyUsageStats');

    try {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      const weeklyStats = await this.connection.getAll(
        `SELECT 
           session_date,
           SUM(duration) as daily_total,
           COUNT(DISTINCT app_name) as unique_apps,
           COUNT(*) as session_count
         FROM app_usage 
         WHERE session_date >= ? AND session_date <= ?
         GROUP BY session_date
         ORDER BY session_date ASC`,
        [formatDateToYYYYMMDD(startDate), formatDateToYYYYMMDD(endDate)],
      );

      performanceService?.endTracking?.(start);
      return weeklyStats;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }
}

const appUsageRepository = new AppUsageRepository();
export default appUsageRepository;