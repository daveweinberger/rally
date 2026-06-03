import { MapPin, ArrowRight, Car } from 'lucide-react';

export default function ResultCard({ activity, rank, onSelect }) {
  const isFirst = rank === 1;

  return (
    <div 
      className="glass-card glass-card-interactive flex-col gap-md"
      onClick={() => onSelect(activity)}
      style={{
        width: '100%',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: `${rank * 0.08}s`
      }}
    >
      {/* Top Banner (Rank) */}
      <div className="row justify-between align-center" style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '0.65rem' }}>
        <span style={{
          fontWeight: 600,
          fontSize: '0.75rem',
          color: isFirst ? 'var(--accent-moss)' : 'var(--text-secondary)',
          letterSpacing: '0.02em'
        }}>
          {isFirst ? 'Best Match Option' : `Recommendation #${rank}`}
        </span>
        <span className="glass-label-badge" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
          {activity.difficulty}
        </span>
      </div>

      {/* Title & Region */}
      <div className="row justify-between align-center" style={{ gap: '1rem' }}>
        <div className="flex-col">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            {activity.name}
          </h2>
          <div className="row align-center gap-sm" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
            <MapPin size={12} color="var(--text-muted)" />
            <span>{activity.location}</span>
          </div>
        </div>

        {/* Telemetry stats bubble with Car icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          flexShrink: 0
        }}>
          <Car size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textAlign: 'left'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>
              {activity.driveTime}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.25 }}>
              {activity.distance ? activity.distance.replace(/\s*drive\s*/gi, '') : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Short Match Reason Summary */}
      <p style={{
        fontSize: '0.88rem',
        lineHeight: 1.4,
        color: 'var(--text-secondary)',
        margin: 0
      }}>
        {activity.matchReason}
      </p>

      {/* Warnings indicator if present */}
      {activity.warnings && activity.warnings.length > 0 && (
        <div style={{
          fontSize: '0.75rem',
          color: '#fbbf24',
          fontWeight: 600,
          background: 'rgba(251, 191, 36, 0.08)',
          padding: '4px 8px',
          borderRadius: '6px',
          width: 'fit-content',
          border: '1px solid rgba(251, 191, 36, 0.15)'
        }}>
          ⚠️ Active conditions alerts detected
        </div>
      )}

      {/* Action button */}
      <div className="row justify-between align-center" style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '0.65rem', marginTop: '0.25rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          Click card to inspect full details
        </span>
        <button 
          className="glass-btn glass-btn-outline" 
          onClick={(e) => {
            e.stopPropagation(); // prevent double trigger
            onSelect(activity);
          }}
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}
        >
          <span>View Details</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
