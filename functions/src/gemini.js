/* global process */
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT, RESPONSE_SCHEMA, REFINEMENT_SCHEMA, TIPS_SYSTEM_PROMPT, TIPS_SCHEMA } from './systemPrompt.js';

// Helper to initialize GoogleGenAI client
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Mock responses for Seattle area when Gemini key is missing
const SEATTLE_MOCK = {
  activities: [
    {
      name: "Snow Lake Trail",
      location: "Snoqualmie Pass, WA",
      placeId: "ChIJRecZYL8VkFQR9N4a464646",
      latitude: 47.4418,
      longitude: -121.4234,
      matchReason: "Moderate difficulty matches your intermediate level. Under 1 hour drive from Seattle. Dog-friendly and features a beautiful alpine lake.",
      difficulty: "Intermediate",
      recentTips: [
        {
          text: "Trail is muddy past mile 2, but snow is fully melted.",
          date: "2 days ago",
          source: "WTA",
          link: "https://www.wta.org/go-hiking/hikes/snow-lake-1"
        },
        {
          text: "Parking lot is full by 8:30 AM on sunny Saturdays. Get there early!",
          date: "3 days ago",
          source: "AllTrails",
          link: "https://www.alltrails.com/trail/us/washington/snow-lake-trail"
        }
      ],
      itinerary: [
        { time: "07:00", action: "Depart Seattle (I-90 E)" },
        { time: "07:52", action: "Arrive at Snow Lake Trailhead" },
        { time: "08:00", action: "Begin hiking" },
        { time: "10:30", action: "Reach Snow Lake, enjoy lunch at the shore" },
        { time: "11:15", action: "Begin descent" },
        { time: "13:30", action: "Return to trailhead" },
        { time: "14:22", action: "Arrive back in Seattle" }
      ],
      warnings: [
        "Alpine weather can change quickly. Carry an extra layer."
      ],
      relaxedConstraints: []
    },
    {
      name: "Rattlesnake Ledge",
      location: "North Bend, WA",
      placeId: "ChIJy-mYVb9TkFQRz4h5775757",
      latitude: 47.4326,
      longitude: -121.7681,
      matchReason: "Short 45-minute drive. Easy to moderate level matches your preference. Great panoramic views of Rattlesnake Lake and the mountains.",
      difficulty: "Intermediate",
      recentTips: [
        {
          text: "Trail is dry and in excellent condition. Expect crowds after 10 AM.",
          date: "4 hours ago",
          source: "WTA",
          link: "https://www.wta.org/go-hiking/hikes/rattlesnake-ledge"
        },
        {
          text: "Porta-potties at the trailhead are open and clean.",
          date: "yesterday",
          source: "AllTrails",
          link: "https://www.alltrails.com/trail/us/washington/rattlesnake-mountain-trail--2"
        }
      ],
      itinerary: [
        { time: "08:30", action: "Depart Seattle" },
        { time: "09:15", action: "Arrive at Rattlesnake Ledge Parking" },
        { time: "09:30", action: "Begin hiking the well-maintained switchbacks" },
        { time: "10:45", action: "Reach the ledge, take photos of the lake below" },
        { time: "11:15", action: "Begin hiking down" },
        { time: "12:15", action: "Return to lake level, walk along the shore" },
        { time: "13:15", action: "Arrive back in Seattle" }
      ],
      warnings: [
        "Ledge has sheer drop-offs. Keep dogs on leash and watch your step."
      ],
      relaxedConstraints: []
    }
  ],
  generalExplanation: "Snoqualmie Pass has clear weather today with highs around 65°F. Traffic on I-90 is flowing smoothly with typical weekend trailhead congestion near North Bend. Both options fit well within your 8-hour window and 1.5-hour driving limit."
};

const GENERIC_MOCK = (location) => ({
  activities: [
    {
      name: `Peak Explorer Trail (${location})`,
      location: `${location}`,
      placeId: "mock_place_1",
      latitude: 45.0,
      longitude: -122.0,
      matchReason: "Great local option matching your experience level. Fits driving and time parameters.",
      difficulty: "Intermediate",
      recentTips: [
        {
          text: "Trail conditions are good. Wildflowers are blooming.",
          date: "10 hours ago",
          source: "WTA",
          link: "https://www.wta.org"
        },
        {
          text: "No active closures reported in the area.",
          date: "3 days ago",
          source: "AllTrails",
          link: "https://www.alltrails.com"
        }
      ],
      itinerary: [
        { time: "08:00", action: `Depart ${location}` },
        { time: "08:45", action: "Arrive at trailhead" },
        { time: "09:00", action: "Begin climb" },
        { time: "11:30", action: "Reach summit viewpoints" },
        { time: "12:00", action: "Descend" },
        { time: "14:00", action: "Back at trailhead and return" }
      ],
      warnings: [
        "Bring plenty of water, limited shade on upper sections."
      ],
      relaxedConstraints: []
    }
  ],
  generalExplanation: `Generated adventure recommendations for ${location}. Safe trail conditions, mild weather forecast, and minimal traffic delays.`
});

/**
 * Gets 2-3 adventure recommendations from Gemini based on constraints.
 * @param {object} constraints 
 * @returns {Promise<object>}
 */
export async function getRecommendations(constraints, startWeather) {
  const ai = getGenAIClient();
  
  // Fallback to mock if API key is not set
  if (!ai) {
    console.warn("GEMINI_API_KEY is not set or placeholder. Returning mock data.");
    const isSeattle = (constraints.startLocation || '').toLowerCase().includes('seattle') || 
                      (constraints.startLocation || '').toLowerCase().includes('wa');
    const baseMock = isSeattle ? SEATTLE_MOCK : GENERIC_MOCK(constraints.startLocation || 'Your Location');
    const mockedData = {
      ...baseMock,
      activities: filterActivitiesByExperienceLevel(baseMock.activities || [], constraints.experienceLevel)
    };
    return {
      data: mockedData,
      groundingMetadata: {
        searchEntryPoint: {
          renderedContent: "<a href='https://www.google.com/search?q=hiking+near+seattle' target='_blank'>Search Google for Hiking near Seattle</a>"
        },
        groundingChunks: []
      }
    };
  }

  const locationString = constraints.startCoords 
    ? `Coordinates Latitude ${constraints.startCoords.latitude}, Longitude ${constraints.startCoords.longitude} (${constraints.startLocation})`
    : constraints.startLocation;
  
  let weatherInfo = "";
  if (startWeather) {
    if (constraints.allowInclementWeather) {
      weatherInfo = `\n- Starting Location Weather Forecast for target date: ${startWeather.condition}, temperature high ${startWeather.maxTemp}°F, low ${startWeather.minTemp}°F, chance of rain: ${startWeather.rainProbability}%. Note: The user has explicitly chosen to proceed despite inclement weather. Do NOT filter out trails or activities based on active rain, snow, or precipitation; prioritize recommending available activities for this date, noting any relevant gear/safety tips in the warnings or tips.`;
    } else {
      weatherInfo = `\n- Starting Location Weather Forecast for target date: ${startWeather.condition}, temperature high ${startWeather.maxTemp}°F, low ${startWeather.minTemp}°F, chance of rain: ${startWeather.rainProbability}%. Use this forecast to evaluate nearby trails. Avoid recommending trails in areas with active rain/precipitation if alternatives with better weather are available.`;
    }
  }

  const schemaString = JSON.stringify(RESPONSE_SCHEMA, null, 2);
  const prompt = `
Recommend exactly 3 outdoor activities matching these user constraints:${weatherInfo}
- Starting Location: ${locationString}
- Target Date for Adventure: ${constraints.targetDay || 'Today'} (Evaluate trail conditions, highway traffic, and weather forecast specifically for this target date)
- Time Window: ${constraints.timeWindow}
- Preferred Activities: ${Array.isArray(constraints.activities) ? constraints.activities.join(', ') : constraints.activities}
- Max Driving Duration: ${constraints.maxDriveTime}
- Experience Level: ${constraints.experienceLevel}
- Free-form Notes: ${constraints.notes || 'None'}

You MUST output ONLY a valid JSON object matching this schema. Do not output any other text or explanation. If you include Markdown code blocks (e.g. \`\`\`json ... \`\`\`), that is fine, but the JSON inside must be valid:
${schemaString}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [
          { googleMaps: {} }
        ]
      }
    });

    const text = response.text;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || {};

    if (!text) {
      console.error("Gemini response did not contain text. Full response object:", JSON.stringify(response, null, 2));
      throw new Error("AI output was empty or blocked by safety/other filters.");
    }

    let parsedData;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      parsedData = stripCitations(JSON.parse(cleanJsonString(cleanText)));
      if (parsedData.activities) {
        parsedData.activities = filterActivitiesByExperienceLevel(parsedData.activities, constraints.experienceLevel);
      }
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output. Raw output:", text);
      throw new Error("AI output was not in the expected JSON format.", { cause: parseErr });
    }

    return {
      data: parsedData,
      groundingMetadata: groundingMetadata
    };

  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw error;
  }
}

/**
 * Handles chat refinement streaming from Gemini.
 * @param {Array<object>} history - Past messages in client format { role: 'user'|'model', content: string }
 * @param {string} newMessage - The latest message from the user
 * @param {function} onChunk - Callback for streaming chunks
 * @returns {Promise<object>} - Returns final accumulated response with grounding metadata
 */
export async function getRefinementStream(history, newMessage, constraints) {
  const ai = getGenAIClient();

  const contents = [];
  
  // Map history to Gemini format, but exclude the very last user message if it is the new message
  // because we want to format the new message with the schema instructions
  const historyExcludeLast = [...history];
  const lastMsg = history[history.length - 1];
  const isLastMsgUserNewMessage = lastMsg && lastMsg.role === 'user' && lastMsg.content === newMessage;
  
  if (isLastMsgUserNewMessage) {
    historyExcludeLast.pop();
  }
  
  for (const msg of historyExcludeLast) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  if (!ai) {
    console.warn("GEMINI_API_KEY is not set or placeholder. Returning mock chat refinement JSON.");
    const baseMock = {
      chatResponse: "I have updated your recommendations to focus on Franklin Falls as a closer alternative.",
      activities: [
        {
          name: "Franklin Falls",
          location: "Snoqualmie Pass, WA",
          placeId: "ChIJ7777777777777777777",
          latitude: 47.3976,
          longitude: -121.4426,
          matchReason: "A much closer option, only a 45-minute drive from Seattle. Easy 2-mile walk to a spectacular 70-foot waterfall.",
          difficulty: "Beginner",
          recentTips: [
            {
              text: "Franklin Falls trail is fully open, no snow, beautiful water flow.",
              date: "yesterday",
              source: "WTA",
              link: "https://www.wta.org"
            }
          ],
          itinerary: [
            { time: "09:00", action: "Depart Seattle" },
            { time: "09:45", action: "Arrive at Franklin Falls Trailhead" },
            { time: "10:00", action: "Start hike" },
            { time: "10:45", action: "Reach waterfall views" },
            { time: "11:30", action: "Return to car" }
          ],
          warnings: [],
          relaxedConstraints: []
        }
      ],
      generalExplanation: "- Snoqualmie Pass weather is clear today.\n- Typical weekend trailhead congestion near Franklin Falls.",
      groundingMetadata: {
        searchEntryPoint: null,
        groundingChunks: []
      }
    };
    return {
      ...baseMock,
      activities: filterActivitiesByExperienceLevel(baseMock.activities, constraints?.experienceLevel)
    };
  }

  const schemaString = JSON.stringify(REFINEMENT_SCHEMA, null, 2);
  const formattedNewMessage = `User request: "${newMessage}"

Please respond with a JSON object matching this schema:
${schemaString}

IMPORTANT RULES:
1. If the user's request changes the recommendations (e.g. they ask for a different area, closer options, easier trails, or a specific activity), you MUST generate a new set of exactly 3 outdoor activity recommendations in the "activities" array. Ensure these activities fit all of their original constraints plus the new refinement.
2. In the "chatResponse" field, write a brief, friendly response (strictly 2 to 3 sentences) confirming that the recommendations have been updated and summarizing the updates.
3. If the user's request does NOT change the recommendations (e.g. they just asked a general question or clarified something), do NOT include the "activities" field (or leave it empty/null), and write your answer to their question in "chatResponse".
4. You must output ONLY a valid JSON object matching the schema.
`;

  contents.push({
    role: 'user',
    parts: [{ text: formattedNewMessage }]
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT + "\n\nThis is the chat refinement phase. You must return a JSON object matching the refinement schema.",
        tools: [
          { googleMaps: {} }
        ]
      }
    });

    const text = response.text;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || {};

    if (!text) {
      console.error("Gemini refinement response did not contain text. Full response object:", JSON.stringify(response, null, 2));
      throw new Error("AI output was empty or blocked by safety/other filters.");
    }

    let parsedData;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      parsedData = JSON.parse(cleanJsonString(cleanText));
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON refinement output. Raw output:", text);
      throw new Error("AI output was not in the expected JSON format.", { cause: parseErr });
    }

    return {
      chatResponse: parsedData.chatResponse,
      activities: filterActivitiesByExperienceLevel(parsedData.activities || [], constraints?.experienceLevel),
      generalExplanation: parsedData.generalExplanation || '',
      groundingMetadata: groundingMetadata
    };

  } catch (error) {
    console.error("Gemini refinement failed:", error);
    throw error;
  }
}

/**
 * Recursively cleans string fields by stripping grounding citations (e.g. "[0]", "[1]")
 */
function stripCitations(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\s*\[\d+\]/g, '');
  } else if (Array.isArray(obj)) {
    return obj.map(stripCitations);
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const key of Object.keys(obj)) {
      cleaned[key] = stripCitations(obj[key]);
    }
    return cleaned;
  }
  return obj;
}

/**
 * Filters and prioritizes activities by experience level.
 * - Under no circumstances allows activities with difficulty > requested experience level.
 * - Prioritizes activities with difficulty matching requested experience level.
 * - Allows lower difficulty activities ONLY if no matching activities are available.
 */
export function filterActivitiesByExperienceLevel(activities, requestedLevel) {
  if (!activities || !Array.isArray(activities)) return [];
  if (!requestedLevel || typeof requestedLevel !== 'string') return activities;

  const DIFFICULTY_LEVELS = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3,
    'expert': 4
  };

  const reqVal = DIFFICULTY_LEVELS[requestedLevel.toLowerCase()];
  if (!reqVal) return activities; // Unknown level, return unfiltered

  // 1. Filter out activities higher than the requested level
  const allowed = activities.filter(act => {
    const actVal = DIFFICULTY_LEVELS[(act.difficulty || '').toLowerCase()];
    if (!actVal) return true; // Keep unknown difficulties
    return actVal <= reqVal;
  });

  // 2. Prioritize exact matches
  const exactMatches = allowed.filter(act => {
    const actVal = DIFFICULTY_LEVELS[(act.difficulty || '').toLowerCase()];
    return actVal === reqVal;
  });

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // 3. Fallback to lower difficulties only if no exact matches exist
  return allowed;
}

/**
 * Clean control characters (like raw newlines, carriage returns, tabs) inside string literals in a JSON string.
 * This prevents SyntaxErrors when parsing LLM outputs containing raw newlines.
 */
export function cleanJsonString(jsonStr) {
  if (typeof jsonStr !== 'string') return jsonStr;
  
  let inString = false;
  let escaped = false;
  let out = "";
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (char === '"' && !escaped) {
      inString = !inString;
    }
    
    if (inString) {
      if (char === '\n') {
        out += '\\n';
      } else if (char === '\r') {
        out += '\\r';
      } else if (char === '\t') {
        out += '\\t';
      } else {
        out += char;
      }
    } else {
      out += char;
    }
    
    if (char === '\\' && !escaped) {
      escaped = true;
    } else {
      escaped = false;
    }
  }
  return out;
}

/**
 * Fetches recent live tips for a single activity using Google Search Grounding.
 * @param {string} activityName 
 * @param {string} location 
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object>}
 */
export async function getRecentTips(activityName, location, latitude, longitude) {
  const ai = getGenAIClient();

  if (!ai) {
    console.warn("GEMINI_API_KEY is not set or placeholder. Returning mock tips.");
    return {
      recentTips: [
        {
          text: `[Live Mock] Fresh trail report for ${activityName}: Trail is clear, minor mud near the middle section, parking lot has plenty of spaces.`,
          date: "3 hours ago",
          source: "WTA",
          link: "https://www.wta.org"
        },
        {
          text: `[Live Mock] Wildflowers are in full bloom! Bring bug spray for the upper meadows.`,
          date: "yesterday",
          source: "AllTrails",
          link: "https://www.alltrails.com"
        }
      ]
    };
  }

  const schemaString = JSON.stringify(TIPS_SCHEMA, null, 2);
  const prompt = `
Fetch recent condition reports, reviews, and trail tips for:
- Activity Name: ${activityName}
- Location: ${location}
- Coordinates: ${latitude}, ${longitude}

Verify current conditions such as trail closures, snow level, blowdowns, stream crossings, mud, or parking details. Search for recent reports specifically from the current month (i.e. June 2026).

You MUST output ONLY a valid JSON object matching this schema. Do not output any other text or explanation. If you include Markdown code blocks (e.g. \`\`\`json ... \`\`\`), that is fine, but the JSON inside must be valid:
${schemaString}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: TIPS_SYSTEM_PROMPT,
        tools: [
          { googleSearch: {} }
        ]
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text returned from Gemini recent tips query.");
    }

    let parsedData;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      parsedData = stripCitations(JSON.parse(cleanJsonString(cleanText)));
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON tips output. Raw output:", text);
      throw new Error("Tips output was not in the expected JSON format.", { cause: parseErr });
    }

    return parsedData;

  } catch (error) {
    console.error("Failed to get recent tips from Gemini:", error);
    throw error;
  }
}
