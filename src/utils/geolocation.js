import { Geolocation } from '@capacitor/geolocation';

/**
 * Location service for verifying user presence at contest venues
 * Uses Capacitor Geolocation plugin for native iOS/Android
 */
export class LocationService {
  /**
   * Request location permission from the user
   * @returns {Promise<boolean>} true if permission granted
   */
  static async requestLocationPermission() {
    try {
      const permission = await Geolocation.requestPermissions();
      return permission.location === 'granted' || permission.location === 'prompt';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permission is already granted
   * @returns {Promise<boolean>} true if permission granted
   */
  static async checkLocationPermission() {
    try {
      const permission = await Geolocation.checkPermissions();
      return permission.location === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  /**
   * Get current device location
   * @returns {Promise<{latitude: number, longitude: number}>}
   */
  static async getCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in yards
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMiles = R * c;
    const distanceYards = distanceMiles * 1760; // Convert miles to yards

    return distanceYards;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees
   * @returns {number} Radians
   */
  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Verify user is present at the event venue
   * @param {Object} venueGeopoint - Firestore GeoPoint with latitude and longitude
   * @param {number} radiusYards - Maximum distance in yards (default 200)
   * @returns {Promise<{verified: boolean, distance: number, reason?: string}>}
   */
  static async verifyEventPresence(venueGeopoint, radiusYards = 200) {
    try {
      // Get current location
      const currentLocation = await this.getCurrentLocation();

      // Extract venue coordinates from Firestore GeoPoint
      const venueLat = venueGeopoint.latitude || venueGeopoint._lat;
      const venueLon = venueGeopoint.longitude || venueGeopoint._long;

      // Calculate distance
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        venueLat,
        venueLon
      );

      console.log(`Distance to venue: ${distance.toFixed(2)} yards`);

      // Check if within radius
      if (distance <= radiusYards) {
        return {
          verified: true,
          distance: distance
        };
      } else {
        return {
          verified: false,
          distance: distance,
          reason: 'outside_radius'
        };
      }
    } catch (error) {
      console.error('Error verifying event presence:', error);
      return {
        verified: false,
        distance: 0,
        reason: 'error'
      };
    }
  }
}
