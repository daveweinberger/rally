// Client-side mock data provider for standalone local development when backend is offline

const SEATTLE_MOCK = {
  results: [
    {
      name: "Snow Lake Trail",
      location: "Snoqualmie Pass, WA",
      placeId: "ChIJRecZYL8VkFQR9N4a464646",
      latitude: 47.4418,
      longitude: -121.4234,
      matchReason: "Moderate difficulty matches your intermediate level. Under 1 hour drive from Seattle. Dog-friendly and features a beautiful alpine lake.",
      difficulty: "Intermediate",
      driveTime: "52 mins",
      distance: "31.1 mi",
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
      driveTime: "45 mins",
      distance: "28.5 mi",
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
  generalExplanation: "Snoqualmie Pass has clear weather today with highs around 65°F. Traffic on I-90 is flowing smoothly with typical weekend trailhead congestion near North Bend. Both options fit well within your parameters.",
  groundingMetadata: {
    searchEntryPoint: null,
    groundingChunks: [
      {
        maps: {
          title: "Snow Lake Trail",
          uri: "https://maps.google.com/?cid=123"
        }
      },
      {
        maps: {
          title: "Rattlesnake Ledge",
          uri: "https://maps.google.com/?cid=456"
        }
      }
    ]
  }
};

const GENERIC_MOCK = (location) => {
  const cleanLocation = (location || '').toLowerCase().includes('gps') || 
                        (location || '').toLowerCase().includes('current')
    ? 'Cascade Mountains'
    : location;
    
  return {
    results: [
      {
        name: "Peak Explorer Trail",
        location: `${cleanLocation}`,
        placeId: "mock_place_1",
        latitude: 45.0,
        longitude: -122.0,
        matchReason: `Great local option near ${cleanLocation} matching your experience level. Fits driving and time parameters.`,
        difficulty: "Intermediate",
        driveTime: "40 mins",
        distance: "22 mi",
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
          { time: "08:00", action: `Depart starting point` },
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
      },
      {
        name: "Forest Loop Pathway",
        location: `${cleanLocation}`,
        placeId: "mock_place_2",
        latitude: 45.1,
        longitude: -122.1,
        matchReason: `An alternative scenic valley walk near ${cleanLocation} with zero elevation gain.`,
        difficulty: "Beginner",
        driveTime: "30 mins",
        distance: "15 mi",
        recentTips: [
          {
            text: "Perfect for a relaxed day. Dog friendly.",
            date: "yesterday",
            source: "AllTrails",
            link: "https://www.alltrails.com"
          },
          {
            text: "Shaded forest trail keeps it cool in hot weather.",
            date: "5 days ago",
            source: "WTA",
            link: "https://www.wta.org"
          }
        ],
        itinerary: [
          { time: "09:00", action: `Depart starting point` },
          { time: "09:30", action: "Arrive at path loop entrance" },
          { time: "09:45", action: "Begin walking loop" },
          { time: "11:00", action: "Snack stop at the creek crossing" },
          { time: "12:00", action: "Complete loop, return home" }
        ],
        warnings: [],
        relaxedConstraints: []
      }
    ],
    generalExplanation: `Generated adventure options for ${cleanLocation}. Safe trail conditions, mild weather forecast, and minimal traffic delays.`,
    groundingMetadata: {
      searchEntryPoint: null,
      groundingChunks: []
    }
  };
};

export function getMockRecommendations(constraints) {
  const isSeattle = (constraints.startLocation || '').toLowerCase().includes('seattle') || 
                    (constraints.startLocation || '').toLowerCase().includes('wa') ||
                    (constraints.startLocation || '').toLowerCase().includes('gps');

  // Standalone mode simulation of empty results for snowboarding/skiing in summer
  const onlySkiing = constraints.activities?.length === 1 && constraints.activities[0] === 'Snowboarding/Skiing';
  const isSummer = (constraints.targetDay || '').toLowerCase().includes('jun') || 
                   (constraints.targetDay || '').toLowerCase().includes('jul') ||
                   (constraints.targetDay || '').toLowerCase().includes('aug') ||
                   (constraints.targetDay || '').toLowerCase().includes('sep');

  if (onlySkiing && isSummer) {
    return {
      results: [],
      generalExplanation: "Snowboarding/Skiing is currently unavailable in the Seattle area during summer months.",
      noResultsExplanation: "Snowboarding/Skiing is currently out of season in the Seattle region during summer. Nearby resorts like Snoqualmie and Stevens Pass are closed. Consider trying Hiking, Mountain Biking, or Kayaking which are fully available right now.",
      groundingMetadata: {
        searchEntryPoint: null,
        groundingChunks: []
      }
    };
  }

  return isSeattle ? SEATTLE_MOCK : GENERIC_MOCK(constraints.startLocation || 'Your Location');
}

export async function simulateMockRefinementStream(onChunk) {
  const mockResponseText = `I have updated your options based on the refinement request! If you want a closer hike, I recommend **Franklin Falls**. It's just a 45-minute drive from Seattle (right off Exit 47 on I-90). 
  
  It is an easy 2-mile round trip hike with very little elevation gain, featuring a beautiful 70-foot waterfall. It fits perfectly within a half-day window and is highly recommended for all skill levels! Let me know if you want me to update the itinerary for Franklin Falls instead!`;
  
  const chunks = mockResponseText.split(/(\s+)/);
  let accumulated = "";
  for (const chunk of chunks) {
    accumulated += chunk;
    onChunk(chunk);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  
  return {
    text: mockResponseText,
    results: [
      {
        name: "Franklin Falls",
        location: "Snoqualmie Pass, WA",
        placeId: "ChIJ7777777777777777777",
        latitude: 47.3976,
        longitude: -121.4426,
        matchReason: "A much closer option, only a 45-minute drive from Seattle. Easy 2-mile walk to a spectacular 70-foot waterfall.",
        difficulty: "Beginner",
        driveTime: "45 mins",
        distance: "28.5 mi",
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
    generalExplanation: "Snoqualmie Pass weather is clear today, typical trailhead crowds. Driving time is under 45 minutes.",
    groundingMetadata: {
      searchEntryPoint: null,
      groundingChunks: [
        {
          maps: {
            title: "Franklin Falls",
            uri: "https://maps.google.com/?cid=789"
          }
        }
      ]
    }
  };
}
