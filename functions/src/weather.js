import fetch from 'node-fetch';

/**
 * Calculates the day offset (0 to 5) from today based on the target day string
 * formatted like "Wednesday, Jun 3" or "Today".
 * @param {string} targetDayString 
 * @returns {number}
 */
export function getDayOffset(targetDayString) {
  if (!targetDayString) return 0;
  const targetLower = targetDayString.toLowerCase();
  if (targetLower.includes('today')) return 0;
  if (targetLower.includes('tomorrow')) return 1;

  const today = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    
    // Generate both possible toLocaleDateString variations to cover minor locale differences
    const value = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const valueLongMonth = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    if (
      value === targetDayString || 
      valueLongMonth === targetDayString ||
      targetLower.includes(value.toLowerCase()) ||
      targetLower.includes(valueLongMonth.toLowerCase())
    ) {
      return i;
    }
  }
  return 0;
}

/**
 * Fetches the weather forecast for a latitude/longitude on the specified target date.
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {string} targetDayString 
 * @returns {Promise<object|null>}
 */
export async function fetchWeather(latitude, longitude, targetDayString) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    console.warn("GOOGLE_MAPS_API_KEY not set or placeholder. Cannot fetch weather.");
    return null;
  }

  const dayOffset = getDayOffset(targetDayString);
  const url = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${apiKey}&location.latitude=${latitude}&location.longitude=${longitude}&days=6&unitsSystem=IMPERIAL`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Weather API returned status ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    if (!data.forecastDays || data.forecastDays.length === 0) {
      return null;
    }

    // Safely clamp dayOffset to available forecast length
    const offset = Math.min(dayOffset, data.forecastDays.length - 1);
    const forecast = data.forecastDays[offset];
    
    return {
      maxTemp: forecast.maxTemperature?.degrees ?? null,
      minTemp: forecast.minTemperature?.degrees ?? null,
      condition: forecast.daytimeForecast?.weatherCondition?.description?.text ?? 'Unknown',
      conditionType: forecast.daytimeForecast?.weatherCondition?.type ?? 'UNKNOWN',
      rainProbability: forecast.daytimeForecast?.precipitation?.probability?.percent ?? 0
    };
  } catch (error) {
    console.error(`Failed to fetch weather for coordinates ${latitude}, ${longitude}:`, error);
    return null;
  }
}
