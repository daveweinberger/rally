/* global process */
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT, RESPONSE_SCHEMA } from './systemPrompt.js';

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
        "Trail is muddy past mile 2, but snow is fully melted as of 2 days ago.",
        "Parking lot is full by 8:30 AM on sunny Saturdays. Get there early!"
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
        "Trail is dry and in excellent condition. Expect crowds after 10 AM.",
        "Porta-potties at the trailhead are open and clean."
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
        "Trail conditions are good. Wildflowers are blooming.",
        "No active closures reported in the area."
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
    return {
      data: isSeattle ? SEATTLE_MOCK : GENERIC_MOCK(constraints.startLocation || 'Your Location'),
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
    weatherInfo = `\n- Starting Location Weather Forecast for target date: ${startWeather.condition}, temperature high ${startWeather.maxTemp}°F, low ${startWeather.minTemp}°F, chance of rain: ${startWeather.rainProbability}%. Use this forecast to evaluate nearby trails. Avoid recommending trails in areas with active rain/precipitation if alternatives with better weather are available.`;
  }

  const schemaString = JSON.stringify(RESPONSE_SCHEMA, null, 2);
  const prompt = `
Recommend 3 to 4 outdoor activities matching these user constraints:${weatherInfo}
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
      model: 'gemini-2.5-flash',
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
      parsedData = stripCitations(JSON.parse(cleanText));
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
export async function getRefinementStream(history, newMessage, onChunk) {
  const ai = getGenAIClient();

  // Map history to Gemini format: { role: 'user'|'model', parts: [{ text: string }] }
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  
  // Add the new user message only if it is not already the last message in history
  const lastMsg = history[history.length - 1];
  const isLastMsgUserNewMessage = lastMsg && lastMsg.role === 'user' && lastMsg.content === newMessage;
  
  if (!isLastMsgUserNewMessage) {
    contents.push({
      role: 'user',
      parts: [{ text: newMessage }]
    });
  }

  if (!ai) {
    console.warn("GEMINI_API_KEY is not set or placeholder. Streaming mock chat responses.");
    // Simulate streaming for mock response
    const mockResponseText = `Sure! I can help you refine your choices. If you want a closer hike than Snow Lake, I'd suggest checking out **Franklin Falls**. It's just a 45-minute drive from Seattle (right off Exit 47 on I-90). 
    
    It is an easy 2-mile round trip hike with very little elevation gain, featuring a beautiful 70-foot waterfall. It fits perfectly within a half-day window and is highly recommended for all skill levels! Let me know if you want me to update the itinerary for Franklin Falls instead!`;
    
    const chunks = mockResponseText.split(' ');
    for (const chunk of chunks) {
      onChunk(chunk + " ");
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    
    return {
      text: mockResponseText,
      groundingMetadata: {
        searchEntryPoint: {
          renderedContent: "<a href='https://www.google.com/search?q=Franklin+Falls+conditions' target='_blank'>Search Google for Franklin Falls conditions</a>"
        }
      }
    };
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT + "\n\nThis is a chat refinement phase. Respond in natural markdown format. Focus on helping the user adjust the recommendations based on their new request.",
        tools: [
          { googleMaps: {} }
        ]
      }
    });

    let fullText = "";
    let finalCandidate = null;

    for await (const chunk of responseStream) {
      const textChunk = chunk.text;
      if (textChunk) {
        fullText += textChunk;
        onChunk(textChunk);
      }
      if (chunk.candidates?.[0]) {
        finalCandidate = chunk.candidates[0];
      }
    }

    return {
      text: stripCitations(fullText),
      groundingMetadata: finalCandidate?.groundingMetadata || {}
    };

  } catch (error) {
    console.error("Gemini streaming failed:", error);
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
