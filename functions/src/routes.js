import { getCache, setCache } from './cache.js';

// Convert waypoint helper
function getWaypoint(waypointInput) {
  if (typeof waypointInput === 'string') {
    // If it looks like a placeId (e.g. starts with "ChI")
    if (waypointInput.startsWith('ChI')) {
      return { placeId: waypointInput };
    }
    return { address: waypointInput };
  } else if (waypointInput && waypointInput.latitude && waypointInput.longitude) {
    return {
      location: {
        latLng: {
          latitude: waypointInput.latitude,
          longitude: waypointInput.longitude
        }
      }
    };
  } else if (waypointInput && waypointInput.placeId) {
    return { placeId: waypointInput.placeId };
  } else if (waypointInput && waypointInput.address) {
    return { address: waypointInput.address };
  }
  return { address: String(waypointInput || '') };
}

// Calculate haversine distance in meters between two coordinates
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Extract coordinates from object
function extractCoords(input) {
  if (input && typeof input === 'object') {
    if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
      return { lat: input.latitude, lng: input.longitude };
    }
    if (typeof input.lat === 'number' && typeof input.lng === 'number') {
      return { lat: input.lat, lng: input.lng };
    }
  }
  return null;
}

// Get coordinates for common cities
function getCityCoords(name) {
  const clean = String(name || '').toLowerCase();
  if (clean.includes('seattle')) return { lat: 47.6062, lng: -122.3321 };
  if (clean.includes('bellingham')) return { lat: 48.7519, lng: -122.4787 };
  if (clean.includes('portland')) return { lat: 45.5152, lng: -122.6784 };
  if (clean.includes('denver')) return { lat: 39.7392, lng: -104.9903 };
  if (clean.includes('los angeles') || clean.includes('la')) return { lat: 34.0522, lng: -118.2437 };
  if (clean.includes('san francisco') || clean.includes('sf')) return { lat: 37.7749, lng: -122.4194 };
  if (clean.includes('san diego')) return { lat: 32.7157, lng: -117.1611 };
  if (clean.includes('new york') || clean.includes('nyc')) return { lat: 40.7128, lng: -74.0060 };
  return null;
}

/**
 * Computes drive route between origin and destination using Google Routes API
 * @param {string|object} originInput 
 * @param {string|object} destinationInput 
 * @param {object|null} fallbackCoords
 * @returns {Promise<object>}
 */
export async function computeRoute(originInput, destinationInput, fallbackCoords = null) {
  const originStr = typeof originInput === 'string' ? originInput : JSON.stringify(originInput);
  const destinationStr = typeof destinationInput === 'string' ? destinationInput : JSON.stringify(destinationInput);
  
  // Create a safe cache key
  const combined = `${originStr}_to_${destinationStr}`;
  // Base64 encode and clean it to be a valid firestore doc ID
  const cacheKey = 'route_imp_' + Buffer.from(combined).toString('base64').replace(/[^a-zA-Z0-9-_]/g, '');

  // Check cache (TTL 15 minutes)
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`Routes Cache Hit: ${originStr} -> ${destinationStr}`);
    return cached;
  }

  console.log(`Routes API Call: ${originStr} -> ${destinationStr}`);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    console.warn("GOOGLE_MAPS_API_KEY is not set or placeholder. Returning stub travel times.");
    const stubResult = {
      durationSeconds: 3600,
      durationText: "1 hr 0 min (stub)",
      distanceMeters: 50000,
      distanceText: "31.1 mi"
    };
    return stubResult;
  }

  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  
  const body = {
    origin: getWaypoint(originInput),
    destination: getWaypoint(destinationInput),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    languageCode: 'en-US',
    units: 'IMPERIAL'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.localizedValues'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Routes API responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error("No routes found");
    }

    const route = data.routes[0];
    
    // Parse duration (e.g. "3600s" -> 3600)
    let durationSeconds = 0;
    if (route.duration) {
      durationSeconds = parseInt(route.duration.replace('s', ''), 10);
    }

    const result = {
      durationSeconds,
      durationText: route.localizedValues?.duration?.text || `${Math.round(durationSeconds / 60)} mins`,
      distanceMeters: route.distanceMeters || 0,
      distanceText: route.localizedValues?.distance?.text || `${((route.distanceMeters || 0) / 1609.34).toFixed(1)} mi`
    };

    // Cache the result for 15 minutes (900 seconds)
    await setCache(cacheKey, result, 900);
    return result;

  } catch (error) {
    console.error(`Error calculating route ${originStr} -> ${destinationStr}:`, error);
    
    // Dynamic haversine estimation fallback
    const originCoords = extractCoords(originInput) || getCityCoords(originInput);
    const destCoords = extractCoords(destinationInput) || fallbackCoords;
    
    if (originCoords && destCoords) {
      try {
        const oLat = originCoords.latitude || originCoords.lat;
        const oLng = originCoords.longitude || originCoords.lng;
        const dLat = destCoords.latitude || destCoords.lat;
        const dLng = destCoords.longitude || destCoords.lng;
        
        const straightLineMeters = haversineDistance(oLat, oLng, dLat, dLng);
        
        // Multiplier for winding mountain roads/detours (average 35%)
        const estDistanceMeters = straightLineMeters * 1.35;
        
        // Average speed: 45 mph (approx 20.1 meters per second)
        const estDurationSeconds = Math.max(300, Math.round(estDistanceMeters / 20.1));
        
        const miles = estDistanceMeters / 1609.34;
        const hours = Math.floor(estDurationSeconds / 3600);
        const mins = Math.round((estDurationSeconds % 3600) / 60);
        
        let durationText = "";
        if (hours > 0) {
          durationText += `${hours} hr${hours > 1 ? 's' : ''} `;
        }
        durationText += `${mins} min${mins > 1 ? 's' : ''} (fallback)`;

        return {
          durationSeconds: estDurationSeconds,
          durationText,
          distanceMeters: Math.round(estDistanceMeters),
          distanceText: `${miles.toFixed(1)} mi`,
          isFallback: true
        };
      } catch (calcErr) {
        console.error("Failed to compute haversine fallback route:", calcErr);
      }
    }

    // Default hardcoded fallback stub if coordinates are completely missing
    return {
      durationSeconds: 1800,
      durationText: "30 mins (fallback)",
      distanceMeters: 25000,
      distanceText: "15.5 mi",
      isFallback: true
    };
  }
}
