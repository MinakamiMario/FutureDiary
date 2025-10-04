import databaseConnection from '../core/DatabaseConnection';
import { formatDateToYYYYMMDD } from '../../utils/formatters';
import performanceService from '../../services/performanceService';

/**
 * Repository for call log-related database operations
 * Handles call_logs table CRUD operations
 */
class CallLogRepository {
  constructor() {
    this.connection = databaseConnection;
  }

  async addCallLog(callLog) {
    const start = performanceService?.startTracking?.('db.addCallLog');

    try {
      const result = await this.connection.run(
        `INSERT INTO call_logs (phone_number, contact_name, call_type, call_date, duration, is_analyzed) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          callLog.phone_number,
          callLog.contact_name,
          callLog.call_type,
          callLog.call_date,
          callLog.duration,
          callLog.is_analyzed || 0,
        ],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getCallLogsForDate(date) {
    const start = performanceService?.startTracking?.('db.getCallLogsForDate');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const startOfDay = new Date(dateString + 'T00:00:00').getTime();
      const endOfDay = new Date(dateString + 'T23:59:59').getTime();

      const callLogs = await this.connection.getAll(
        `SELECT * FROM call_logs 
         WHERE call_date >= ? AND call_date <= ? 
         ORDER BY call_date DESC`,
        [startOfDay, endOfDay],
      );

      performanceService?.endTracking?.(start);
      return callLogs;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getCallLogsForDateRange(startDate, endDate) {
    const start = performanceService?.startTracking?.('db.getCallLogsForDateRange');

    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      const callLogs = await this.connection.getAll(
        `SELECT * FROM call_logs 
         WHERE call_date >= ? AND call_date <= ? 
         ORDER BY call_date DESC`,
        [startTimestamp, endTimestamp],
      );

      performanceService?.endTracking?.(start);
      return callLogs;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getRecentCallLogs(limit = 20) {
    const start = performanceService?.startTracking?.('db.getRecentCallLogs');

    try {
      const callLogs = await this.connection.getAll(
        `SELECT * FROM call_logs 
         ORDER BY call_date DESC 
         LIMIT ?`,
        [limit],
      );

      performanceService?.endTracking?.(start);
      return callLogs;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getCallLogsByType(callType, limit = 50) {
    const start = performanceService?.startTracking?.('db.getCallLogsByType');

    try {
      const callLogs = await this.connection.getAll(
        `SELECT * FROM call_logs 
         WHERE call_type = ? 
         ORDER BY call_date DESC 
         LIMIT ?`,
        [callType, limit],
      );

      performanceService?.endTracking?.(start);
      return callLogs;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getCallLogsByContact(contactName, limit = 50) {
    const start = performanceService?.startTracking?.('db.getCallLogsByContact');

    try {
      const callLogs = await this.connection.getAll(
        `SELECT * FROM call_logs 
         WHERE contact_name = ? 
         ORDER BY call_date DESC 
         LIMIT ?`,
        [contactName, limit],
      );

      performanceService?.endTracking?.(start);
      return callLogs;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async markCallLogAsAnalyzed(id) {
    const start = performanceService?.startTracking?.('db.markCallLogAsAnalyzed');

    try {
      const result = await this.connection.run(
        `UPDATE call_logs SET is_analyzed = 1 WHERE id = ?`,
        [id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getUnanalyzedCallLogs(limit = 100) {
    const start = performanceService?.startTracking?.('db.getUnanalyzedCallLogs');

    try {
      const callLogs = await this.connection.getAll(
        `SELECT * FROM call_logs 
         WHERE is_analyzed = 0 
         ORDER BY call_date DESC 
         LIMIT ?`,
        [limit],
      );

      performanceService?.endTracking?.(start);
      return callLogs;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getCallStats(date) {
    const start = performanceService?.startTracking?.('db.getCallStats');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const startOfDay = new Date(dateString + 'T00:00:00').getTime();
      const endOfDay = new Date(dateString + 'T23:59:59').getTime();

      const stats = await this.connection.getFirst(
        `SELECT 
           COUNT(*) as total_calls,
           COUNT(CASE WHEN call_type = 'outgoing' THEN 1 END) as outgoing_calls,
           COUNT(CASE WHEN call_type = 'incoming' THEN 1 END) as incoming_calls,
           COUNT(CASE WHEN call_type = 'missed' THEN 1 END) as missed_calls,
           SUM(duration) as total_talk_time,
           AVG(duration) as avg_call_duration,
           COUNT(DISTINCT contact_name) as unique_contacts
         FROM call_logs 
         WHERE call_date >= ? AND call_date <= ?`,
        [startOfDay, endOfDay],
      );

      const mostCalledContact = await this.connection.getFirst(
        `SELECT contact_name, COUNT(*) as call_count 
         FROM call_logs 
         WHERE call_date >= ? AND call_date <= ? 
         AND contact_name IS NOT NULL 
         GROUP BY contact_name 
         ORDER BY call_count DESC 
         LIMIT 1`,
        [startOfDay, endOfDay],
      );

      performanceService?.endTracking?.(start);
      return {
        ...stats,
        most_called_contact: mostCalledContact?.contact_name || 'None',
        most_called_count: mostCalledContact?.call_count || 0,
      };
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getTopContacts(startDate, endDate, limit = 10) {
    const start = performanceService?.startTracking?.('db.getTopContacts');

    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      const topContacts = await this.connection.getAll(
        `SELECT 
           contact_name,
           COUNT(*) as call_count,
           SUM(duration) as total_duration,
           MAX(call_date) as last_call_date,
           COUNT(CASE WHEN call_type = 'outgoing' THEN 1 END) as outgoing_count,
           COUNT(CASE WHEN call_type = 'incoming' THEN 1 END) as incoming_count,
           COUNT(CASE WHEN call_type = 'missed' THEN 1 END) as missed_count
         FROM call_logs 
         WHERE call_date >= ? AND call_date <= ? 
         AND contact_name IS NOT NULL 
         GROUP BY contact_name 
         ORDER BY call_count DESC 
         LIMIT ?`,
        [startTimestamp, endTimestamp, limit],
      );

      performanceService?.endTracking?.(start);
      return topContacts;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async deleteCallLog(id) {
    const start = performanceService?.startTracking?.('db.deleteCallLog');

    try {
      const result = await this.connection.run(
        `DELETE FROM call_logs WHERE id = ?`,
        [id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async updateCallLogContact(id, contactName) {
    const start = performanceService?.startTracking?.('db.updateCallLogContact');

    try {
      const result = await this.connection.run(
        `UPDATE call_logs SET contact_name = ? WHERE id = ?`,
        [contactName, id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }
}

const callLogRepository = new CallLogRepository();
export default callLogRepository;