const turf = require('@turf/turf');

/**
 * Calculate the distance between two points in kilometers
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  return turf.distance(from, to);
};

/**
 * Check if a point is within a certain radius of another point
 * @param {number} lat1 - Latitude of center point
 * @param {number} lon1 - Longitude of center point
 * @param {number} lat2 - Latitude of point to check
 * @param {number} lon2 - Longitude of point to check
 * @param {number} radius - Radius in kilometers
 * @returns {boolean} Whether the point is within the radius
 */
const isPointWithinRadius = (lat1, lon1, lat2, lon2, radius) => {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance <= radius;
};

/**
 * Create a circle polygon around a point
 * @param {number} lat - Latitude of center point
 * @param {number} lon - Longitude of center point
 * @param {number} radius - Radius in kilometers
 * @param {number} steps - Number of steps to use to create the circle (default: 64)
 * @returns {object} GeoJSON polygon
 */
const createCircle = (lat, lon, radius, steps = 64) => {
  const center = turf.point([lon, lat]);
  return turf.circle(center, radius, { steps });
};

/**
 * Get bounding box for a point with radius
 * @param {number} lat - Latitude of center point
 * @param {number} lon - Longitude of center point
 * @param {number} radius - Radius in kilometers
 * @returns {Array} Bounding box in format [minLon, minLat, maxLon, maxLat]
 */
const getBoundingBox = (lat, lon, radius) => {
  const point = turf.point([lon, lat]);
  const buffer = turf.buffer(point, radius, { units: 'kilometers' });
  return turf.bbox(buffer);
};

/**
 * Validate latitude and longitude values
 * @param {number} lat - Latitude to validate
 * @param {number} lon - Longitude to validate
 * @returns {boolean} Whether the coordinates are valid
 */
const isValidCoordinates = (lat, lon) => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

/**
 * Format coordinates for display
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {boolean} withDegrees - Whether to include degree symbols (default: false)
 * @returns {string} Formatted coordinates
 */
const formatCoordinates = (lat, lon, withDegrees = false) => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const absLat = Math.abs(lat);
  const absLon = Math.abs(lon);
  
  if (withDegrees) {
    return `${absLat}° ${latDir}, ${absLon}° ${lonDir}`;
  } else {
    return `${absLat} ${latDir}, ${absLon} ${lonDir}`;
  }
};

module.exports = {
  calculateDistance,
  isPointWithinRadius,
  createCircle,
  getBoundingBox,
  isValidCoordinates,
  formatCoordinates
};