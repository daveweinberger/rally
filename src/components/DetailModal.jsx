import { useEffect } from 'react';
import { X, MapPin, AlertTriangle, Route, ExternalLink } from 'lucide-react';
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

export default function DetailModal({ activity, onClose, generalAttribution, constraints }) {
  const origin = constraints?.startCoords
    ? `${constraints.startCoords.latitude},${constraints.startCoords.longitude}`
    : (constraints?.startLocation || 'Seattle, WA');

  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!activity) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem' }}>
          <div className="flex-col" style={{ maxWidth: '85%' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-moss)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Adventure Details
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'none', margin: '4px 0 0 0' }}>
              {activity.name}
            </h2>
            <div className="row align-center gap-sm" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
              <MapPin size={12} color="var(--text-muted)" />
              <span>{activity.location}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
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
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.12)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.06)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', paddingRight: '4px' }}>
          
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

          {/* Relaxed constraints badge */}
          {activity.relaxedConstraints && activity.relaxedConstraints.length > 0 && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--accent-moss)',
              background: 'rgba(72, 178, 124, 0.05)',
              padding: '6px 12px',
              border: '1px dashed rgba(72, 178, 124, 0.25)',
              borderRadius: '8px'
            }}>
              Note: Adjusted parameters ({activity.relaxedConstraints.join(', ')}) to find matching activities.
            </div>
          )}

          {/* Chronological Itinerary */}
          {activity.itinerary && activity.itinerary.length > 0 && (
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
                {activity.itinerary.map((item, idx) => (
                  <div key={idx} className="telemetry-row">
                    <span className="telemetry-label" style={{ fontWeight: 600 }}>
                      {item.time}
                    </span>
                    <span className="telemetry-val" style={{ textAlign: 'right' }}>
                      {item.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditions reports */}
          {activity.recentTips && activity.recentTips.length > 0 && (
            <div className="flex-col gap-sm">
              <h3 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Recent Reports & Tips
              </h3>
              <div className="flex-col gap-sm" style={{ gap: '10px' }}>
                {activity.recentTips.map((tip, idx) => {
                  const tipText = typeof tip === 'object' ? tip.text : tip;
                  const tipDate = typeof tip === 'object' ? tip.date : null;
                  const tipSource = typeof tip === 'object' ? tip.source : null;
                  const tipLink = typeof tip === 'object' ? tip.link : null;

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
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(72, 178, 124, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                    >
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{tipText}"
                      </p>
                      {(tipSource || tipDate) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
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
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                >
                                  <span>{tipSource}</span>
                                  <ExternalLink size={10} style={{ opacity: 0.8 }} />
                                </a>
                              ) : (
                                <span style={{ fontWeight: 600 }}>{tipSource}</span>
                              )}
                            </>
                          )}
                          {tipSource && tipDate && <span>•</span>}
                          {tipDate && <span>{tipDate}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${activity.latitude},${activity.longitude}${activity.placeId ? `&destination_place_id=${activity.placeId}` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-btn glass-btn-primary"
          style={{ width: '100%', textDecoration: 'none', gap: '8px' }}
        >
          <Route size={16} />
          <span>Get Driving Directions</span>
        </a>
      </div>
    </div>
  );
}
