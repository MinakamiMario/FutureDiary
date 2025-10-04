import databaseConnection from '../core/DatabaseConnection';
import { formatDateToYYYYMMDD } from '../../utils/formatters';
import performanceService from '../../services/performanceService';

/**
 * Repository for activity-related database operations
 * Handles activities table CRUD operations
 */
class ActivityRepository {
  constructor() {
    this.connection = databaseConnection;
  }

  async addActivity(activity) {
    const start = performanceService?.startTracking?.('db.addActivity');

    try {
      const result = await this.connection.run(
        `INSERT INTO activities (
          type, start_time, end_time, duration, details, source, metadata,
          calories, distance, sport_type, strava_id, heart_rate_avg, heart_rate_max, elevation_gain
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          activity.type,
          activity.start_time,
          activity.end_time,
          activity.duration,
          activity.details,
          activity.source || 'manual',
          JSON.stringify(activity.metadata || {}),
          activity.calories || 0,
          activity.distance || 0,
          activity.sport_type,
          activity.strava_id,
          activity.heart_rate_avg,
          activity.heart_rate_max,
          activity.elevation_gain || 0,
        ],
      );
      
      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getActivitiesForDateRange(startDate, endDate) {
    const start = performanceService?.startTracking?.('db.getActivitiesForDateRange');

    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      const activities = await this.connection.getAll(
        `SELECT * FROM activities 
         WHERE start_time >= ? AND start_time <= ? 
         ORDER BY start_time DESC`,
        [startTimestamp, endTimestamp],
      );

      performanceService?.endTracking?.(start);
      return activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
      }));
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getActivitiesForDate(date) {
    const dateString = formatDateToYYYYMMDD(date);
    const startOfDay = new Date(dateString + 'T00:00:00').getTime();
    const endOfDay = new Date(dateString + 'T23:59:59').getTime();

    return this.getActivitiesForDateRange(startOfDay, endOfDay);
  }

  async getRecentActivities(limit = 10) {
    const start = performanceService?.startTracking?.('db.getRecentActivities');

    try {
      const activities = await this.connection.getAll(
        `SELECT * FROM activities 
         ORDER BY start_time DESC 
         LIMIT ?`,
        [limit],
      );

      performanceService?.endTracking?.(start);
      return activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
      }));
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getActivityById(id) {
    const start = performanceService?.startTracking?.('db.getActivityById');

    try {
      const activity = await this.connection.getFirst(
        `SELECT * FROM activities WHERE id = ?`,
        [id],
      );

      performanceService?.endTracking?.(start);
      if (activity) {
        activity.metadata = activity.metadata ? JSON.parse(activity.metadata) : {};
      }
      return activity;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async updateActivity(id, updates) {
    const start = performanceService?.startTracking?.('db.updateActivity');

    try {
      const setPairs = [];
      const values = [];

      Object.keys(updates).forEach(key => {
        if (key === 'metadata') {
          setPairs.push(`${key} = ?`);
          values.push(JSON.stringify(updates[key]));
        } else {
          setPairs.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      values.push(id);

      const result = await this.connection.run(
        `UPDATE activities SET ${setPairs.join(', ')} WHERE id = ?`,
        values,
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async deleteActivity(id) {
    const start = performanceService?.startTracking?.('db.deleteActivity');

    try {
      const result = await this.connection.run(
        `DELETE FROM activities WHERE id = ?`,
        [id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getActivitiesByType(type, limit = 50) {
    const start = performanceService?.startTracking?.('db.getActivitiesByType');

    try {
      const activities = await this.connection.getAll(
        `SELECT * FROM activities 
         WHERE type = ? 
         ORDER BY start_time DESC 
         LIMIT ?`,
        [type, limit],
      );

      performanceService?.endTracking?.(start);
      return activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
      }));
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getActivitiesBySource(source, limit = 50) {
    const start = performanceService?.startTracking?.('db.getActivitiesBySource');

    try {
      const activities = await this.connection.getAll(
        `SELECT * FROM activities 
         WHERE source = ? 
         ORDER BY start_time DESC 
         LIMIT ?`,
        [source, limit],
      );

      performanceService?.endTracking?.(start);
      return activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
      }));
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getStravaActivities() {
    return this.getActivitiesBySource('strava');
  }

  async findActivityByStravaId(stravaId) {
    const start = performanceService?.startTracking?.('db.findActivityByStravaId');

    try {
      const activity = await this.connection.getFirst(
        `SELECT * FROM activities WHERE strava_id = ?`,
        [stravaId],
      );

      performanceService?.endTracking?.(start);
      if (activity) {
        activity.metadata = activity.metadata ? JSON.parse(activity.metadata) : {};
      }
      return activity;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getActivityStats(startDate, endDate) {
    const start = performanceService?.startTracking?.('db.getActivityStats');

    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      const stats = await this.connection.getFirst(
        `SELECT 
           COUNT(*) as total_activities,
           SUM(duration) as total_duration,
           SUM(calories) as total_calories,
           SUM(distance) as total_distance,
           AVG(heart_rate_avg) as avg_heart_rate
         FROM activities 
         WHERE start_time >= ? AND start_time <= ?`,
        [startTimestamp, endTimestamp],
      );

      performanceService?.endTracking?.(start);
      return stats || {
        total_activities: 0,
        total_duration: 0,
        total_calories: 0,
        total_distance: 0,
        avg_heart_rate: 0,
      };
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }
}

const activityRepository = new ActivityRepository();
export default activityRepository;