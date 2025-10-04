import databaseConnection from '../core/DatabaseConnection';
import performanceService from '../../services/performanceService';

/**
 * Repository for location-related database operations
 * Handles locations table CRUD operations
 */
class LocationRepository {
  constructor() {
    this.connection = databaseConnection;
  }

  async addLocation(location) {
    const start = performanceService?.startTracking?.('db.addLocation');

    try {
      const result = await this.connection.run(
        `INSERT INTO locations (latitude, longitude, timestamp, accuracy, name, visit_count, last_visited) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          location.latitude,
          location.longitude,
          location.timestamp,
          location.accuracy,
          location.name,
          location.visit_count || 1,
          location.last_visited || location.timestamp,
        ],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getLocationsForDateRange(startDate, endDate) {
    const start = performanceService?.startTracking?.('db.getLocationsForDateRange');

    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      const locations = await this.connection.getAll(
        `SELECT * FROM locations 
         WHERE timestamp >= ? AND timestamp <= ? 
         ORDER BY timestamp DESC`,
        [startTimestamp, endTimestamp],
      );

      performanceService?.endTracking?.(start);
      return locations;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getRecentLocations(limit = 20) {
    const start = performanceService?.startTracking?.('db.getRecentLocations');

    try {
      const locations = await this.connection.getAll(
        `SELECT * FROM locations 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [limit],
      );

      performanceService?.endTracking?.(start);
      return locations;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async findNearbyLocation(latitude, longitude, radiusMeters = 100) {
    const start = performanceService?.startTracking?.('db.findNearbyLocation');

    try {
      // Simple radius calculation - more accurate calculation can be added later
      const latDelta = radiusMeters / 111000; // Rough degrees per meter
      const lonDelta = radiusMeters / (111000 * Math.cos(latitude * Math.PI / 180));

      const location = await this.connection.getFirst(
        `SELECT * FROM locations 
         WHERE latitude BETWEEN ? AND ? 
         AND longitude BETWEEN ? AND ?
         ORDER BY ((latitude - ?) * (latitude - ?) + (longitude - ?) * (longitude - ?)) ASC
         LIMIT 1`,
        [
          latitude - latDelta,
          latitude + latDelta,
          longitude - lonDelta,
          longitude + lonDelta,
          latitude,
          latitude,
          longitude,
          longitude,
        ],
      );

      performanceService?.endTracking?.(start);
      return location;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async updateLocationVisit(id, timestamp = Date.now()) {
    const start = performanceService?.startTracking?.('db.updateLocationVisit');

    try {
      const result = await this.connection.run(
        `UPDATE locations 
         SET visit_count = visit_count + 1, last_visited = ? 
         WHERE id = ?`,
        [timestamp, id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async updateLocationName(id, name) {
    const start = performanceService?.startTracking?.('db.updateLocationName');

    try {
      const result = await this.connection.run(
        `UPDATE locations SET name = ? WHERE id = ?`,
        [name, id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getMostVisitedLocations(limit = 10) {
    const start = performanceService?.startTracking?.('db.getMostVisitedLocations');

    try {
      const locations = await this.connection.getAll(
        `SELECT * FROM locations 
         WHERE visit_count > 0 
         ORDER BY visit_count DESC, last_visited DESC 
         LIMIT ?`,
        [limit],
      );

      performanceService?.endTracking?.(start);
      return locations;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getLocationById(id) {
    const start = performanceService?.startTracking?.('db.getLocationById');

    try {
      const location = await this.connection.getFirst(
        `SELECT * FROM locations WHERE id = ?`,
        [id],
      );

      performanceService?.endTracking?.(start);
      return location;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async deleteLocation(id) {
    const start = performanceService?.startTracking?.('db.deleteLocation');

    try {
      const result = await this.connection.run(
        `DELETE FROM locations WHERE id = ?`,
        [id],
      );

      performanceService?.endTracking?.(start);
      return result;
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }

  async getLocationStats(startDate, endDate) {
    const start = performanceService?.startTracking?.('db.getLocationStats');

    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      const stats = await this.connection.getFirst(
        `SELECT 
           COUNT(DISTINCT id) as unique_locations,
           COUNT(*) as total_visits,
           MAX(visit_count) as max_visits_single_location
         FROM locations 
         WHERE timestamp >= ? AND timestamp <= ?`,
        [startTimestamp, endTimestamp],
      );

      const mostVisited = await this.connection.getFirst(
        `SELECT name, visit_count 
         FROM locations 
         WHERE timestamp >= ? AND timestamp <= ? 
         ORDER BY visit_count DESC 
         LIMIT 1`,
        [startTimestamp, endTimestamp],
      );

      performanceService?.endTracking?.(start);
      return {
        ...stats,
        most_visited_location: mostVisited?.name || 'None',
        most_visited_count: mostVisited?.visit_count || 0,
      };
    } catch (error) {
      performanceService?.endTracking?.(start, error);
      throw error;
    }
  }
}

const locationRepository = new LocationRepository();
export default locationRepository;