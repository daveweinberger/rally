import { useState, useEffect, useRef, useMemo } from 'react';
import { Compass, Loader2, XCircle } from 'lucide-react';

const detectLocale = (startLocation) => {
  const loc = (startLocation || '').toLowerCase();
  
  const containsWord = (word) => {
    // eslint-disable-next-line no-useless-escape
    const regex = new RegExp(`\\b${word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(loc);
  };

  if (containsWord('seattle') || containsWord('bellevue') || containsWord('tacoma') || containsWord('wa') || containsWord('washington') || containsWord('gps')) {
    return 'PNW'; // Pacific Northwest
  }
  if (containsWord('los angeles') || containsWord('la') || containsWord('san diego') || containsWord('ca') || containsWord('california') || containsWord('san francisco') || containsWord('sf') || containsWord('yosemite')) {
    return 'CA'; // California
  }
  if (containsWord('denver') || containsWord('boulder') || containsWord('co') || containsWord('colorado') || containsWord('aspen') || containsWord('rocky')) {
    return 'CO'; // Colorado
  }
  if (containsWord('portland') || containsWord('or') || containsWord('oregon') || containsWord('hood') || containsWord('bend')) {
    return 'OR'; // Oregon
  }
  if (containsWord('new york') || containsWord('nyc') || containsWord('ny') || containsWord('new jersey') || containsWord('nj') || containsWord('brooklyn') || containsWord('hudson')) {
    return 'NY'; // New York / Tri-State
  }
  return 'GENERIC';
};

const getHyperLocalizedScoutingMessage = (trailName, startLocation) => {
  const trail = trailName.toLowerCase();
  const locale = detectLocale(startLocation);
  
  let routeInfo = 'calculating optimal driving route';
  let weatherInfo = 'checking local weather forecast';
  
  if (locale === 'PNW') {
    if (trail.includes('si') || trail.includes('mailbox') || trail.includes('rattlesnake') || trail.includes('twin falls') || trail.includes('snow lake') || trail.includes('alpental') || trail.includes('snoqualmie') || trail.includes('franklin')) {
      routeInfo = 'checking traffic flow on I-90 East';
    } else if (trail.includes('wallace') || trail.includes('serene') || trail.includes('stevens') || trail.includes('mccausland') || trail.includes('index')) {
      routeInfo = 'checking mountain passes on US-2 East';
    } else if (trail.includes('rainier') || trail.includes('paradise') || trail.includes('sunrise') || trail.includes('skyline') || trail.includes('tolmie') || trail.includes('crystal')) {
      routeInfo = 'monitoring highway delays on I-5 South and WA-410';
    } else if (trail.includes('baker') || trail.includes('artist') || trail.includes('heather') || trail.includes('diablo') || trail.includes('oyster') || trail.includes('anacortes')) {
      routeInfo = 'analyzing highway flow on I-5 North';
    } else if (trail.includes('hurricane') || trail.includes('hoh') || trail.includes('storm king') || trail.includes('rialto') || trail.includes('olympic')) {
      routeInfo = 'checking Bainbridge Ferry schedules and WA-104 delays';
    }
    
    if (trail.includes('rainier') || trail.includes('baker') || trail.includes('paradise') || trail.includes('sunrise') || trail.includes('artist') || trail.includes('stevens') || trail.includes('alpental') || trail.includes('crystal')) {
      weatherInfo = 'measuring summit snowpack levels & freezing heights';
    } else if (trail.includes('lake') || trail.includes('falls') || trail.includes('river') || trail.includes('hoh') || trail.includes('twin')) {
      weatherInfo = 'scouting precipitation levels & water flow conditions';
    } else if (trail.includes('si') || trail.includes('mailbox') || trail.includes('rattlesnake') || trail.includes('storm king') || trail.includes('dome')) {
      weatherInfo = 'analyzing microclimate wind speeds and tree cover';
    } else if (trail.includes('beach') || trail.includes('rialto') || trail.includes('anacortes')) {
      weatherInfo = 'checking coastal tide tables & marine fog index';
    }
  } 
  else if (locale === 'CA') {
    if (trail.includes('angeles') || trail.includes('wilson') || trail.includes('bald') || trail.includes('crest') || trail.includes('gabriel') || trail.includes('switzer')) {
      routeInfo = 'monitoring Angeles Crest Highway (SR-2) traffic flow';
    } else if (trail.includes('yosemite') || trail.includes('half dome') || trail.includes('el capitan') || trail.includes('tuolumne')) {
      routeInfo = 'checking CA-120 West traffic and Yosemite gate times';
    } else if (trail.includes('tahoe') || trail.includes('donner') || trail.includes('el dorado') || trail.includes('truckee') || trail.includes('rubicon')) {
      routeInfo = 'checking mountain pass delays on I-80 East and US-50';
    } else if (trail.includes('malibu') || trail.includes('canyon') || trail.includes('point dume') || trail.includes('solstice') || trail.includes('escondido')) {
      routeInfo = 'checking Pacific Coast Highway (PCH) flow and canyon road blocks';
    } else if (trail.includes('muir') || trail.includes('tamalpais') || trail.includes('stinson') || trail.includes('marin') || trail.includes('diablo')) {
      routeInfo = 'checking Golden Gate Bridge traffic and US-101 flow';
    } else {
      routeInfo = 'calculating highway transit via US-101 or I-5';
    }

    if (trail.includes('yosemite') || trail.includes('tahoe') || trail.includes('bald') || trail.includes('mammoth') || trail.includes('shasta') || trail.includes('sierra')) {
      weatherInfo = 'checking Sierra snowpack depth & high-altitude wind warnings';
    } else if (trail.includes('malibu') || trail.includes('beach') || trail.includes('stinson') || trail.includes('coast') || trail.includes('dume')) {
      weatherInfo = 'monitoring marine layer fog index & coastal surf heights';
    } else if (trail.includes('joshua') || trail.includes('desert') || trail.includes('death valley') || trail.includes('palm springs')) {
      weatherInfo = 'checking extreme desert heat levels & dry wind gusts';
    } else {
      weatherInfo = 'checking local temperature and air quality index';
    }
  }
  else if (locale === 'CO') {
    if (trail.includes('rocky') || trail.includes('estes') || trail.includes('bear lake') || trail.includes('chasm') || trail.includes('longs')) {
      routeInfo = 'checking US-36 West flow and Rocky Mountain park entrance delays';
    } else if (trail.includes('flatirons') || trail.includes('boulder') || trail.includes('chautauqua') || trail.includes('royal arch')) {
      routeInfo = 'monitoring congestion on US-36 East';
    } else if (trail.includes('evans') || trail.includes('bierstadt') || trail.includes('clear creek') || trail.includes('golden') || trail.includes('grays') || trail.includes('torreys')) {
      routeInfo = 'checking mountain passes on I-70 West and Floyd Hill delays';
    } else if (trail.includes('garden of the gods') || trail.includes('pikes') || trail.includes('manitou') || trail.includes('springs')) {
      routeInfo = 'checking I-25 South flow around Colorado Springs';
    } else {
      routeInfo = 'calculating highway flow via I-70 or I-25';
    }

    if (trail.includes('rocky') || trail.includes('summit') || trail.includes('pass') || trail.includes('pikes') || trail.includes('evans') || trail.includes('14er') || trail.includes('longs')) {
      weatherInfo = 'checking high-altitude lightning risks & afternoon storm forecasts';
    } else if (trail.includes('creek') || trail.includes('lake') || trail.includes('canyon')) {
      weatherInfo = 'measuring runoff flow speeds and creek levels';
    } else {
      weatherInfo = 'checking local UV index and mountain forecasts';
    }
  }
  else if (locale === 'OR') {
    if (trail.includes('gorge') || trail.includes('multnomah') || trail.includes('wahclella') || trail.includes('latourell') || trail.includes('beacon')) {
      routeInfo = 'checking traffic flow on I-84 East (Columbia River Highway)';
    } else if (trail.includes('hood') || trail.includes('timberline') || trail.includes('mirror lake') || trail.includes('trillium')) {
      routeInfo = 'checking pass conditions on US-26 East';
    } else if (trail.includes('coast') || trail.includes('cannon') || trail.includes('haystack') || trail.includes('tillamook') || trail.includes('cola')) {
      routeInfo = 'monitoring highway delays on US-26 West and US-101';
    } else {
      routeInfo = 'calculating travel time via I-5 and I-205';
    }

    if (trail.includes('hood') || trail.includes('timberline') || trail.includes('crater') || trail.includes('bachelor')) {
      weatherInfo = 'measuring summit snowpack levels & volcanic freezing lines';
    } else if (trail.includes('multnomah') || trail.includes('falls') || trail.includes('river') || trail.includes('creek')) {
      weatherInfo = 'scouting waterfall spray index & gorge mist levels';
    } else if (trail.includes('coast') || trail.includes('cannon') || trail.includes('beach')) {
      weatherInfo = 'checking Pacific marine layer and local tide forecasts';
    } else {
      weatherInfo = 'checking local rain probability & humidity index';
    }
  }
  else if (locale === 'NY') {
    if (trail.includes('palisades') || trail.includes('state line') || trail.includes('tallman') || trail.includes('closter')) {
      routeInfo = 'checking traffic on Palisades Interstate Parkway North';
    } else if (trail.includes('breakneck') || trail.includes('cold spring') || trail.includes('hudson') || trail.includes('bull hill') || trail.includes('storm king')) {
      routeInfo = 'checking delays on Taconic State Parkway and NY-9D';
    } else if (trail.includes('harriman') || trail.includes('bear mountain') || trail.includes('reeves') || trail.includes('tuxedo')) {
      routeInfo = 'checking flow on I-87 North (NY Thruway) and Seven Lakes Drive';
    } else {
      routeInfo = 'calculating travel times via major bridges and parkways';
    }

    if (trail.includes('hudson') || trail.includes('river') || trail.includes('palisades') || trail.includes('lake')) {
      weatherInfo = 'checking Hudson River wind speeds & humidity index';
    } else {
      weatherInfo = 'checking local temperature and forest humidity warnings';
    }
  }
  else {
    // Generic fallback - uses general regional hints
    if (trail.includes('canyon') || trail.includes('pass') || trail.includes('mountain') || trail.includes('ridge') || trail.includes('summit')) {
      routeInfo = 'checking highway pass flow and elevation changes';
      weatherInfo = 'scouting mountain microclimates & wind advisories';
    } else if (trail.includes('lake') || trail.includes('falls') || trail.includes('river') || trail.includes('creek')) {
      routeInfo = 'calculating optimal driving route';
      weatherInfo = 'checking local precipitation levels & runoff conditions';
    } else if (trail.includes('beach') || trail.includes('coast') || trail.includes('rose')) {
      routeInfo = 'checking coastal road updates';
      weatherInfo = 'monitoring coastal fog index and tide updates';
    }
  }
  
  return `Checking ${trailName}: ${routeInfo}, and ${weatherInfo}...`;
};

const translateMessage = (message, constraints) => {
  if (!message) return '';
  
  // Clean standalone flags
  let clean = message.replace(/\s*\[STANDALONE MODE\]\s*/g, '');
  
  if (clean.startsWith('Analyzing constraints') || clean.startsWith('Constraint Analysis')) {
    const startLoc = constraints?.startLocation || 'your location';
    return `Assessing regional highway flow and scanning for weather anomalies around ${startLoc}...`;
  }
  if (clean.startsWith('Querying Gemini with Google Maps Grounding') || clean.startsWith('Trailhead Discovery')) {
    const loc = constraints?.startLocation || 'your starting point';
    const activities = constraints?.activities?.join(' and ') || 'outdoor activities';
    return `Cross-referencing maps to identify prime ${activities} locations near ${loc}...`;
  }
  if (clean.startsWith('Calculating optimal driving times, routes, and trailhead weather forecasts') || clean.startsWith('Reviewing trailhead')) {
    const startLoc = constraints?.startLocation || 'your starting point';
    return `Plotting transit routes from ${startLoc} and matching with live NOAA satellite data...`;
  }
  if (clean.startsWith('Calculating route & weather for:')) {
    const trailName = clean.replace('Calculating route & weather for:', '').trim().replace(/\.\.\.$/, '');
    return getHyperLocalizedScoutingMessage(trailName, constraints?.startLocation);
  }
  if (clean.startsWith('Simulating Gemini (Maps + Search Grounding)')) {
    const loc = constraints?.startLocation || 'your starting point';
    return `Looking up matching trail candidates relative to ${loc}...`;
  }
  if (clean.startsWith('Simulating Routes API travel timelines')) {
    return `Analyzing driving times and current route options...`;
  }
  
  return clean;
};

const getChecklistStep2 = (startLocation) => {
  const locale = detectLocale(startLocation);
  if (locale === 'PNW') {
    return `Measuring Cascade snowpack & checking Olympic microclimates`;
  }
  if (locale === 'CA') {
    return `Checking Sierra snowpack & coastal marine layers`;
  }
  if (locale === 'CO') {
    return `Scouting high-altitude lightning risks & runoff flow`;
  }
  if (locale === 'OR') {
    return `Checking Mt. Hood snowpack & Columbia Gorge wind alerts`;
  }
  if (locale === 'NY') {
    return `Checking Hudson Valley rain forecasts & river winds`;
  }
  return `Measuring summit snowpack & checking local trailhead weather`;
};

const getChecklistStep3 = (startLocation) => {
  const locale = detectLocale(startLocation);
  if (locale === 'PNW') {
    return `Scouting highway flow on I-90, I-5, and US-2`;
  }
  if (locale === 'CA') {
    return `Scouting traffic flow on I-5, PCH, and US-101`;
  }
  if (locale === 'CO') {
    return `Scouting mountain pass flow on I-70 and I-25`;
  }
  if (locale === 'OR') {
    return `Scouting highway flow on I-84, I-5, and US-26`;
  }
  if (locale === 'NY') {
    return `Checking flow on Palisades Parkway & Taconic State Parkway`;
  }
  return `Calculating travel times and current traffic timelines`;
};

export default function LoadingState({ status, statusMessage, constraints, onCancel }) {
  const [dynamicMessages, setDynamicMessages] = useState([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const step1 = useMemo(() => {
    return `Reviewing ${constraints?.activities?.join(' & ') || 'outdoor activities'} preferences`;
  }, [constraints?.activities]);

  const step2 = useMemo(() => {
    return getChecklistStep2(constraints?.startLocation);
  }, [constraints?.startLocation]);

  const step3 = useMemo(() => {
    return getChecklistStep3(constraints?.startLocation);
  }, [constraints?.startLocation]);

  const displayItems = useMemo(() => {
    return [step1, step2, step3, ...dynamicMessages];
  }, [step1, step2, step3, dynamicMessages]);

  // Log incoming status messages
  useEffect(() => {
    if (statusMessage) {
      const friendlyMsg = translateMessage(statusMessage, constraints);
      if (friendlyMsg) {
        const timeoutId = setTimeout(() => {
          setDynamicMessages(prev => {
            if (
              friendlyMsg === step1 || 
              friendlyMsg === step2 || 
              friendlyMsg === step3 || 
              prev.includes(friendlyMsg)
            ) {
              return prev;
            }
            return [...prev, friendlyMsg];
          });
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [statusMessage, constraints, step1, step2, step3]);

  // Set up interval to cycle through items
  const itemsRef = useRef(displayItems);
  useEffect(() => {
    itemsRef.current = displayItems;
  }, [displayItems]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (itemsRef.current.length > 0) {
        setCurrentItemIndex(prev => (prev + 1) % itemsRef.current.length);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-card flex-col gap-lg" style={{ padding: '2.5rem 2rem', width: '100%' }}>
      {/* Top Header & Spinner */}
      <div className="row justify-between align-center" style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem' }}>
        <div className="row gap-md">
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 
              size={36} 
              color="var(--accent-moss)" 
              style={{ animation: 'spin 1.5s linear infinite', opacity: 0.6 }} 
            />
            <Compass size={16} color="var(--accent-moss)" style={{ position: 'absolute' }} />
          </div>
          <div className="flex-col">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Plan My Rally</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Scouting options from {constraints?.startLocation || 'your location'}
            </span>
          </div>
        </div>
        <span className="glass-label-badge" style={{ color: 'var(--accent-moss)', fontWeight: 600 }}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Single Dynamic Status Line */}
      <div 
        className="row gap-md align-center" 
        style={{ 
          background: 'rgba(16, 25, 20, 0.4)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          minHeight: '4.5rem',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Glow pulsing indicator */}
        <div className="status-dot-container">
          <span className="pulse-green-glow" />
        </div>
        
        {/* Animated text line */}
        <div role="status" aria-live="polite" style={{ flex: 1, overflow: 'hidden' }}>
          {displayItems[currentItemIndex] && (
            <span 
              key={currentItemIndex} 
              className="loading-status-text"
              style={{ 
                fontSize: '0.92rem', 
                color: 'var(--text-primary)',
                fontWeight: 500,
                lineHeight: 1.4,
                display: 'block',
                wordBreak: 'break-word'
              }}
            >
              {displayItems[currentItemIndex]}
            </span>
          )}
        </div>
      </div>

      {onCancel && (
        <div className="row justify-center" style={{ marginTop: '0.5rem' }}>
          <button
            onClick={onCancel}
            className="glass-btn glass-btn-outline"
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
              color: '#e27d7d',
              borderColor: 'rgba(226, 125, 125, 0.25)',
              background: 'rgba(226, 125, 125, 0.04)',
              cursor: 'pointer',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <XCircle size={16} />
            Cancel Search
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from { 
            opacity: 0; 
            transform: translateY(6px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        .loading-status-text {
          animation: fadeSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .status-dot-container {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 16px;
          height: 16px;
        }
        .pulse-green-glow {
          width: 8px;
          height: 8px;
          background-color: var(--accent-moss);
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px var(--accent-moss);
          animation: pulse-glow 2s infinite ease-in-out;
        }
        @keyframes pulse-glow {
          0% { transform: scale(0.95); opacity: 0.6; box-shadow: 0 0 4px var(--accent-moss); }
          50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 12px var(--accent-moss); }
          100% { transform: scale(0.95); opacity: 0.6; box-shadow: 0 0 4px var(--accent-moss); }
        }
      `}} />
    </div>
  );
}
