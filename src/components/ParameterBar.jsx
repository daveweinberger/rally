import { useState } from 'react';
import { MapPin, Calendar, Compass, Car, Sliders, Clock, MessageSquare, SlidersHorizontal } from 'lucide-react';
import InputPanel from './InputPanel.jsx';

export default function ParameterBar({ constraints, onSubmit, isLoading }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [autoFocusField, setAutoFocusField] = useState(null);

  if (!constraints) return null;

  const {
    startLocation,
    targetDay,
    activities,
    maxDriveTime,
    experienceLevel,
    timeWindow,
    notes
  } = constraints;

  const handlePillClick = (field) => {
    if (isExpanded && activeField === field) {
      setIsExpanded(false);
      setActiveField(null);
      setAutoFocusField(null);
    } else {
      setActiveField(field);
      setAutoFocusField(field);
      setIsExpanded(true);
    }
  };

  const handleEditAllClick = () => {
    if (isExpanded && activeField === null) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
      setActiveField(null);
      setAutoFocusField(null);
    }
  };

  const handleFormSubmit = (newConstraints) => {
    onSubmit(newConstraints);
    setIsExpanded(false);
  };

  const formatActivities = (list) => {
    if (!list || list.length === 0) return 'Select activities';
    if (list.length <= 2) return list.join(', ');
    return `${list.slice(0, 2).join(', ')} + ${list.length - 2} more`;
  };

  const getPanelTitle = () => {
    switch (activeField) {
      case 'location': return 'Modify Starting Point';
      case 'date': return 'Modify Adventure Date';
      case 'activities': return 'Modify Preferred Activities';
      case 'drive': return 'Modify Driving Limit';
      case 'duration': return 'Modify Duration';
      case 'experience': return 'Modify Experience Level';
      case 'notes': return 'Modify Notes & Requests';
      default: return 'Quick Modify Parameters';
    }
  };

  return (
    <div className="parameter-bar-container">
      <div className="parameter-pills-row">
        {/* Location Pill */}
        <button
          type="button"
          onClick={() => handlePillClick('location')}
          className={`parameter-pill ${isExpanded && activeField === 'location' ? 'active' : ''}`}
          title="Click to edit starting point"
        >
          <MapPin size={13} />
          <span>{startLocation || 'Location'}</span>
        </button>

        {/* Date Pill */}
        <button
          type="button"
          onClick={() => handlePillClick('date')}
          className={`parameter-pill ${isExpanded && activeField === 'date' ? 'active' : ''}`}
          title="Click to change date"
        >
          <Calendar size={13} />
          <span>{targetDay || 'Date'}</span>
        </button>

        {/* Activities Pill */}
        <button
          type="button"
          onClick={() => handlePillClick('activities')}
          className={`parameter-pill ${isExpanded && activeField === 'activities' ? 'active' : ''}`}
          title="Click to edit preferred activities"
        >
          <Compass size={13} />
          <span>{formatActivities(activities)}</span>
        </button>

        {/* Drive Time Pill */}
        <button
          type="button"
          onClick={() => handlePillClick('drive')}
          className={`parameter-pill ${isExpanded && activeField === 'drive' ? 'active' : ''}`}
          title="Click to adjust drive time limit"
        >
          <Car size={13} />
          <span>{maxDriveTime || 'Drive Time'}</span>
        </button>

        {/* Available Time (Duration) Pill */}
        <button
          type="button"
          onClick={() => handlePillClick('duration')}
          className={`parameter-pill ${isExpanded && activeField === 'duration' ? 'active' : ''}`}
          title="Click to adjust duration"
        >
          <Clock size={13} />
          <span>{timeWindow || 'Duration'}</span>
        </button>

        {/* Experience Level Pill */}
        <button
          type="button"
          onClick={() => handlePillClick('experience')}
          className={`parameter-pill ${isExpanded && activeField === 'experience' ? 'active' : ''}`}
          title="Click to change experience level"
        >
          <Sliders size={13} />
          <span>{experienceLevel || 'Experience'}</span>
        </button>

        {/* Special Notes Pill (only show if notes exist) */}
        {notes && notes.trim() !== '' && (
          <button
            type="button"
            onClick={() => handlePillClick('notes')}
            className={`parameter-pill ${isExpanded && activeField === 'notes' ? 'active' : ''}`}
            title="Click to edit special requests/notes"
          >
            <MessageSquare size={13} />
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {notes}
            </span>
          </button>
        )}

        {/* Edit All Button */}
        <button
          type="button"
          onClick={handleEditAllClick}
          className="parameter-edit-all-btn"
          title="Toggle quick edit panel"
        >
          <SlidersHorizontal size={13} />
          <span>{isExpanded ? 'Collapse' : 'Modify'}</span>
        </button>
      </div>

      {/* Collapsible Quick Edit Panel */}
      {isExpanded && (
        <div className="glass-card parameter-edit-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {getPanelTitle()}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Changes will recalculate matching adventures
            </span>
          </div>

          <InputPanel
            onSubmit={handleFormSubmit}
            initialConstraints={constraints}
            visibleField={activeField}
            autoFocusField={autoFocusField}
            onClearAutoFocus={() => setAutoFocusField(null)}
            submitLabel="Update Search"
            onCancel={() => {
              setIsExpanded(false);
              setActiveField(null);
              setAutoFocusField(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
