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

/**
 * Computes drive route between origin and destination using Google Routes API
 * @param {string|object} originInput 
 * @param {string|object} destinationInput 
 * @returns {Promise<object>}
 */
export async function computeRoute(originInput, destinationInput) {
  const originStr = typeof originInput === 'string' ? originInput : JSON.stringify(originInput);
  const destinationStr = typeof destinationInput === 'string' ? destinationInput : JSON.stringify(destinationInput);
  
  // Create a safe cache key
  const combined = `${originStr}_to_${destinationStr}`;
  // Base64 encode and clean it to be a valid firestore doc ID
  const cacheKey = 'route_' + Buffer.from(combined).toString('base64').replace(/[^a-zA-Z0-9-_]/g, '');

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
    computeAlternativeRoutes: false
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
    // Fallback stub in case API fails
    return {
      durationSeconds: 1800,
      durationText: "30 mins (fallback)",
      distanceMeters: 25000,
      distanceText: "15.5 mi"
    };
  }
}
