import { onCall } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getRecommendations, getRefinementStream } from './src/gemini.js';
import { computeRoute } from './src/routes.js';
import { fetchWeather } from './src/weather.js';

// Initialize firebase admin if not done already
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Main adventure search function.
 * Streams status updates and then the final enriched activities.
 */
export const searchAdventures = onCall({ region: 'us-central1' }, async (request) => {
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
    await new Promise(r => setTimeout(r, 600)); // aesthetic pacing

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
    
    const enrichedActivities = [];
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      sendStatus('routing', `Calculating route & weather for: ${activity.name}...`);
      
      // Calculate travel time from origin to trailhead/place (use coordinates if available, with robust text fallback)
      const origin = constraints.startCoords || constraints.startLocation;
      let routeData;
      
      const weatherPromise = activity.latitude && activity.longitude 
        ? fetchWeather(activity.latitude, activity.longitude, constraints.targetDay || 'Today')
        : Promise.resolve(null);
        
      if (activity.latitude && activity.longitude) {
        // Try coordinates first
        const coordsDest = {
          latitude: activity.latitude,
          longitude: activity.longitude
        };
        const firstAttempt = await computeRoute(origin, coordsDest);
        
        if (firstAttempt.durationText && firstAttempt.durationText.includes('fallback')) {
          console.log(`Routes API: Coordinate-based routing failed for ${activity.name}. Retrying with: "${activity.name}, ${activity.location}"`);
          const secondAttempt = await computeRoute(origin, `${activity.name}, ${activity.location}`);
          
          if (secondAttempt.durationText && secondAttempt.durationText.includes('fallback')) {
            console.log(`Routes API: Name+Location routing failed for ${activity.name}. Retrying with name only: "${activity.name}"`);
            const thirdAttempt = await computeRoute(origin, activity.name);
            routeData = thirdAttempt;
          } else {
            routeData = secondAttempt;
          }
        } else {
          routeData = firstAttempt;
        }
      } else {
        // No coordinates: try placeId or name + location
        const textDest = activity.placeId || `${activity.name}, ${activity.location}`;
        const attempt = await computeRoute(origin, textDest);
        
        if (attempt.durationText && attempt.durationText.includes('fallback') && activity.name) {
          console.log(`Routes API: Text-based routing failed for ${activity.name}. Retrying with name only.`);
          routeData = await computeRoute(origin, activity.name);
        } else {
          routeData = attempt;
        }
      }
      
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
        const weatherWarn = `Weather forecast predicts a ${weatherData.rainProbability}% chance of rain (${weatherData.condition}) with temperature highs near ${Math.round(weatherData.maxTemp)}°F.`;
        if (!enrichedActivity.warnings.includes(weatherWarn)) {
          enrichedActivity.warnings.unshift(weatherWarn);
        }
      }

      enrichedActivities.push(enrichedActivity);
    }

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
export const refineAdventure = onCall({ region: 'us-central1' }, async (request) => {
  const { history, message } = request.data;
  const acceptsStreaming = request.acceptsStreaming;

  console.log("Starting refineAdventure chat refinement. Message:", message);

  if (acceptsStreaming && request.response && typeof request.response.sendChunk === 'function') {
    try {
      let accumulatedText = "";
      const streamResult = await getRefinementStream(history, message, (chunk) => {
        accumulatedText += chunk;
        request.response.sendChunk({ chunk });
      });

      // Send the final result with grounding metadata
      request.response.sendChunk({
        done: true,
        text: streamResult.text,
        groundingMetadata: streamResult.groundingMetadata
      });
      
      return null;
    } catch (error) {
      console.error("Error in streaming refineAdventure:", error);
      request.response.sendChunk({ error: error.message });
      throw error;
    }
  } else {
    // Non-streaming fallback
    try {
      const chunks = [];
      const streamResult = await getRefinementStream(history, message, (chunk) => {
        chunks.push(chunk);
      });
      return {
        text: streamResult.text,
        groundingMetadata: streamResult.groundingMetadata
      };
    } catch (error) {
      console.error("Error in non-streaming refineAdventure:", error);
      throw error;
    }
  }
});
