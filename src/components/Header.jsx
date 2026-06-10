import React from 'react';
import { Compass } from 'lucide-react';
import versionInfo from '../version.json';

export default function Header() {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.25rem 0',
      borderBottom: '1px solid var(--border-muted)',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Compass size={24} color="var(--accent-moss)" strokeWidth={2.5} />
        <h1 style={{
          fontSize: '1.4rem',
          fontWeight: 800,
          letterSpacing: '0.05em',
          margin: 0,
          lineHeight: 1
        }}>Rally</h1>
      </div>
      
      <div style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        fontWeight: 500
      }}>
        Adventure Planner <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>v{versionInfo.version}</span>
      </div>
    </header>
  );
}
