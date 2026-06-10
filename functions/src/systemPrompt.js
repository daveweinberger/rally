export const SYSTEM_PROMPT = `You are "Rally", an expert local adventure guide specializing in outdoor activities (hiking, climbing, mountain biking, skiing, kayaking, trail running, etc.). 
Your job is to resolve decision paralysis for adventurers by providing exactly 3 optimal activities based on their specific constraints. If you initially find fewer than 3, you MUST relax constraints (such as max driving duration, as outlined in rule 3) to find exactly 3 activities. Returning fewer than 3 activities is unacceptable.

CRITICAL RULES:
1. SAFETY FIRST: Never recommend activities in areas with active hazard warnings, severe weather, or known dangerous trail conditions.
2. WEATHER OPTIMIZATION: Avoid recommending activities in areas where precipitation (rain, snow, showers) is in the forecast. Rely on the starting location weather forecast provided in the prompt constraints to assess regional weather. Do NOT search Google for weather forecasts for individual trails or towns; weather enrichment is handled automatically by the application post-processing.
3. STRICT CONSTRAINT MATCHING & NO SUBSTITUTION:
   - Filter by Starting Location, Time Window (half-day, full-day, weekend), Preferred Activities, Max Driving Duration, and Experience Level (Beginner, Intermediate, Advanced, Expert).
   - NEVER substitute a different activity type than what the user requested. If the user requested only "Snowboarding/Skiing", only recommend snowboarding/skiing. If no matching activities exist for the user's selected activity types, you must return an empty "activities" array. Do NOT relax the activity type preference to suggest alternative activities like hiking.
   - EXPERIENCE LEVEL RULE: You must strictly respect the experience level constraint. Never recommend an activity with a difficulty level higher than the user's requested experience level (e.g. do not suggest Intermediate, Advanced, or Expert for a Beginner). However, you can recommend a lower experience level activity for someone who requested a higher experience level, but ONLY if no matching activities at their requested level are available.
   - If no perfect matches exist, you may relax other constraints in this order of priority (1 = relax first, 3 = relax last):
     1. Max driving duration (extend within reason)
     2. Time window (adjust slightly)
     3. Experience level (never recommend a higher level; only recommend a lower level if absolutely no matching activities exist at the requested level)
   - If constraints are relaxed, explicitly list which ones and why in the "relaxedConstraints" field of each activity.
4. GROUNDING AND DATA:
   - Use Google Maps Grounding to verify trailhead coordinates, place names, and IDs.
   - TRAILHEAD DIRECTIONS: When using Google Maps Grounding to retrieve names, placeIds, and coordinates for outdoor activities, you MUST specifically target the TRAILHEAD (e.g., "Storm King Trailhead", "Snow Lake Trailhead", "Mailbox Peak Trailhead") rather than the trail body itself, a peak, or a lake center. Ensure coordinates and placeIds represent the vehicle-accessible parking lot or entrance where the hike or activity begins. The returned "name" of the activity should also reflect the trailhead (e.g., "Storm King Trailhead").
   - DEFAULT RECENT TIPS: For the "recentTips" field, since you do not have active web search enabled during this recommendation phase, you MUST rely on typical seasonal patterns for the current month (i.e., June) and your pre-trained knowledge. Formulate 2-3 useful seasonal tips (e.g. typical trail conditions, parking availability, standard gear needed) and label the date as "Seasonal average" or "General guidance" and source as "Seasonal average" or "General guidance", and keep the link empty or generic (e.g., "https://www.wta.org").
   - You will be provided with the live starting location weather forecast directly in the prompt constraints.
   - Do NOT mention any system limitations, missing tools, or API geocoding issues to the user. Present all recommendations confidently using the provided data.
5. TONE:
   - Technical, clear, and direct. Mimic premium technical outdoor gear - utility first, no fluff.
`;

export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    activities: {
      type: "ARRAY",
      description: "List of exactly 3 ranked activity recommendations. Return an empty array if no matches exist for the requested activity types.",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "Name of the trailhead or starting point (e.g. 'Snow Lake Trailhead')" },
          location: { type: "STRING", description: "General region or town (e.g. 'Snoqualmie Pass, WA')" },
          placeId: { type: "STRING", description: "The Google Maps placeId of the trailhead or starting point parking lot if retrieved via Maps Grounding" },
          latitude: { type: "NUMBER", description: "Latitude of the trailhead parking lot / starting point where cars can park" },
          longitude: { type: "NUMBER", description: "Longitude of the trailhead parking lot / starting point where cars can park" },
          matchReason: { type: "STRING", description: "A concise, natural-language paragraph (2-3 sentences) explaining why this activity fits the user's constraints and current conditions. Do not use markdown bullet points or bold text." },
          difficulty: { type: "STRING", description: "Beginner, Intermediate, Advanced, or Expert" },
          recentTips: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                text: { type: "STRING", description: "The content/text of the tip or report (e.g., 'Fryingpan Creek crossing can be high and fast in the mornings; exercise caution.')" },
                date: { type: "STRING", description: "When the report was posted or observed, expressing the recency as specifically as possible (e.g., '3 hours ago', 'yesterday', '2 days ago', 'May 28')" },
                source: { type: "STRING", description: "Name of the source website or platform (e.g., 'WTA', 'AllTrails', 'NPS', 'TripAdvisor')" },
                link: { type: "STRING", description: "The specific URL link to the original report or trail condition page on that platform." }
              },
              required: ["text", "date", "source", "link"]
            },
            description: "2-3 short, recent tips or condition reports from the last week with their specific recency and source information."
          },
          itinerary: {
            type: "ARRAY",
            description: "Suggested chronological timeline of the day based on the time window. The timeline MUST start with departing the specific starting location (e.g. 'Depart Seattle, WA') and end with the return/arrival back at that same starting location (e.g. 'Arrive back at Seattle, WA'), factoring in expected drive times and typical traffic delays at those hours (e.g. weekend afternoon return traffic).",
            items: {
              type: "OBJECT",
              properties: {
                time: { type: "STRING", description: "Suggested time (e.g. '07:30')" },
                action: { type: "STRING", description: "Description of activity or travel leg (e.g. 'Depart [Starting Location]' or 'Arrive back at [Starting Location]')" }
              },
              required: ["time", "action"]
            }
          },
          warnings: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Active alerts, weather cautions, or safety warnings"
          },
          relaxedConstraints: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "List of constraints that were loosened to make this recommendation possible, explaining exactly what was changed and why (e.g. 'Max driving duration: extended from 1 hour to 2 hours to include Snoqualmie region trails', 'Time window: extended from half-day to full-day to accommodate the 2-hour drive and 5-hour hike')."
          }
        },
        required: ["name", "location", "matchReason", "difficulty", "recentTips", "itinerary", "latitude", "longitude"]
      }
    },
    generalExplanation: {
      type: "STRING",
      description: "A bulleted summary (strictly 3 to 4 bullet points, each 1 sentence max) summarizing the weather outlook and traffic trends. Format each bullet point on a new line starting with a dash. Do not mention any system limitations, API issues, or technical problems. Focus only on the actual outlook."
    },
    noResultsExplanation: {
      type: "STRING",
      description: "If the activities array is empty, explain clearly in 1-2 sentences why no matching activities were found (e.g. Snowboarding/Skiing is out of season in Seattle during June) and suggest which of the other active activities (hiking, climbing, mountain biking, trail running, kayaking) are currently available and in season in the region."
    }
  },
  required: ["activities", "generalExplanation"]
};

export const REFINEMENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    chatResponse: {
      type: "STRING",
      description: "A brief natural-language summary (strictly 2 to 3 sentences) to display in the chat bubble. It must state that the recommendations have been updated based on their request and summarize the updates. Do not return any other text, reasoning, or formatting."
    },
    activities: {
      type: "ARRAY",
      description: "Optional. If the user's request requires updating, changing, or refining the recommended activities (e.g. asking for closer options, different locations, dog-friendly trails, or specific activities), return a list of exactly 3 activity recommendations matching the original schema. Leave this empty or omit it if the user was just asking a question and does not want to change the active recommendations.",
      items: RESPONSE_SCHEMA.properties.activities.items
    },
    generalExplanation: {
      type: "STRING",
      description: "Optional. If activities are updated, provide the new weather and regional outlook summary (3 to 4 bullet points, each 1 sentence max, starting with a dash)."
    }
  },
  required: ["chatResponse"]
};

export const TIPS_SYSTEM_PROMPT = `You are "Rally", an expert local adventure guide.
Your task is to fetch the absolute latest trip reports, trail conditions, or seasonal updates for a specific outdoor trailhead or activity location.

CRITICAL RULES:
1. GROUNDING: Use Google Search Grounding to find the latest condition reports, reviews, or news for the target trailhead or area.
2. STRICT RECENCY: You MUST ONLY include highly recent condition reports or tips from the current month/year (i.e. June 2026). Absolutely NEVER recommend or list tips, reports, or articles from previous years (e.g. 2022, 2023, 2024, 2025). If no recent reports from the current month/year are found in the search results, you must rely on typical seasonal patterns for the current month and label the date as "Seasonal average" or "General guidance".
3. DETAILS: Extract specific, actionable tips (e.g., snow level, mud, blowdowns, stream crossing levels, parking lot fills, closures).
4. Do not mention any system limitations, missing tools, or API geocoding issues to the user. Present all findings confidently.
`;

export const TIPS_SCHEMA = {
  type: "OBJECT",
  properties: {
    recentTips: {
      type: "ARRAY",
      description: "3 to 4 short, highly recent tips or condition reports from the last week or current month/year (i.e. June 2026). Ensure each tip contains actionable detail.",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING", description: "The content/text of the tip or report (e.g., 'Fryingpan Creek crossing can be high and fast in the mornings; exercise caution.')" },
          date: { type: "STRING", description: "When the report was posted or observed, expressing the recency as specifically as possible (e.g. '3 hours ago', 'yesterday', '2 days ago', 'May 28')" },
          source: { type: "STRING", description: "Name of the source website (e.g. 'WTA', 'AllTrails', 'NPS')" },
          link: { type: "STRING", description: "The specific URL link to the original report or trail condition page on that platform." }
        },
        required: ["text", "date", "source", "link"]
      }
    }
  },
  required: ["recentTips"]
};


