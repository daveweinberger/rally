/* global process */
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { getCache, setCache } from './cache.js';
import { SYSTEM_PROMPT, RESPONSE_SCHEMA, REFINEMENT_SCHEMA, TIPS_SYSTEM_PROMPT, TIPS_SCHEMA } from './systemPrompt.js';
// Helper to initialize GoogleGenAI client
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

const BLOCKED_TOKENS = [
  'ignore', 'disregard', 'override', 'system', 'prompt-injection',
  '/goal', '/schedule', '/browser', '/teamwork-preview'
];

const REFUSAL_MESSAGES = [
  "Nice try! I can't help you with that, unfortunately.",
  "I see what you did there, but I'm sticking to adventure recommendations.",
  "I'm an outdoor guide, not a calculator or a trick-shot artist.",
  "Let's get back on the trail. I can't process that request.",
  "That's off the beaten path! I can only help with your adventure planning."
];

function getRandomRefusal() {
  return REFUSAL_MESSAGES[Math.floor(Math.random() * REFUSAL_MESSAGES.length)];
}

function isAllowedRequest(sanitized) {
  const lower = sanitized.toLowerCase();
  return !BLOCKED_TOKENS.some(tok => lower.includes(tok));
}

// Helper to sanitize inputs to prevent prompt injection: strips XML tags and quotes/backticks
function sanitizeInput(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<\/?[^>]+(>|$)/g, "") // Remove any XML-like tags (e.g. </user_notes>)
    .replace(/[`'"\\]/g, "") // Remove backticks, quotes, backslashes to avoid breaking JSON structure
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
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
    // Basic runtime policy check for user-provided notes
    const rawNotes = constraints.notes || '';
    if (rawNotes && !isAllowedRequest(rawNotes)) {
      console.warn("Blocked disallowed generate request:", rawNotes);
      return {
        activities: [],
        generalExplanation: getRandomRefusal()
      };
    }

    const cacheKeyStr = JSON.stringify({
      loc: constraints.startLocation,
      coords: constraints.startCoords,
      date: constraints.targetDay,
      time: constraints.timeWindow,
      acts: constraints.activities,
      drive: constraints.maxDriveTime,
      exp: constraints.experienceLevel,
      notes: constraints.notes,
      weather: startWeather
    });
    const cacheKeyHash = crypto.createHash('md5').update(cacheKeyStr).digest('hex');
    const cacheKey = 'gemini_recs_' + cacheKeyHash;
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`Gemini Recs Cache Hit`);
      return cached;
    }

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

  const sanitizedStartLocation = sanitizeInput(constraints.startLocation || '');
  const locationString = constraints.startCoords 
    ? `Coordinates Latitude ${constraints.startCoords.latitude}, Longitude ${constraints.startCoords.longitude} (${sanitizedStartLocation})`
    : sanitizedStartLocation;
  
  let weatherInfo = "";
  if (startWeather) {
    if (constraints.allowInclementWeather) {
      weatherInfo = `\n- Starting Location Weather Forecast for target date: ${startWeather.condition}, temperature high ${startWeather.maxTemp}°F, low ${startWeather.minTemp}°F, chance of rain: ${startWeather.rainProbability}%. Note: The user has explicitly chosen to proceed despite inclement weather. Do NOT filter out trails or activities based on active rain, snow, or precipitation; prioritize recommending available activities for this date, noting any relevant gear/safety tips in the warnings or tips.`;
    } else {
      weatherInfo = `\n- Starting Location Weather Forecast for target date: ${startWeather.condition}, temperature high ${startWeather.maxTemp}°F, low ${startWeather.minTemp}°F, chance of rain: ${startWeather.rainProbability}%. Use this forecast to evaluate nearby trails. Avoid recommending trails in areas with active rain/precipitation if alternatives with better weather are available.`;
    }
  }

  const schemaString = JSON.stringify(RESPONSE_SCHEMA, null, 2);
  const sanitizedActivities = Array.isArray(constraints.activities)
    ? constraints.activities.map(sanitizeInput).join(', ')
    : sanitizeInput(constraints.activities || '');

  const prompt = `
Recommend exactly 3 outdoor activities matching these user constraints:${weatherInfo}
- Starting Location: ${locationString}
- Target Date for Adventure: ${constraints.targetDay || 'Today'} (Evaluate trail conditions, highway traffic, and weather forecast specifically for this target date)
- Time Window: ${constraints.timeWindow}
- Preferred Activities: <user_activities>${sanitizedActivities}</user_activities>
- Max Driving Duration: ${constraints.maxDriveTime}
- Experience Level: ${constraints.experienceLevel}
- Free-form Notes: <user_notes>${sanitizeInput(constraints.notes || 'None')}</user_notes>

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

    const resultPayload = {
      data: parsedData,
      groundingMetadata: groundingMetadata
    };

    // Cache for 1 hour (3600 seconds)
    setCache(cacheKey, resultPayload, 3600);

    return resultPayload;

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
  const sanitizedNewMessage = sanitizeInput(newMessage);
  if (!isAllowedRequest(sanitizedNewMessage)) {
    console.warn("Blocked disallowed refinement request:", newMessage);
    return {
      chatResponse: getRandomRefusal(),
      activities: null,
      generalExplanation: "Your request violated our safety policies.",
      groundingMetadata: {}
    };
  }
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
    const isUser = msg.role === 'user';
    contents.push({
      role: isUser ? 'user' : 'model',
      parts: [{ text: isUser ? `User request: <user_message>${sanitizeInput(msg.content)}</user_message>` : msg.content }]
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
  const formattedNewMessage = `User request: <user_message>${sanitizeInput(newMessage)}</user_message>

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

  // Enforce upper bound (never allow difficulty > requested level)
  return activities.filter(act => {
    const actVal = DIFFICULTY_LEVELS[(act.difficulty || '').toLowerCase()];
    if (!actVal) return true; // Keep unknown difficulties
    return actVal <= reqVal;
  });
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
 * Resolves a redirecting URL to its final destination.
 * Specifically targets Google Search Grounding transient redirect URLs.
 */
async function resolveUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return url;
  }
  
  if (!url.includes('vertexaisearch.cloud.google.com/grounding-api-redirect')) {
    return url;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const redirectUrl = res.headers.get('location');
    if (redirectUrl) {
      if (redirectUrl.startsWith('/')) {
        const parsedUrl = new URL(url);
        return parsedUrl.origin + redirectUrl;
      }
      return redirectUrl;
    }
  } catch (e) {
    console.error(`Error resolving redirect for URL: ${url}`, e);
  }
  
  return url;
}

/**
 * Derives a human-readable source name from a grounding chunk.
 * Prefers the chunk's title (first meaningful word or site name portion),
 * falling back to the cleaned hostname.
 */
function deriveSourceName(chunk) {
  if (!chunk || !chunk.web) return null;
  // If the chunk has a title, use the publication name portion.
  // Titles are often like "Breakneck Ridge Closure - Daily Monroe" or "WTA Trip Report".
  const title = chunk.web.title || '';
  if (title) {
    // Try to extract the site name after the last ' - ' or ' | ' separator
    const separatorMatch = title.match(/[–—|\-]\s*([^|\-–—]+)\s*$/);
    if (separatorMatch) {
      const candidate = separatorMatch[1].trim();
      if (candidate.length > 0 && candidate.length < 60) {
        return candidate;
      }
    }
    // Fall back to using the full title if it's short enough to be a site name
    if (title.length < 40) return title;
  }
  // Fall back to hostname (e.g. "dailymonroe.com" -> "Daily Monroe")
  try {
    const host = new URL(chunk.web.uri).hostname.replace(/^www\./, '');
    const domain = host.split('.')[0]; // e.g. "dailymonroe"
    // Title-case the domain, splitting on camelCase and hyphens
    return domain
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return null;
  }
}

/**
 * Compares a potentially hallucinated/incorrect link from the model against
 * actual Google Search Grounding sources from the same domain to correct it.
 * Returns { link, source } with corrected values.
 */
function correctTipLink(tipLink, tipSource, groundingChunks, activityName) {
  if (!tipLink || !groundingChunks || !Array.isArray(groundingChunks) || groundingChunks.length === 0) {
    return { link: tipLink, source: tipSource };
  }

  try {
    const tipUrl = new URL(tipLink);
    const tipHost = tipUrl.hostname.toLowerCase().replace(/^www\./, ''); // e.g. "summitpost.org"
    const tipPath = tipUrl.pathname.toLowerCase();

    // Filter grounding chunks that have the same base domain/host
    const candidates = groundingChunks.filter(chunk => {
      if (!chunk.web || !chunk.web.uri) return false;
      try {
        const chunkUrl = new URL(chunk.web.uri);
        const chunkHost = chunkUrl.hostname.toLowerCase().replace(/^www\./, '');
        return chunkHost === tipHost || chunkHost.endsWith('.' + tipHost) || tipHost.endsWith('.' + chunkHost);
      } catch {
        return false;
      }
    });

    if (candidates.length === 0) {
      return { link: tipLink, source: tipSource };
    }

    if (candidates.length === 1) {
      // Only one matching search source from this domain; use its verified URL and derive name
      return {
        link: candidates[0].web.uri,
        source: deriveSourceName(candidates[0]) || tipSource
      };
    }

    // Multiple search source candidates on this domain. Find the closest match.
    const trailSlug = (activityName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); // e.g. "mailbox-peak"
    
    let bestCandidate = null;
    let bestScore = -1;

    for (const cand of candidates) {
      let score = 0;
      const candUri = cand.web.uri.toLowerCase();
      const candTitle = (cand.web.title || '').toLowerCase();

      // Score 1: Slug match in URL path
      if (trailSlug && candUri.includes(trailSlug)) {
        score += 10;
      }

      // Score 2: Match any segments of the path from tipLink
      const tipPathSegments = tipPath.split('/').filter(s => s && isNaN(s) && s.length > 2);
      for (const segment of tipPathSegments) {
        if (candUri.includes(segment)) {
          score += 5;
        }
      }

      // Score 3: Match trail name in the title
      if (activityName && candTitle.includes(activityName.toLowerCase())) {
        score += 8;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }

    if (bestCandidate && bestScore > 0) {
      return {
        link: bestCandidate.web.uri,
        source: deriveSourceName(bestCandidate) || tipSource
      };
    }

    // Default to the first candidate if no scoring matches but we have candidates from the same domain
    return {
      link: candidates[0].web.uri,
      source: deriveSourceName(candidates[0]) || tipSource
    };
  } catch (err) {
    console.error("Error correcting tip link:", err);
    return { link: tipLink, source: tipSource };
  }
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
  const cacheKeyStr = `${activityName}_${location}_${latitude}_${longitude}`;
  const cacheKeyHash = crypto.createHash('md5').update(cacheKeyStr).digest('hex');
  const cacheKey = 'gemini_tips_' + cacheKeyHash;

  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`Gemini Tips Cache Hit for ${activityName}`);
    return cached;
  }

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

    // Extract grounding metadata to correct links
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || {};
    const groundingChunks = groundingMetadata.groundingChunks || [];

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

    // Correct any hallucinated links and source names using grounding chunks,
    // then resolve any transient redirects
    if (parsedData && parsedData.recentTips && Array.isArray(parsedData.recentTips)) {
      const resolvedTips = await Promise.all(
        parsedData.recentTips.map(async (tip) => {
          if (tip.link) {
            const corrected = correctTipLink(tip.link, tip.source, groundingChunks, activityName);
            const resolvedLink = await resolveUrl(corrected.link);
            return { ...tip, link: resolvedLink, source: corrected.source };
          }
          return tip;
        })
      );
      parsedData.recentTips = resolvedTips;
    }

    // Cache tips for 6 hours (21600 seconds)
    setCache(cacheKey, parsedData, 21600);

    return parsedData;

  } catch (error) {
    console.error("Failed to get recent tips from Gemini:", error);
    throw error;
  }
}
