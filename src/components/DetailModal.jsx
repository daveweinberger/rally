import { useEffect, useState, useRef } from 'react';
import { X, MapPin, AlertTriangle, Route, ExternalLink, RefreshCw } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase.js';
import Attribution from './Attribution.jsx';

const cleanPlaceId = (id) => id ? id.replace(/^places\//, '') : '';

function isAttributionMatch(activityName, activityPlaceId, chunkMaps) {
  if (!chunkMaps) return false;
  
  // 1. Precise Match by Google Maps placeId
  const aPlaceId = cleanPlaceId(activityPlaceId);
  const cPlaceId = cleanPlaceId(chunkMaps.placeId);
  if (aPlaceId && cPlaceId && aPlaceId === cPlaceId) {
    return true;
  }
  
  // 2. Fallback Looser Title Comparison (handling suffixes and parentheticals)
  const aName = activityName || '';
  const cName = chunkMaps.title || '';
  
  const clean = (s) => s.toLowerCase()
    .replace(/\([^)]*\)/g, '') // remove parentheticals
    .replace(/[^a-z0-9\s]/g, '') // remove punctuation
    .replace(/\b(trail|trailhead|parking|hike|loop|highway|route)\b/g, '') // remove trailing search suffixes
    .replace(/\s+/g, ' ') // normalize spaces
    .trim();
    
  const cleanA = clean(aName);
  const cleanC = clean(cName);
  
  if (!cleanA || !cleanC) return false;
  return cleanA.includes(cleanC) || cleanC.includes(cleanA);
}

const formatSource = (source, link) => {
  if (!link) return source || 'Source';

  if (link.includes('govdelivery.com')) {
    const match = link.match(/\/accounts\/([^/]+)/i);
    if (match && match[1]) {
      const account = match[1].toUpperCase();
      if (account === 'ORDOT' || account === 'ODOT') {
        return 'Oregon Department of Transportation';
      }
      if (account === 'WSDOT' || account === 'WADOT') {
        return 'Washington State Department of Transportation';
      }
      if (account === 'MNDOT') {
        return 'Minnesota Department of Transportation';
      }
      if (account === 'USDAFS' || account === 'USFS') {
        return 'U.S. Forest Service';
      }
      if (account === 'NPS') {
        return 'National Park Service';
      }
      return `${account} (via GovDelivery)`;
    }
    return source || 'GovDelivery';
  }

  return source || 'Source';
};

export default function DetailModal({ activity, onClose, generalAttribution, onUpdateActivity }) {
  const [localItinerary, setLocalItinerary] = useState([]);
  const [localTips, setLocalTips] = useState([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsFetched, setTipsFetched] = useState(false);
  const [tipsError, setTipsError] = useState(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (activity) {
      setLocalItinerary(activity.itinerary || []);
      setLocalTips(activity.recentTips || []);
      // If the tips were already fetched (e.g. have [Live] or are from the live endpoint), we can mark it
      const hasLiveTips = (activity.recentTips || []).some(t => t.text && (t.text.includes('[Live') || t.text.includes('[Live Mock]')));
      setTipsFetched(hasLiveTips);
      setTipsError(null);
    } else {
      setLocalItinerary([]);
      setLocalTips([]);
      setTipsFetched(false);
      setTipsError(null);
    }
  }, [activity]);

  const handleFetchLiveTips = async () => {
    if (tipsLoading || !activity) return;
    setTipsLoading(true);
    setTipsError(null);
    try {
      const fetchFn = httpsCallable(functions, 'fetchRecentTips');
      const response = await fetchFn({
        activityName: activity.name,
        location: activity.location,
        latitude: activity.latitude,
        longitude: activity.longitude
      });
      if (response.data && response.data.recentTips) {
        const freshTips = response.data.recentTips;
        setLocalTips(freshTips);
        setTipsFetched(true);
        if (onUpdateActivity) {
          onUpdateActivity({
            ...activity,
            recentTips: freshTips
          });
        }
      } else {
        throw new Error("No recent tips returned.");
      }
    } catch (err) {
      console.error("Failed to fetch live tips:", err);
      setTipsError("Failed to fetch live reports. Please try again.");
    } finally {
      setTipsLoading(false);
    }
  };

  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const modalRef = useRef(null);

  // Focus trap, Escape-dismiss, and focus restoration
  useEffect(() => {
    const previousFocus = document.activeElement;
    const modalElement = modalRef.current;
    
    if (modalElement) {
      const focusableElements = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalElement) return;
        const focusableElements = modalElement.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (totalMinutes) => {
    const normalized = (totalMinutes + 24 * 60) % (24 * 60);
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleTimeChange = (index, newTimeStr) => {
    if (!newTimeStr || !localItinerary[index]) return;
    const oldTimeMinutes = timeToMinutes(localItinerary[index].time);
    const newTimeMinutes = timeToMinutes(newTimeStr);
    const delta = newTimeMinutes - oldTimeMinutes;
    
    setLocalItinerary(prev => prev.map(item => ({
      ...item,
      time: minutesToTime(timeToMinutes(item.time) + delta)
    })));
  };

  if (!activity) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        ref={modalRef}
        className="modal-container" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem' }}>
          <div className="flex-col" style={{ maxWidth: '85%' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-moss)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Adventure Details
            </span>
            <h2 id="modal-title" style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'none', margin: '4px 0 0 0' }}>
              {activity.name}
            </h2>
            <div className="row align-center gap-sm" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
              <MapPin size={12} color="var(--text-muted)" />
              <span>{activity.location}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="touch-target-44"
            aria-label="Close details modal"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', paddingRight: '4px', paddingBottom: '8px' }}>
          
          {/* Match Reason */}
          <div className="flex-col gap-sm">
            <h3 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Why it matches your plan
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {activity.matchReason}
            </p>
          </div>

          {/* Telemetry Numbers Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            textAlign: 'center'
          }}>
            <div className="flex-col">
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Drive Time</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>{activity.driveTime}</span>
            </div>
            <div className="flex-col" style={{ borderLeft: '1px dashed rgba(255, 255, 255, 0.12)', borderRight: '1px dashed rgba(255, 255, 255, 0.12)' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Distance</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>{activity.distance}</span>
            </div>
            <div className="flex-col">
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Skill Rating</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px', color: 'var(--accent-moss)' }}>{activity.difficulty}</span>
            </div>
          </div>

          {/* Hazard Telemetry (Warnings) */}
          {activity.warnings && activity.warnings.length > 0 && (
            <div style={{
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: '12px',
              padding: '0.85rem'
            }}>
              <div className="row align-center gap-sm" style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                <AlertTriangle size={14} />
                <span>Important Cautions</span>
              </div>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {activity.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Relaxed constraints alert */}
          {activity.relaxedConstraints && activity.relaxedConstraints.length > 0 && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--accent-moss)',
              background: 'rgba(72, 178, 124, 0.04)',
              padding: '0.85rem 1rem',
              border: '1px dashed rgba(72, 178, 124, 0.25)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>Adjusted Constraints</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.45, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activity.relaxedConstraints.map((constraint, idx) => {
                  const colonIndex = constraint.indexOf(':');
                  if (colonIndex !== -1) {
                    const name = constraint.substring(0, colonIndex).trim();
                    const desc = constraint.substring(colonIndex + 1).trim();
                    return (
                      <li key={idx} style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>: {desc}
                      </li>
                    );
                  }
                  return <li key={idx} style={{ color: 'var(--text-secondary)' }}>{constraint}</li>;
                })}
              </ul>
            </div>
          )}

          {/* Chronological Itinerary */}
          {localItinerary && localItinerary.length > 0 && (
            <div className="flex-col gap-sm">
              <h3 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Suggested Timeline
              </h3>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '0.85rem 1.15rem'
              }}>
                {localItinerary.map((item, idx) => (
                  <div key={idx} className="telemetry-row" style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0' }}>
                    <div style={{ width: '125px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <input
                        type="time"
                        value={item.time}
                        onChange={(e) => handleTimeChange(idx, e.target.value)}
                        style={{
                          background: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '16px',
                          padding: '4px 6px',
                          outline: 'none',
                          cursor: 'pointer',
                          width: '100%',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          transition: 'border-color 0.2s, background-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-moss)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                      />
                    </div>
                    <span className="telemetry-val" style={{ textAlign: 'left', fontSize: '0.88rem', flex: 1, marginLeft: '16px' }}>
                      {item.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditions reports */}
          {localTips && localTips.length > 0 && (
            <div className="flex-col gap-sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                  Recent Reports & Tips
                </h3>
              </div>
              
              {/* Existing Tips list */}
              {localTips && localTips.length > 0 && (
                <div className="flex-col gap-sm" style={{ gap: '10px' }}>
                  {localTips.map((tip, idx) => {
                    const tipText = typeof tip === 'object' ? tip.text : tip;
                    const tipDate = typeof tip === 'object' ? tip.date : null;
                    const rawSource = typeof tip === 'object' ? tip.source : null;
                    const tipLink = typeof tip === 'object' ? tip.link : null;
                    const tipSource = formatSource(rawSource, tipLink);

                    const isVerbatim = typeof tip === 'object' && tip.isVerbatim === true;

                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          fontSize: '0.82rem',
                          lineHeight: 1.45,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          transition: 'border-color 0.2s, opacity 0.3s',
                          opacity: tipsLoading ? 0.65 : 1,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(72, 178, 124, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                      >
                        {isVerbatim ? (
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            "{tipText}"
                          </p>
                        ) : (
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'normal' }}>
                            {tipText}
                          </p>
                        )}
                        {(tipSource || tipDate) && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                            {tipSource && (
                              <>
                                {tipLink ? (
                                  <a 
                                    href={tipLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ 
                                      color: 'var(--accent-moss)', 
                                      textDecoration: 'none', 
                                      fontWeight: 600,
                                      display: 'inline'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                  >
                                    {tipSource}
                                    <ExternalLink size={10} style={{ display: 'inline-block', marginLeft: '3px', verticalAlign: 'middle', opacity: 0.8, marginBottom: '2px' }} />
                                  </a>
                                ) : (
                                  <span style={{ fontWeight: 600 }}>{tipSource}</span>
                                )}
                              </>
                            )}
                            {tipSource && tipDate && <span> • </span>}
                            {tipDate && <span>{tipDate}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Error display */}
              {tipsError && !tipsLoading && (
                <div style={{ 
                  fontSize: '0.82rem', 
                  color: '#f87171', 
                  background: 'rgba(248, 113, 113, 0.05)', 
                  border: '1px solid rgba(248, 113, 113, 0.15)', 
                  borderRadius: '10px', 
                  padding: '0.85rem 1rem',
                  textAlign: 'center',
                  marginTop: '10px'
                }}>
                  {tipsError}
                </div>
              )}

              <button
                onClick={handleFetchLiveTips}
                disabled={tipsLoading}
                style={{
                  background: 'rgba(72, 178, 124, 0.1)',
                  border: '1px solid rgba(72, 178, 124, 0.5)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  color: 'var(--accent-moss)',
                  fontWeight: 600,
                  cursor: tipsLoading ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  transition: 'all 0.2s',
                  opacity: tipsLoading ? 0.6 : 1,
                  marginTop: '4px',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!tipsLoading) {
                    e.currentTarget.style.background = 'rgba(72, 178, 124, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!tipsLoading) {
                    e.currentTarget.style.background = 'rgba(72, 178, 124, 0.1)';
                  }
                }}
              >
                <RefreshCw size={14} style={{ animation: tipsLoading ? 'spin 1s linear infinite' : 'none' }} />
                <span>{tipsLoading ? 'Searching live sources...' : tipsFetched ? 'Check for newer live reports' : 'Fetch Live Community Reports'}</span>
              </button>
            </div>
          )}

          {/* Compliant Maps Attribution */}
          {generalAttribution && (
            <Attribution 
              groundingMetadata={{
                groundingChunks: generalAttribution.groundingChunks?.filter(chunk => {
                  if (chunk.maps) {
                    return isAttributionMatch(activity.name, activity.placeId, chunk.maps);
                  }
                  return false;
                }) || [],
                searchEntryPoint: null
              }}
            />
          )}
        </div>

        {/* Directions CTA Button */}
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.name ? `${activity.name}, ${activity.location}` : `${activity.latitude},${activity.longitude}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-btn glass-btn-primary"
          style={{ width: '100%', textDecoration: 'none', gap: '8px' }}
        >
          <Route size={16} />
          <span>Let's Go</span>
        </a>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
