import { useState, useEffect, useRef } from 'react';
import { Navigation, Clock, Compass, Locate, Calendar, ChevronDown, AlertTriangle, Check, X, Plus } from 'lucide-react';
import { getActivitySeasonStatus } from '../utils/seasonalUtils.js';

export const TIME_OPTIONS = [
  { value: 'Half day (4h)', label: 'Half Day (~4h)' },
  { value: 'Full day (8h)', label: 'Full Day (~8h)' },
  { value: 'Weekend', label: 'Multi-Day (Weekend)' }
];

export const DRIVE_OPTIONS = [
  { value: '30 minutes', label: '< 30 Minutes' },
  { value: '1 hour', label: '< 1 Hour' },
  { value: '1.5 hours', label: '< 1.5 Hours' },
  { value: '2 hours', label: '< 2 Hours' },
  { value: '3+ hours', label: '3+ Hours' }
];

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export const ACTIVITY_OPTIONS = [
  { id: 'Hiking', label: 'Hiking' },
  { id: 'Climbing', label: 'Climbing' },
  { id: 'Mountain Biking', label: 'MTB' },
  { id: 'Trail Running', label: 'Trail Run' },
  { id: 'Snowboarding/Skiing', label: 'Ski/Snowboard' },
  { id: 'Kayaking', label: 'Paddle/Kayak' }
];

export const getUpcomingDays = () => {
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



export function CustomDropdown({ id, value, options, onChange, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const handleTriggerClick = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      const selectedIdx = options.findIndex(opt => opt.value === value);
      setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    } else {
      setFocusedIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        const selectedIdx = options.findIndex(opt => opt.value === value);
        setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          setFocusedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        document.getElementById(id)?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        id={id}
        type="button"
        className="glass-input custom-dropdown-trigger"
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={isOpen && focusedIndex >= 0 ? `${id}-opt-${focusedIndex}` : undefined}
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
          id={`${id}-listbox`}
          role="listbox"
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
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = focusedIndex === idx;
            return (
              <div
                id={`${id}-opt-${idx}`}
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setFocusedIndex(-1);
                }}
                className={`custom-dropdown-option ${isSelected ? 'active' : ''}`}
                style={{
                  padding: '0.75rem 1.15rem',
                  fontSize: '0.9rem',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  background: isSelected ? 'var(--accent-moss)' : (isFocused ? 'rgba(255, 255, 255, 0.08)' : 'transparent'),
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: isSelected ? 600 : 500
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  setFocusedIndex(idx);
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
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

export function MultiSelectActivityDropdown({ selectedActivities, onToggle, onAddCustom, onRemoveCustom, customActivities, activityOptions, targetDay, startCoords, startLocation }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const customInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCustomInput(false);
        setCustomInput('');
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  // Filter out off-season activities
  const visibleOptions = activityOptions.filter(opt => {
    const status = getActivitySeasonStatus(opt.id, targetDay, startCoords?.latitude, startLocation);
    return status !== 'off-season';
  });

  const allSelected = [...selectedActivities];

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !customActivities.includes(trimmed) && !allSelected.includes(trimmed)) {
      onAddCustom(trimmed);
      setCustomInput('');
      setShowCustomInput(false);
      // Put focus back onto the dropdown trigger
      document.getElementById('activities-dropdown-trigger')?.focus();
    }
  };

  const dropdownItems = [
    ...visibleOptions.map(opt => ({ type: 'option', id: opt.id, label: opt.label, isCustom: false })),
    ...customActivities.map(ca => ({ type: 'custom', id: ca, label: ca, isCustom: true })),
    ...(!showCustomInput ? [{ type: 'other', id: 'other-trigger', label: 'Other...' }] : [])
  ];

  const handleTriggerClick = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      setFocusedIndex(0);
    } else {
      setFocusedIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % dropdownItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + dropdownItems.length) % dropdownItems.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < dropdownItems.length) {
          const item = dropdownItems[focusedIndex];
          if (item.type === 'option') {
            onToggle(item.id);
          } else if (item.type === 'custom') {
            onRemoveCustom(item.id);
            setFocusedIndex(prev => {
              const newLen = dropdownItems.length - 1;
              if (newLen <= 0) return -1;
              return Math.min(prev, newLen - 1);
            });
          } else if (item.type === 'other') {
            setShowCustomInput(true);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        document.getElementById('activities-dropdown-trigger')?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger container */}
      <div
        id="activities-dropdown-trigger"
        role="button"
        tabIndex={0}
        className="glass-input custom-dropdown-trigger"
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="activities-listbox"
        aria-activedescendant={isOpen && focusedIndex >= 0 ? `activities-opt-${focusedIndex}` : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 36px 6px 12px',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          position: 'relative',
          minHeight: '46px',
          height: 'auto',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flex: 1 }}>
          {allSelected.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Select activities...
            </span>
          ) : (
            allSelected.map(activity => {
              const opt = activityOptions.find(o => o.id === activity);
              const label = opt ? opt.label : activity;
              const isCustom = customActivities.includes(activity);
              const seasonStatus = !isCustom ? getActivitySeasonStatus(activity, targetDay, startCoords?.latitude, startLocation) : 'in-season';
              const isShoulder = seasonStatus === 'shoulder';

              return (
                <span
                  key={activity}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '20px',
                    background: isShoulder ? 'rgba(217, 119, 6, 0.15)' : 'rgba(72, 178, 124, 0.15)',
                    color: isShoulder ? '#e0a150' : 'var(--accent-moss)',
                    border: `1px solid ${isShoulder ? 'rgba(217, 119, 6, 0.3)' : 'rgba(72, 178, 124, 0.3)'}`,
                    animation: 'fadeIn 0.15s ease both'
                  }}
                >
                  {label}
                  <span
                    role="button"
                    tabIndex={0}
                    className="touch-target-44"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCustom) {
                        onRemoveCustom(activity);
                      } else {
                        onToggle(activity);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isCustom) {
                          onRemoveCustom(activity);
                        } else {
                          onToggle(activity);
                        }
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      marginLeft: '4px',
                      padding: '2px',
                      borderRadius: '50%',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    title="Remove"
                  >
                    <X size={12} />
                  </span>
                </span>
              );
            })
          )}
        </div>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-secondary)',
            transition: 'transform 0.2s',
            transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0)',
            flexShrink: 0,
            position: 'absolute',
            right: '12px',
            top: '50%',
            transformOrigin: 'center'
          }}
        />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          id="activities-listbox"
          role="listbox"
          className="custom-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'rgba(28, 42, 35, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            zIndex: 20,
            overflow: 'hidden',
            maxHeight: '280px',
            overflowY: 'auto',
            animation: 'dropdownFadeIn 0.15s ease both'
          }}
        >
          {visibleOptions.map((opt, idx) => {
            const isSelected = selectedActivities.includes(opt.id);
            const isFocused = focusedIndex === idx;
            const seasonStatus = getActivitySeasonStatus(opt.id, targetDay, startCoords?.latitude, startLocation);
            const isShoulder = seasonStatus === 'shoulder';

            return (
              <div
                id={`activities-opt-${idx}`}
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => onToggle(opt.id)}
                className="custom-dropdown-option"
                style={{
                  padding: '0.7rem 1rem',
                  fontSize: '0.9rem',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isFocused ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: isSelected ? 600 : 500,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {opt.label}
                  {isShoulder && (
                    <span style={{
                      fontSize: '0.62rem',
                      color: '#e0a150',
                      background: 'rgba(217, 119, 6, 0.12)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      <Clock size={8} /> Shoulder
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check size={16} style={{ color: 'var(--accent-moss)', flexShrink: 0 }} />
                )}
              </div>
            );
          })}

          {/* Custom activities in dropdown */}
          {customActivities.map((ca, idx) => {
            const optIdx = visibleOptions.length + idx;
            const isFocused = focusedIndex === optIdx;
            return (
              <div
                id={`activities-opt-${optIdx}`}
                key={ca}
                role="option"
                aria-selected={true}
                onClick={() => onRemoveCustom(ca)}
                className="custom-dropdown-option"
                style={{
                  padding: '0.7rem 1rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  background: isFocused ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                }}
                onMouseEnter={() => setFocusedIndex(optIdx)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {ca}
                  <span style={{
                    fontSize: '0.62rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 600
                  }}>Custom</span>
                </span>
                <Check size={16} style={{ color: 'var(--accent-moss)', flexShrink: 0 }} />
              </div>
            );
          })}

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '0' }} />

          {/* Other / Custom input */}
          {!showCustomInput ? (
            <div
              id={`activities-opt-${visibleOptions.length + customActivities.length}`}
              role="option"
              aria-selected={false}
              onClick={() => setShowCustomInput(true)}
              className="custom-dropdown-option"
              style={{
                padding: '0.7rem 1rem',
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                background: focusedIndex === (visibleOptions.length + customActivities.length) ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 500,
                fontStyle: 'italic'
              }}
              onMouseEnter={() => setFocusedIndex(visibleOptions.length + customActivities.length)}
            >
              <Plus size={14} style={{ color: 'var(--text-muted)' }} />
              Other...
            </div>
          ) : (
            <div style={{
              padding: '0.5rem 0.75rem',
              display: 'flex',
              gap: '6px',
              alignItems: 'center'
            }}>
              <input
                ref={customInputRef}
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustom();
                  }
                  if (e.key === 'Escape') {
                    setShowCustomInput(false);
                    setCustomInput('');
                    setFocusedIndex(visibleOptions.length + customActivities.length);
                    // Return focus to trigger
                    document.getElementById('activities-dropdown-trigger')?.focus();
                  }
                }}
                placeholder="Type an activity..."
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-sans)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customInput.trim()}
                style={{
                  background: customInput.trim() ? 'var(--accent-moss)' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: customInput.trim() ? '#fff' : 'var(--text-muted)',
                  cursor: customInput.trim() ? 'pointer' : 'default',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const formatNominatimName = (item) => {
  const address = item.address || {};
  // Prefer the most specific named place: if the result itself is a suburb/neighbourhood/borough,
  // use that rather than the parent city (e.g. show "Brooklyn" not "New York City").
  const specificName =
    address.suburb ||
    address.neighbourhood ||
    address.borough ||
    null;
  const generalName =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    null;
  // Use the specific name only when the result type suggests it is the primary subject
  // (i.e. the Nominatim type/category is a suburb, neighbourhood, or borough).
  const isSuburbResult =
    item.type === 'suburb' ||
    item.type === 'neighbourhood' ||
    item.type === 'borough' ||
    item.addresstype === 'suburb' ||
    item.addresstype === 'neighbourhood' ||
    item.addresstype === 'borough';
  const city = (isSuburbResult && specificName) ? specificName : (generalName || specificName);
  const state = address.state;
  const country = address.country;

  if (city && state) {
    return `${city}, ${state}`;
  }
  if (city && country) {
    return `${city}, ${country}`;
  }
  return item.display_name.split(',').slice(0, 3).join(',').trim();
};

export default function InputPanel({ onSubmit, initialConstraints, autoFocusField, onClearAutoFocus, submitLabel, onCancel, visibleField, isLoading = false }) {
  const upcomingDays = getUpcomingDays();
  const showAll = !visibleField;
  
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
  const [customActivities, setCustomActivities] = useState(() => {
    if (!initialConstraints?.activities) return [];
    const standardIds = ACTIVITY_OPTIONS.map(opt => opt.id);
    return initialConstraints.activities.filter(act => !standardIds.includes(act));
  });
  
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [locationSource, setLocationSource] = useState(initialConstraints?.startCoords ? 'gps' : null);
  
  const locationRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!shouldFetch || startLocation.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startLocation)}&limit=5&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en-US,en;q=0.9',
              'User-Agent': 'Rally-Adventure-Planner'
            }
          }
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Typeahead fetching failed:", err);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [startLocation, shouldFetch]);

  useEffect(() => {
    if (autoFocusField) {
      const timer = setTimeout(() => {
        let el;
        if (autoFocusField === 'location') {
          el = document.getElementById('location-input');
        } else if (autoFocusField === 'date') {
          el = document.getElementById('date-dropdown-trigger');
        } else if (autoFocusField === 'activities') {
          el = document.getElementById('activities-dropdown-trigger');
        } else if (autoFocusField === 'drive') {
          el = document.getElementById('drive-dropdown-trigger');
        } else if (autoFocusField === 'duration') {
          el = document.getElementById('duration-dropdown-trigger');
        } else if (autoFocusField === 'experience') {
          const container = document.getElementById('experience-container');
          if (container) {
            el = container.querySelector('button');
          }
        } else if (autoFocusField === 'notes') {
          el = document.getElementById('notes-input');
        }
        
        if (el) {
          el.focus();
          if (autoFocusField !== 'location' && autoFocusField !== 'notes' && autoFocusField !== 'experience') {
            el.click();
          }
        }
      }, 80);
      onClearAutoFocus();
      return () => clearTimeout(timer);
    }
  }, [autoFocusField, onClearAutoFocus]);

  const toggleActivity = (activity) => {
    let next;
    if (selectedActivities.includes(activity)) {
      next = selectedActivities.filter(a => a !== activity);
    } else {
      next = [...selectedActivities, activity];
    }
    setSelectedActivities(next);
    if (next.length > 0) {
      setValidationError('');
    }
  };

  const addCustomActivity = (name) => {
    setCustomActivities(prev => [...prev, name]);
    setSelectedActivities(prev => {
      const next = [...prev, name];
      if (next.length > 0) {
        setValidationError('');
      }
      return next;
    });
  };

  const removeCustomActivity = (name) => {
    setCustomActivities(prev => prev.filter(a => a !== name));
    setSelectedActivities(prev => prev.filter(a => a !== name));
  };

  const filterOffSeasonActivities = (day, locText, coords) => {
    setSelectedActivities(prev => {
      const valid = prev.filter(activity => {
        const isCustom = !ACTIVITY_OPTIONS.some(opt => opt.id === activity);
        if (isCustom) return true;
        const status = getActivitySeasonStatus(activity, day, coords?.latitude, locText);
        return status !== 'off-season';
      });
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
      setLocationSource(null);
    }
    filterOffSeasonActivities(targetDay, val, null);
    if (val.trim() !== '') {
      setValidationError('');
    }
    setShouldFetch(true);
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
        setLocationSource('gps');
        
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

  const handleSelectSuggestion = (item) => {
    const formatted = formatNominatimName(item);
    setStartLocation(formatted);
    const coords = { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) };
    setStartCoords(coords);
    setLocationSource('typeahead');
    setShouldFetch(false);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Clear validation if it was showing
    setValidationError('');

    // Run season filtering with the new location and coords
    filterOffSeasonActivities(targetDay, formatted, coords);
  };

  const isFormComplete = startLocation.trim() !== '' && selectedActivities.length > 0;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const hasLocation = startLocation.trim() !== '';
    const hasActivities = selectedActivities.length > 0;

    if (!hasLocation && !hasActivities) {
      setValidationError('Please enter a starting point and select at least one activity.');
      return;
    }
    if (!hasLocation) {
      setValidationError('Please enter a starting point.');
      return;
    }
    if (!hasActivities) {
      setValidationError('Please select at least one preferred activity.');
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
      {(showAll || visibleField === 'location') && (
        <div className="flex-col" ref={locationRef} style={{ position: 'relative' }}>
          <label className="glass-label" htmlFor="location-input">
            <span>Starting Point</span>
            {startCoords && (
              <span className="glass-label-badge">
                {locationSource === 'gps' ? 'GPS Active' : locationSource === 'typeahead' ? 'Location Synced' : 'Coordinates Set'}
              </span>
            )}
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Navigation size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-secondary)' }} />
            <input
              id="location-input"
              type="text"
              className="glass-input"
              style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
              placeholder="Enter city, trailhead, or use GPS"
              value={startLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
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
              aria-label="Use current GPS location"
            >
              <Locate size={16} className={isLocating ? 'pulse-green' : ''} />
            </button>
          </div>

          {/* Typeahead Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="custom-dropdown-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: 'rgba(28, 42, 35, 0.98)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                zIndex: 30,
                maxHeight: '220px',
                overflowY: 'auto',
                animation: 'dropdownFadeIn 0.15s ease both'
              }}
            >
              {suggestions
                .reduce((acc, item) => {
                  const displayName = formatNominatimName(item);
                  if (!acc.seen.has(displayName)) {
                    acc.seen.add(displayName);
                    acc.items.push({ item, displayName });
                  }
                  return acc;
                }, { seen: new Set(), items: [] })
                .items
                .map(({ item, displayName }, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="custom-dropdown-option"
                    style={{
                      padding: '0.7rem 1rem',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {displayName}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Row: Available Time, Driving radius, & Target Day */}
      {showAll ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="flex-col">
            <label className="glass-label" htmlFor="duration-dropdown-trigger">
              <span>Available Time</span>
            </label>
            <CustomDropdown
              id="duration-dropdown-trigger"
              value={timeWindow}
              options={TIME_OPTIONS}
              onChange={setTimeWindow}
              icon={Clock}
            />
          </div>

          <div className="flex-col">
            <label className="glass-label" htmlFor="drive-dropdown-trigger">
              <span>Max Driving Time</span>
            </label>
            <CustomDropdown
              id="drive-dropdown-trigger"
              value={maxDriveTime}
              options={DRIVE_OPTIONS}
              onChange={setMaxDriveTime}
              icon={Compass}
            />
          </div>

          <div className="flex-col">
            <label className="glass-label" htmlFor="date-dropdown-trigger">
              <span>Adventure Date</span>
            </label>
            <CustomDropdown
              id="date-dropdown-trigger"
              value={targetDay}
              options={upcomingDays}
              onChange={handleTargetDayChange}
              icon={Calendar}
            />
          </div>
        </div>
      ) : (
        <>
          {visibleField === 'duration' && (
            <div className="flex-col">
              <label className="glass-label" htmlFor="duration-dropdown-trigger">
                <span>Available Time</span>
              </label>
              <CustomDropdown
                id="duration-dropdown-trigger"
                value={timeWindow}
                options={TIME_OPTIONS}
                onChange={setTimeWindow}
                icon={Clock}
              />
            </div>
          )}

          {visibleField === 'drive' && (
            <div className="flex-col">
              <label className="glass-label" htmlFor="drive-dropdown-trigger">
                <span>Max Driving Time</span>
              </label>
              <CustomDropdown
                id="drive-dropdown-trigger"
                value={maxDriveTime}
                options={DRIVE_OPTIONS}
                onChange={setMaxDriveTime}
                icon={Compass}
              />
            </div>
          )}

          {visibleField === 'date' && (
            <div className="flex-col">
              <label className="glass-label" htmlFor="date-dropdown-trigger">
                <span>Adventure Date</span>
              </label>
              <CustomDropdown
                id="date-dropdown-trigger"
                value={targetDay}
                options={upcomingDays}
                onChange={handleTargetDayChange}
                icon={Calendar}
              />
            </div>
          )}
        </>
      )}

      {/* Activities Dropdown */}
      {(showAll || visibleField === 'activities') && (
        <div className="flex-col">
          <label className="glass-label" htmlFor="activities-dropdown-trigger">
            <span>Preferred Activities</span>
          </label>
          <MultiSelectActivityDropdown
            selectedActivities={selectedActivities}
            onToggle={toggleActivity}
            onAddCustom={addCustomActivity}
            onRemoveCustom={removeCustomActivity}
            customActivities={customActivities}
            activityOptions={ACTIVITY_OPTIONS}
            targetDay={targetDay}
            startCoords={startCoords}
            startLocation={startLocation}
          />

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
      )}

      {/* Experience Level Segmented Control */}
      {(showAll || visibleField === 'experience') && (
        <div className="flex-col">
          <label id="experience-label" className="glass-label">
            <span>Your Experience Level</span>
          </label>
          <div id="experience-container" aria-labelledby="experience-label" style={{
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
      )}

      {/* Notes Field */}
      {(showAll || visibleField === 'notes') && (
        <div className="flex-col">
          <label className="glass-label" htmlFor="notes-input">
            <span>Special Requests or Notes</span>
          </label>
          <textarea
            id="notes-input"
            className="glass-textarea"
            rows={3}
            placeholder="e.g. dog friendly, scenic views, shade preferred, avoid highway congestion..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>
      )}

      {validationError && (
        <div role="alert" style={{
          color: '#e27d7d',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0.5rem 0.75rem',
          background: 'rgba(226, 125, 125, 0.05)',
          border: '1px solid rgba(226, 125, 125, 0.15)',
          borderRadius: '8px',
          animation: 'fadeIn 0.2s ease both'
        }}>
          <AlertTriangle size={14} style={{ color: '#e27d7d', flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Submit / Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        width: '100%',
        marginTop: '0.5rem'
      }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="glass-btn glass-btn-outline"
            style={{
              flex: 1,
              padding: '0.9rem',
              fontSize: '0.95rem',
              justifyContent: 'center'
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className={`glass-btn ${isFormComplete && !isLoading ? 'glass-btn-primary' : ''}`}
          style={{
            flex: onCancel ? 2 : 1,
            width: onCancel ? 'auto' : '100%',
            padding: '0.9rem',
            fontSize: '0.95rem',
            background: isFormComplete && !isLoading ? 'var(--accent-moss)' : 'rgba(255, 255, 255, 0.05)',
            color: isFormComplete && !isLoading ? '#ffffff' : 'var(--text-secondary)',
            border: isFormComplete && !isLoading ? '1px solid rgba(72, 178, 124, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: isFormComplete && !isLoading ? '0 4px 14px rgba(72, 178, 124, 0.25)' : 'none',
            cursor: isLoading ? 'not-allowed' : (isFormComplete ? 'pointer' : 'default'),
            opacity: isLoading ? 0.5 : (isFormComplete ? 1 : 0.7),
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Compass size={16} />
          {submitLabel || 'Plan My Rally'}
        </button>
      </div>
    </form>
  );
}
