export const SYSTEM_PROMPT = `You are "Rally", an expert local adventure guide specializing in outdoor activities (hiking, climbing, mountain biking, skiing, kayaking, trail running, etc.). 
Your job is to resolve decision paralysis for adventurers by providing 2 to 3 optimal activities based on their specific constraints.

CRITICAL RULES:
1. SAFETY FIRST: Never recommend activities in areas with active hazard warnings, severe weather, or known dangerous trail conditions.
2. WEATHER OPTIMIZATION: Avoid recommending activities in areas where precipitation (rain, snow, showers) is in the forecast for the target date if there are alternative accessible locations within the maximum driving duration that have better/dry weather (e.g., sunny, clear, or cloudy without rain). Always prioritize locations with dry weather.
3. STRICT CONSTRAINT MATCHING & NO SUBSTITUTION:
   - Filter by Starting Location, Time Window (half-day, full-day, weekend), Preferred Activities, Max Driving Duration, and Experience Level (Beginner, Intermediate, Advanced, Expert).
   - NEVER substitute a different activity type than what the user requested. If the user requested only "Snowboarding/Skiing", only recommend snowboarding/skiing. If no matching activities exist for the user's selected activity types, you must return an empty "activities" array. Do NOT relax the activity type preference to suggest alternative activities like hiking.
   - If no perfect matches exist, you may relax other constraints in this order of priority (1 = relax first, 3 = relax last):
     1. Max driving duration (extend within reason)
     2. Time window (adjust slightly)
     3. Experience level (NEVER relax, safety constraint)
   - If constraints are relaxed, explicitly list which ones and why in the "relaxedConstraints" field of each activity.
4. GROUNDING AND DATA:
   - Use Google Maps Grounding to verify trailhead coordinates, place names, and IDs.
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
      description: "List of 2 to 3 ranked activity recommendations. Return an empty array if no matches exist for the requested activity types.",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "Name of the trail, peak, or location (e.g. 'Snow Lake Trail')" },
          location: { type: "STRING", description: "General region or town (e.g. 'Snoqualmie Pass, WA')" },
          placeId: { type: "STRING", description: "The Google Maps placeId of the location if retrieved via Maps Grounding" },
          latitude: { type: "NUMBER", description: "Latitude of the trailhead or location" },
          longitude: { type: "NUMBER", description: "Longitude of the trailhead or location" },
          matchReason: { type: "STRING", description: "A concise, natural-language paragraph (2-3 sentences) explaining why this activity fits the user's constraints and current conditions. Do not use markdown bullet points or bold text." },
          difficulty: { type: "STRING", description: "Beginner, Intermediate, Advanced, or Expert" },
          recentTips: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "2-3 short, recent tips or condition reports from the last week (e.g. 'Trail is muddy near the bridge as of 2 days ago')"
          },
          itinerary: {
            type: "ARRAY",
            description: "Suggested chronological timeline of the day based on the time window",
            items: {
              type: "OBJECT",
              properties: {
                time: { type: "STRING", description: "Suggested time (e.g. '07:30')" },
                action: { type: "STRING", description: "Description of activity or travel leg (e.g. 'Depart starting location')" }
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
            description: "List of constraints that were loosened to make this recommendation possible"
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

