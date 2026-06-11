import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getRecommendations, getRefinementStream, getRecentTips } from './src/gemini.js';
import { computeRoute } from './src/routes.js';
import { fetchWeather } from './src/weather.js';
import { adjustItinerary } from './src/itinerary.js';

// Initialize firebase admin if not done already
if (getApps().length === 0) {
  initializeApp();
}

// Telemetry for tracking instance count, cold starts, and request lifecycle
const INSTANCE_ID = Math.random().toString(36).substring(2, 10);
let instanceRequestCount = 0;
console.log(`[Lifecycle] Cloud Function instance ${INSTANCE_ID} initialized (Cold Start).`);

// Temporarily disable App Check enforcement until reCAPTCHA is fully configured for the production domain
const ENFORCE_APP_CHECK = false;

/**
 * Resolves routing data for an activity using placeId or coordinates, falling back to name+location if needed.
 */
async function resolveRouteData(origin, activity) {
  let destination;
  if (activity.placeId) {
    destination = activity.placeId;
  } else if (activity.latitude && activity.longitude) {
    destination = {
      latitude: activity.latitude,
      longitude: activity.longitude
    };
  } else {
    destination = `${activity.name}, ${activity.location}`;
  }

  const fallbackCoords = { latitude: activity.latitude, longitude: activity.longitude };
  const firstAttempt = await computeRoute(origin, destination, fallbackCoords);
  
  if (
    firstAttempt.durationText && 
    firstAttempt.durationText.includes('fallback') && 
    (activity.placeId || (activity.latitude && activity.longitude))
  ) {
    console.log(`Routes API: Primary routing failed for ${activity.name}. Retrying with: "${activity.name}, ${activity.location}"`);
    return await computeRoute(origin, `${activity.name}, ${activity.location}`, fallbackCoords);
  }
  
  return firstAttempt;
}

/**
 * Main adventure search function.
 * Streams status updates and then the final enriched activities.
 */
export const searchAdventures = onCall({ 
  region: 'us-central1', 
  timeoutSeconds: 120,
  maxInstances: 10,
  enforceAppCheck: ENFORCE_APP_CHECK 
}, async (request, response) => {
  instanceRequestCount++;
  console.log(`[Telemetry] Instance ID: ${INSTANCE_ID} | Request Count: ${instanceRequestCount} | Handling function: searchAdventures`);

  const constraints = request.data;
  const acceptsStreaming = request.acceptsStreaming;

  // Validate constraints
  if (!constraints || typeof constraints !== 'object') {
    throw new HttpsError('invalid-argument', 'Request data must be a valid constraints object.');
  }
  if (typeof constraints.startLocation !== 'string' || constraints.startLocation.trim().length === 0 || constraints.startLocation.length > 200) {
    throw new HttpsError('invalid-argument', 'startLocation must be a non-empty string under 200 characters.');
  }
  if (constraints.startCoords) {
    if (typeof constraints.startCoords.latitude !== 'number' || typeof constraints.startCoords.longitude !== 'number') {
      throw new HttpsError('invalid-argument', 'startCoords must contain numeric latitude and longitude.');
    }
  }
  if (constraints.notes && (typeof constraints.notes !== 'string' || constraints.notes.length > 1000)) {
    throw new HttpsError('invalid-argument', 'notes must be a string under 1000 characters.');
  }
  if (constraints.activities && !Array.isArray(constraints.activities)) {
    throw new HttpsError('invalid-argument', 'activities must be an array.');
  }
  if (constraints.activities && constraints.activities.some(act => typeof act !== 'string' || act.length > 50)) {
    throw new HttpsError('invalid-argument', 'activities must only contain strings under 50 characters.');
  }

  console.log("Starting searchAdventures with constraints:", constraints);

  // Define status sender helper
  const sendStatus = async (status, message) => {
    if (acceptsStreaming && response && typeof response.sendChunk === 'function') {
      try {
        await response.sendChunk({ status, message });
      } catch (err) {
        console.error("Error sending chunk:", err);
      }
    }
  };

  try {
    // Stage 1: Constraint Analysis
    await sendStatus('analyzing', 'Analyzing your constraints...');

    // Stage 2: Gemini API Call
    await sendStatus('querying', 'Querying Gemini with Google Maps Grounding...');
    
    // Get weather for the starting coordinates to feed into the prompt
    let startLat = constraints.startCoords?.latitude || 47.6062;
    let startLng = constraints.startCoords?.longitude || -122.3321;
    const startWeather = await fetchWeather(startLat, startLng, constraints.targetDay || 'Today');

    const aiResult = await getRecommendations(constraints, startWeather);
    
    const activities = aiResult.data.activities || [];
    const generalExplanation = aiResult.data.generalExplanation || '';
    const noResultsExplanation = aiResult.data.noResultsExplanation || '';
    const groundingMetadata = aiResult.groundingMetadata || {};

    // Stage 3: Routing & Weather Calculations
    await sendStatus('routing', 'Calculating optimal driving times, routes, and trailhead weather forecasts...');
    
    const enrichedPromises = activities.map(async (activity) => {
      const origin = constraints.startCoords || constraints.startLocation;
      
      const weatherPromise = activity.latitude && activity.longitude 
        ? fetchWeather(activity.latitude, activity.longitude, constraints.targetDay || 'Today')
        : Promise.resolve(null);
        
      const routeData = await resolveRouteData(origin, activity);
      
      const weatherData = await weatherPromise;
      
      // Enrich activity with routes and weather data
      const enrichedActivity = {
        ...activity,
        driveTime: routeData.durationText,
        driveTimeSeconds: routeData.durationSeconds,
        distance: routeData.distanceText,
        distanceMeters: routeData.distanceMeters,
        weather: weatherData,
        itinerary: adjustItinerary(activity.itinerary, routeData.durationSeconds)
      };

      // Add route warning if it's a fallback route (e.g. closed road or remote area)
      if (routeData.isFallback) {
        if (!enrichedActivity.warnings) enrichedActivity.warnings = [];
        const routeWarn = `Standard driving route could not be calculated (often due to active road closures, seasonal road conditions, or unpaved forest roads). Showing estimated fallback times.`;
        if (!enrichedActivity.warnings.includes(routeWarn)) {
          enrichedActivity.warnings.push(routeWarn);
        }
      }

      // Add a weather warning if there is a substantial chance of rain
      if (weatherData && weatherData.rainProbability > 30) {
        if (!enrichedActivity.warnings) enrichedActivity.warnings = [];
        const cond = (weatherData.condition || '').toLowerCase();
        const isRainRelated = cond.includes('rain') || cond.includes('shower') || cond.includes('drizzle') || cond.includes('snow') || cond.includes('storm') || cond.includes('sleet');
        const condPhrase = isRainRelated ? cond : `rain (${weatherData.condition})`;
        const weatherWarn = `Weather forecast predicts a ${weatherData.rainProbability}% chance of ${condPhrase} with temperature highs near ${Math.round(weatherData.maxTemp)}°F.`;
        if (!enrichedActivity.warnings.includes(weatherWarn)) {
          enrichedActivity.warnings.unshift(weatherWarn);
        }
      }

      return enrichedActivity;
    });

    const enrichedActivities = await Promise.all(enrichedPromises);

    // Sort and prioritize trails with dry weather over rainy ones
    const dryActivities = [];
    const rainyActivities = [];
    for (const act of enrichedActivities) {
      if (act.weather && act.weather.rainProbability > 30) {
        rainyActivities.push(act);
      } else {
        dryActivities.push(act);
      }
    }
    
    // Choose the best 3 recommendations (preferring dry trails)
    const finalActivities = [...dryActivities, ...rainyActivities].slice(0, 3);

    // Stage 4: Done
    const finalResponse = {
      status: 'done',
      results: finalActivities,
      generalExplanation,
      noResultsExplanation,
      groundingMetadata
    };

    if (acceptsStreaming && response && typeof response.sendChunk === 'function') {
      await response.sendChunk(finalResponse);
      return null;
    }

    return finalResponse;

  } catch (error) {
    console.error("Error in searchAdventures:", error);
    await sendStatus('error', `Failed to find adventures: ${error.message}`);
    throw error;
  }
});

/**
 * Refinement Chat function.
 * Streams natural language response character-by-character from Gemini.
 */
export const refineAdventure = onCall({ 
  region: 'us-central1', 
  timeoutSeconds: 120,
  maxInstances: 10,
  enforceAppCheck: ENFORCE_APP_CHECK 
}, async (request) => {
  instanceRequestCount++;
  console.log(`[Telemetry] Instance ID: ${INSTANCE_ID} | Request Count: ${instanceRequestCount} | Handling function: refineAdventure`);

  const { history, message, constraints } = request.data || {};

  // Validate inputs
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) {
    throw new HttpsError('invalid-argument', 'message must be a non-empty string under 2000 characters.');
  }
  if (history && (!Array.isArray(history) || history.length > 20)) {
    throw new HttpsError('invalid-argument', 'history must be an array of length 20 or less.');
  }
  if (history && history.some(msg => !msg || typeof msg.content !== 'string' || msg.content.length > 5000)) {
    throw new HttpsError('invalid-argument', 'history messages must contain strings under 5000 characters.');
  }
  if (constraints) {
    if (typeof constraints.startLocation !== 'string' || constraints.startLocation.length > 200) {
      throw new HttpsError('invalid-argument', 'startLocation must be a string under 200 characters.');
    }
    if (constraints.notes && (typeof constraints.notes !== 'string' || constraints.notes.length > 1000)) {
      throw new HttpsError('invalid-argument', 'notes must be a string under 1000 characters.');
    }
  }

  console.log("Starting refineAdventure chat refinement. Message:", message);

  try {
    const streamResult = await getRefinementStream(history, message, constraints);
    
    let enrichedActivities = [];
    if (streamResult.activities && streamResult.activities.length > 0) {
      const origin = constraints?.startCoords || constraints?.startLocation || 'Seattle, WA';
      const targetDay = constraints?.targetDay || 'Today';

      const enrichedPromises = streamResult.activities.map(async (activity) => {
        const weatherPromise = activity.latitude && activity.longitude 
          ? fetchWeather(activity.latitude, activity.longitude, targetDay)
          : Promise.resolve(null);
          
        const routeData = await resolveRouteData(origin, activity);
        
        const weatherData = await weatherPromise;
        
        const enrichedActivity = {
          ...activity,
          driveTime: routeData.durationText,
          driveTimeSeconds: routeData.durationSeconds,
          distance: routeData.distanceText,
          distanceMeters: routeData.distanceMeters,
          weather: weatherData,
          itinerary: adjustItinerary(activity.itinerary, routeData.durationSeconds)
        };

        // Add route warning if it's a fallback route
        if (routeData.isFallback) {
          if (!enrichedActivity.warnings) enrichedActivity.warnings = [];
          const routeWarn = `Standard driving route could not be calculated (often due to active road closures, seasonal road conditions, or unpaved forest roads). Showing estimated fallback times.`;
          if (!enrichedActivity.warnings.includes(routeWarn)) {
            enrichedActivity.warnings.push(routeWarn);
          }
        }

        if (weatherData && weatherData.rainProbability > 30) {
          if (!enrichedActivity.warnings) enrichedActivity.warnings = [];
          const cond = (weatherData.condition || '').toLowerCase();
          const isRainRelated = cond.includes('rain') || cond.includes('shower') || cond.includes('drizzle') || cond.includes('snow') || cond.includes('storm') || cond.includes('sleet');
          const condPhrase = isRainRelated ? cond : `rain (${weatherData.condition})`;
          const weatherWarn = `Weather forecast predicts a ${weatherData.rainProbability}% chance of ${condPhrase} with temperature highs near ${Math.round(weatherData.maxTemp)}°F.`;
          if (!enrichedActivity.warnings.includes(weatherWarn)) {
            enrichedActivity.warnings.unshift(weatherWarn);
          }
        }

        return enrichedActivity;
      });

      enrichedActivities = await Promise.all(enrichedPromises);
    }

    return {
      text: streamResult.chatResponse,
      results: enrichedActivities,
      generalExplanation: streamResult.generalExplanation,
      groundingMetadata: streamResult.groundingMetadata
    };

  } catch (error) {
    console.error("Error in refineAdventure Cloud Function:", error);
    throw error;
  }
});

/**
 * Cloud Function to fetch live recent tips/trail reports for a single activity.
 */
export const fetchRecentTips = onCall({ 
  region: 'us-central1', 
  timeoutSeconds: 60,
  maxInstances: 10,
  enforceAppCheck: ENFORCE_APP_CHECK 
}, async (request) => {
  instanceRequestCount++;
  console.log(`[Telemetry] Instance ID: ${INSTANCE_ID} | Request Count: ${instanceRequestCount} | Handling function: fetchRecentTips`);

  const { activityName, location, latitude, longitude } = request.data || {};

  // Validate inputs
  if (typeof activityName !== 'string' || activityName.trim().length === 0 || activityName.length > 200) {
    throw new HttpsError('invalid-argument', 'activityName must be a non-empty string under 200 characters.');
  }
  if (typeof location !== 'string' || location.trim().length === 0 || location.length > 200) {
    throw new HttpsError('invalid-argument', 'location must be a non-empty string under 200 characters.');
  }
  if (latitude !== undefined && (typeof latitude !== 'number' || isNaN(latitude))) {
    throw new HttpsError('invalid-argument', 'latitude must be a numeric value.');
  }
  if (longitude !== undefined && (typeof longitude !== 'number' || isNaN(longitude))) {
    throw new HttpsError('invalid-argument', 'longitude must be a numeric value.');
  }

  console.log(`Starting fetchRecentTips for: ${activityName} (${location})`);
  
  try {
    const tipsResult = await getRecentTips(activityName, location, latitude, longitude);
    return tipsResult;
  } catch (error) {
    console.error("Error in fetchRecentTips Cloud Function:", error);
    throw error;
  }
});
