import databaseConnection from '../core/DatabaseConnection';
import { formatDateToYYYYMMDD } from '../../utils/formatters';
import performanceService from '../../services/performanceService';

/**
 * Repository for narrative and summary-related database operations
 * Handles narrative_summaries, daily_summaries, and user_daily_notes tables
 */
class NarrativeRepository {
  constructor() {
    this.connection = databaseConnection;
  }

  // NARRATIVE SUMMARIES
  async addNarrativeSummary(date, summary) {
    const start = performanceService?.startTracking?.('db.addNarrativeSummary');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const result = await this.connection.run(
        `INSERT OR REPLACE INTO narrative_summaries (date, summary) VALUES (?, ?)`,
        [dateString, summary],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getNarrativeSummary(date) {
    const start = performanceService?.startTracking?.('db.getNarrativeSummary');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const summary = await this.connection.getFirst(
        `SELECT * FROM narrative_summaries WHERE date = ?`,
        [dateString],
      );

      performanceService?.endTracking?.(start);
      return summary;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getRecentNarrativeSummaries(limit = 7) {
    const start = performanceService?.startTracking?.('db.getRecentNarrativeSummaries');

    try {
      const summaries = await this.connection.getAll(
        `SELECT * FROM narrative_summaries 
         ORDER BY date DESC 
         LIMIT ?`,
        [limit],
      );

      performanceService?.endTracking?.(start);
      return summaries;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  // DAILY SUMMARIES
  async addDailySummary(date, summaryData) {
    const start = performanceService?.startTracking?.('db.addDailySummary');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const result = await this.connection.run(
        `INSERT OR REPLACE INTO daily_summaries (
          date, morning_activity, afternoon_activity, evening_activity, night_activity,
          total_steps, total_active_time, most_visited_location, most_called_contact, summary_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dateString,
          summaryData.morning_activity,
          summaryData.afternoon_activity,
          summaryData.evening_activity,
          summaryData.night_activity,
          summaryData.total_steps || 0,
          summaryData.total_active_time || 0,
          summaryData.most_visited_location,
          summaryData.most_called_contact,
          JSON.stringify(summaryData.summary_data || {}),
        ],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getDailySummary(date) {
    const start = performanceService?.startTracking?.('db.getDailySummary');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const summary = await this.connection.getFirst(
        `SELECT ds.*, l.name as location_name 
         FROM daily_summaries ds
         LEFT JOIN locations l ON ds.most_visited_location = l.id
         WHERE ds.date = ?`,
        [dateString],
      );

      performanceService?.endTracking?.(start);
      if (summary) {
        summary.summary_data = summary.summary_data ? JSON.parse(summary.summary_data) : {};
      }
      return summary;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getRecentDailySummaries(limit = 7) {
    const start = performanceService?.startTracking?.('db.getRecentDailySummaries');

    try {
      const summaries = await this.connection.getAll(
        `SELECT ds.*, l.name as location_name 
         FROM daily_summaries ds
         LEFT JOIN locations l ON ds.most_visited_location = l.id
         ORDER BY ds.date DESC 
         LIMIT ?`,
        [limit],
      );

      performanceService?.endTracking?.(start);
      return summaries.map(summary => ({
        ...summary,
        summary_data: summary.summary_data ? JSON.parse(summary.summary_data) : {},
      }));
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  // USER DAILY NOTES
  async addUserNote(date, noteText) {
    const start = performanceService?.startTracking?.('db.addUserNote');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const timestamp = Date.now();
      
      const result = await this.connection.run(
        `INSERT INTO user_daily_notes (date, note_text, timestamp) VALUES (?, ?, ?)`,
        [dateString, noteText, timestamp],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getUserNotesForDate(date) {
    const start = performanceService?.startTracking?.('db.getUserNotesForDate');

    try {
      const dateString = formatDateToYYYYMMDD(date);
      const notes = await this.connection.getAll(
        `SELECT * FROM user_daily_notes 
         WHERE date = ? 
         ORDER BY timestamp DESC`,
        [dateString],
      );

      performanceService?.endTracking?.(start);
      return notes;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getRecentUserNotes(limit = 20) {
    const start = performanceService?.startTracking?.('db.getRecentUserNotes');

    try {
      const notes = await this.connection.getAll(
        `SELECT * FROM user_daily_notes 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [limit],
      );

      performanceService?.endTracking?.(start);
      return notes;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async updateUserNote(id, noteText) {
    const start = performanceService?.startTracking?.('db.updateUserNote');

    try {
      const result = await this.connection.run(
        `UPDATE user_daily_notes 
         SET note_text = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [noteText, id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async deleteUserNote(id) {
    const start = performanceService?.startTracking?.('db.deleteUserNote');

    try {
      const result = await this.connection.run(
        `DELETE FROM user_daily_notes WHERE id = ?`,
        [id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async searchNotes(searchTerm, limit = 50) {
    const start = performanceService?.startTracking?.('db.searchNotes');

    try {
      const notes = await this.connection.getAll(
        `SELECT * FROM user_daily_notes 
         WHERE note_text LIKE ? 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [`%${searchTerm}%`, limit],
      );

      performanceService?.endTracking?.(start);
      return notes;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getSummaryStats(startDate, endDate) {
    const start = performanceService?.startTracking?.('db.getSummaryStats');

    try {
      const startDateString = formatDateToYYYYMMDD(startDate);
      const endDateString = formatDateToYYYYMMDD(endDate);

      const narrativeCount = await this.connection.getFirst(
        `SELECT COUNT(*) as count FROM narrative_summaries 
         WHERE date >= ? AND date <= ?`,
        [startDateString, endDateString],
      );

      const dailySummaryCount = await this.connection.getFirst(
        `SELECT COUNT(*) as count FROM daily_summaries 
         WHERE date >= ? AND date <= ?`,
        [startDateString, endDateString],
      );

      const notesCount = await this.connection.getFirst(
        `SELECT COUNT(*) as count FROM user_daily_notes 
         WHERE date >= ? AND date <= ?`,
        [startDateString, endDateString],
      );

      performanceService?.endTracking?.(start);
      return {
        narrative_summaries: narrativeCount?.count || 0,
        daily_summaries: dailySummaryCount?.count || 0,
        user_notes: notesCount?.count || 0,
      };
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }
}

const narrativeRepository = new NarrativeRepository();
export default narrativeRepository;