import { onCall } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getRecommendations, getRefinementStream, getRecentTips } from './src/gemini.js';
import { computeRoute } from './src/routes.js';
import { fetchWeather } from './src/weather.js';

// Initialize firebase admin if not done already
if (getApps().length === 0) {
  initializeApp();
}

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

  const firstAttempt = await computeRoute(origin, destination);
  
  if (
    firstAttempt.durationText && 
    firstAttempt.durationText.includes('fallback') && 
    (activity.placeId || (activity.latitude && activity.longitude))
  ) {
    console.log(`Routes API: Primary routing failed for ${activity.name}. Retrying with: "${activity.name}, ${activity.location}"`);
    return await computeRoute(origin, `${activity.name}, ${activity.location}`);
  }
  
  return firstAttempt;
}

/**
 * Main adventure search function.
 * Streams status updates and then the final enriched activities.
 */
export const searchAdventures = onCall({ region: 'us-central1', timeoutSeconds: 120 }, async (request) => {
  const constraints = request.data;
  const acceptsStreaming = request.acceptsStreaming;

  console.log("Starting searchAdventures with constraints:", constraints);

  // Define status sender helper
  const sendStatus = (status, message) => {
    if (acceptsStreaming && request.response && typeof request.response.sendChunk === 'function') {
      try {
        request.response.sendChunk({ status, message });
      } catch (err) {
        console.error("Error sending chunk:", err);
      }
    }
  };

  try {
    // Stage 1: Constraint Analysis
    sendStatus('analyzing', 'Analyzing your constraints...');

    // Stage 2: Gemini API Call
    sendStatus('querying', 'Querying Gemini with Google Maps Grounding...');
    
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
    sendStatus('routing', 'Calculating optimal driving times, routes, and trailhead weather forecasts...');
    
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
        weather: weatherData
      };

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

    if (acceptsStreaming && request.response && typeof request.response.sendChunk === 'function') {
      request.response.sendChunk(finalResponse);
      return null;
    }

    return finalResponse;

  } catch (error) {
    console.error("Error in searchAdventures:", error);
    sendStatus('error', `Failed to find adventures: ${error.message}`);
    throw error;
  }
});

/**
 * Refinement Chat function.
 * Streams natural language response character-by-character from Gemini.
 */
export const refineAdventure = onCall({ region: 'us-central1', timeoutSeconds: 120 }, async (request) => {
  const { history, message, constraints } = request.data;

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
          weather: weatherData
        };

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
export const fetchRecentTips = onCall({ region: 'us-central1', timeoutSeconds: 60 }, async (request) => {
  const { activityName, location, latitude, longitude } = request.data;
  console.log(`Starting fetchRecentTips for: ${activityName} (${location})`);
  
  try {
    const tipsResult = await getRecentTips(activityName, location, latitude, longitude);
    return tipsResult;
  } catch (error) {
    console.error("Error in fetchRecentTips Cloud Function:", error);
    throw error;
  }
});
