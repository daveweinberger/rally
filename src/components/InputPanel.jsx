import { useState, useEffect, useRef } from 'react';
import { Navigation, Clock, Compass, Locate, Calendar, ChevronDown, AlertTriangle } from 'lucide-react';
import { getActivitySeasonStatus } from '../utils/seasonalUtils.js';

const TIME_OPTIONS = [
  { value: 'Half day (4h)', label: 'Half Day (~4h)' },
  { value: 'Full day (8h)', label: 'Full Day (~8h)' },
  { value: 'Weekend', label: 'Multi-Day (Weekend)' }
];

const DRIVE_OPTIONS = [
  { value: '30 minutes', label: '< 30 Minutes' },
  { value: '1 hour', label: '< 1 Hour' },
  { value: '1.5 hours', label: '< 1.5 Hours' },
  { value: '2 hours', label: '< 2 Hours' },
  { value: '3+ hours', label: '3+ Hours' }
];

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const ACTIVITY_OPTIONS = [
  { id: 'Hiking', label: 'Hiking' },
  { id: 'Climbing', label: 'Climbing' },
  { id: 'Mountain Biking', label: 'MTB' },
  { id: 'Trail Running', label: 'Trail Run' },
  { id: 'Snowboarding/Skiing', label: 'Ski/Snowboard' },
  { id: 'Kayaking', label: 'Paddle/Kayak' }
];

const getUpcomingDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    let label;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else {
      label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    const value = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    days.push({ value, label });
  }
  return days;
};

function CustomDropdown({ value, options, onChange, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className="glass-input custom-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '2.5rem',
          paddingRight: '1rem',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          position: 'relative'
        }}
      >
        {Icon && <Icon size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-secondary)' }} />}
        <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedOption.label}</span>
        <ChevronDown size={16} style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>

      {isOpen && (
        <div
          className="custom-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            zIndex: 10,
            overflow: 'hidden',
            maxHeight: '260px',
            overflowY: 'auto',
            animation: 'dropdownFadeIn 0.15s ease both'
          }}
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`custom-dropdown-option ${isSelected ? 'active' : ''}`}
                style={{
                  padding: '0.75rem 1.15rem',
                  fontSize: '0.9rem',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  background: isSelected ? 'var(--accent-moss)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: isSelected ? 600 : 500
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.target.style.background = 'transparent';
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InputPanel({ onSubmit, initialConstraints }) {
  const upcomingDays = getUpcomingDays();
  
  const [startLocation, setStartLocation] = useState(initialConstraints?.startLocation || 'Seattle, WA');
  const [startCoords, setStartCoords] = useState(initialConstraints?.startCoords || null);
  const [isLocating, setIsLocating] = useState(false);
  const [timeWindow, setTimeWindow] = useState(initialConstraints?.timeWindow || 'Full day (8h)');
  const [targetDay, setTargetDay] = useState(initialConstraints?.targetDay || upcomingDays[0].value);
  const [selectedActivities, setSelectedActivities] = useState(initialConstraints?.activities || ['Hiking']);
  const [maxDriveTime, setMaxDriveTime] = useState(initialConstraints?.maxDriveTime || '1.5 hours');
  const [experienceLevel, setExperienceLevel] = useState(initialConstraints?.experienceLevel || 'Intermediate');
  const [notes, setNotes] = useState(initialConstraints?.notes || '');
  const [validationError, setValidationError] = useState('');

  const toggleActivity = (activity) => {
    const seasonStatus = getActivitySeasonStatus(activity, targetDay, startCoords?.latitude, startLocation);
    if (seasonStatus === 'off-season') {
      return;
    }
    if (selectedActivities.includes(activity)) {
      if (selectedActivities.length > 1) {
        setSelectedActivities(selectedActivities.filter(a => a !== activity));
      }
    } else {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };

  const filterOffSeasonActivities = (day, locText, coords) => {
    setSelectedActivities(prev => {
      const valid = prev.filter(activity => {
        const status = getActivitySeasonStatus(activity, day, coords?.latitude, locText);
        return status !== 'off-season';
      });
      if (valid.length === 0) return ['Hiking'];
      const changed = valid.length !== prev.length || valid.some((v, i) => v !== prev[i]);
      return changed ? valid : prev;
    });
  };

  const handleTargetDayChange = (newDay) => {
    setTargetDay(newDay);
    filterOffSeasonActivities(newDay, startLocation, startCoords);
  };

  const handleLocationChange = (val) => {
    setStartLocation(val);
    if (startCoords) {
      setStartCoords(null);
    }
    filterOffSeasonActivities(targetDay, val, null);
  };

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setValidationError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setValidationError('');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { latitude, longitude };
        setStartCoords(coords);
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Rally-Adventure-Planner'
              }
            }
          );
          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            const placeName = address.city || 
                              address.town || 
                              address.village || 
                              address.hamlet ||
                              address.suburb || 
                              address.county || 
                              'Current Location';
            
            const state = address.state || '';
            const formattedLocation = state 
              ? `${placeName}, ${state}` 
              : placeName;
            
            setStartLocation(formattedLocation);
            filterOffSeasonActivities(targetDay, formattedLocation, coords);
          } else {
            setStartLocation('Current Location');
            filterOffSeasonActivities(targetDay, 'Current Location', coords);
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          setStartLocation('Current Location');
          filterOffSeasonActivities(targetDay, 'Current Location', coords);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMsg = 'Failed to retrieve GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please enter an address manually.';
        }
        setValidationError(errorMsg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!startLocation.trim()) {
      setValidationError('Starting location required to calculate routes.');
      return;
    }
    setValidationError('');
    onSubmit({
      startLocation,
      startCoords,
      timeWindow,
      targetDay,
      activities: selectedActivities,
      maxDriveTime,
      experienceLevel,
      notes
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="flex-col gap-lg" style={{ width: '100%' }}>
      {/* Starting Location */}
      <div className="flex-col">
        <label className="glass-label">
          <span>Starting Point</span>
          {startCoords && <span className="glass-label-badge">GPS Active</span>}
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Navigation size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="glass-input"
            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
            placeholder="Enter city, trailhead, or use GPS"
            value={startLocation}
            onChange={(e) => handleLocationChange(e.target.value)}
          />
          <button
            type="button"
            onClick={requestGeolocation}
            disabled={isLocating}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: startCoords ? 'var(--accent-moss)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px'
            }}
            title="Use current GPS location"
          >
            <Locate size={16} className={isLocating ? 'pulse-green' : ''} />
          </button>
        </div>
      </div>

      {/* Row: Available Time, Driving radius, & Target Day */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="flex-col">
          <label className="glass-label">
            <span>Available Time</span>
          </label>
          <CustomDropdown
            value={timeWindow}
            options={TIME_OPTIONS}
            onChange={setTimeWindow}
            icon={Clock}
          />
        </div>

        <div className="flex-col">
          <label className="glass-label">
            <span>Max Driving Time</span>
          </label>
          <CustomDropdown
            value={maxDriveTime}
            options={DRIVE_OPTIONS}
            onChange={setMaxDriveTime}
            icon={Compass}
          />
        </div>

        <div className="flex-col">
          <label className="glass-label">
            <span>Adventure Date</span>
          </label>
          <CustomDropdown
            value={targetDay}
            options={upcomingDays}
            onChange={handleTargetDayChange}
            icon={Calendar}
          />
        </div>
      </div>

      {/* Activities Grid */}
      <div className="flex-col">
        <label className="glass-label">
          <span>Preferred Activities</span>
        </label>
        <div className="glass-checkbox-group">
          {ACTIVITY_OPTIONS.map(opt => {
            const isActive = selectedActivities.includes(opt.id);
            const seasonStatus = getActivitySeasonStatus(opt.id, targetDay, startCoords?.latitude, startLocation);
            const isOff = seasonStatus === 'off-season';
            const isShoulder = seasonStatus === 'shoulder';

            return (
              <div
                key={opt.id}
                onClick={() => toggleActivity(opt.id)}
                className={`glass-toggle-card ${isActive && !isOff ? 'active-green' : ''}`}
                style={{
                  opacity: isOff ? 0.45 : 1,
                  cursor: isOff ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '0.85rem 0.5rem',
                  border: isOff
                    ? '1px dashed rgba(255, 255, 255, 0.05)'
                    : isShoulder && isActive
                      ? '1px solid rgba(217, 119, 6, 0.5)'
                      : undefined
                }}
              >
                <span style={{ fontWeight: isActive && !isOff ? 600 : 500 }}>{opt.label}</span>
                {isOff && (
                  <span style={{
                    fontSize: '0.62rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Off-Season
                  </span>
                )}
                {isShoulder && (
                  <span style={{
                    fontSize: '0.62rem',
                    color: '#e0a150',
                    background: 'rgba(217, 119, 6, 0.12)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    <Clock size={8} /> Shoulder
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Soft warning for shoulder seasons */}
        {selectedActivities.some(a => getActivitySeasonStatus(a, targetDay, startCoords?.latitude, startLocation) === 'shoulder') && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'rgba(217, 119, 6, 0.05)',
            border: '1px solid rgba(217, 119, 6, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginTop: '0.75rem',
            animation: 'fadeIn 0.2s ease both'
          }}>
            <AlertTriangle size={14} style={{ color: '#e0a150', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Some of your selected activities are in their <strong>shoulder season</strong>. Access, snow coverage, or local conditions may vary significantly.
            </div>
          </div>
        )}
      </div>

      {/* Experience Level Segmented Control */}
      <div className="flex-col">
        <label className="glass-label">
          <span>Your Experience Level</span>
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '4px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px'
        }}>
          {EXPERIENCE_LEVELS.map(lvl => {
            const isActive = experienceLevel === lvl;
            return (
              <button
                type="button"
                key={lvl}
                onClick={() => setExperienceLevel(lvl)}
                style={{
                  padding: '0.65rem 0.25rem',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: isActive ? 600 : 500,
                  border: 'none',
                  borderRadius: '8px',
                  background: isActive ? 'var(--accent-moss)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {lvl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes Field */}
      <div className="flex-col">
        <label className="glass-label">
          <span>Special Requests or Notes</span>
        </label>
        <textarea
          className="glass-textarea"
          rows={3}
          placeholder="e.g. dog friendly, scenic views, shade preferred, avoid highway congestion..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      {validationError && (
        <div style={{
          color: '#d93025',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          padding: '0.65rem 1rem',
          border: '1px solid rgba(217, 48, 37, 0.15)',
          borderRadius: '8px',
          background: 'rgba(217, 48, 37, 0.03)'
        }}>
          Error: {validationError}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="glass-btn glass-btn-primary"
        style={{
          width: '100%',
          padding: '0.9rem',
          fontSize: '0.95rem'
        }}
      >
        <Compass size={16} />
        Plan My Rally
      </button>
    </form>
  );
}
