import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import InputPanel from './components/InputPanel.jsx';
import LoadingState from './components/LoadingState.jsx';
import ResultCard from './components/ResultCard.jsx';
import DetailModal from './components/DetailModal.jsx';
import ChatInterface from './components/ChatInterface.jsx';
import ParameterBar from './components/ParameterBar.jsx';
import { useAdventureSearch } from './hooks/useAdventureSearch.js';
import { useRefinement } from './hooks/useRefinement.js';
import { RotateCcw, AlertTriangle } from 'lucide-react';

function App() {
  const { search, reset, results, setResults, setGeneralExplanation, setGroundingMetadata, generalExplanation, noResultsExplanation, groundingMetadata, status, statusMessage, error, isLoading } = useAdventureSearch();
  const [activeConstraints, setActiveConstraints] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Scroll to top of the page when search completes
  useEffect(() => {
    if (status === 'done') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [status]);

  const [focusField, setFocusField] = useState(null);

  const handleSearchSubmit = (constraints) => {
    setActiveConstraints(constraints);
    search(constraints);
  };

  const handleReset = () => {
    setActiveConstraints(null);
    setSelectedActivity(null);
    setFocusField(null);
    reset();
  };

  const handleProceedInclement = () => {
    const updatedConstraints = {
      ...activeConstraints,
      allowInclementWeather: true
    };
    setActiveConstraints(updatedConstraints);
    search(updatedConstraints);
  };

  const handleQuickModify = (field) => {
    setFocusField(field);
    reset();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Background Animated Blobs for Glassmorphism */}
      <div className="mesh-bg">
        <div className="mesh-blob-1"></div>
        <div className="mesh-blob-2"></div>
        <div className="mesh-blob-3"></div>
      </div>

      <div className="gorp-container">
        <Header />

        {/* State 1: Idle (Show Simplified Input form) */}
        {status === 'idle' && (
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>Plan Your Adventure</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Enter your starting location and preferences below. We will calculate the optimal route options, itineraries, and live weather conditions.
              </p>
            </div>
            <InputPanel 
              onSubmit={handleSearchSubmit} 
              initialConstraints={activeConstraints} 
              autoFocusField={focusField}
              onClearAutoFocus={() => setFocusField(null)}
            />
          </div>
        )}

        {/* State 2: Loading / Processing */}
        {isLoading && (
          <LoadingState status={status} statusMessage={statusMessage} constraints={activeConstraints} />
        )}

        {/* State 3: Error */}
        {status === 'error' && (
          <div className="glass-card flex-col gap-md" style={{ padding: '2rem', borderTop: '4px solid var(--accent-moss)' }}>
            <h2 style={{ color: '#d93025', fontSize: '1.2rem' }}>Failed to Resolve Adventure</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              An error occurred during adventure query processing:
            </p>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#d93025',
              border: '1px solid rgba(217, 48, 37, 0.15)',
              padding: '1rem',
              background: 'rgba(217, 48, 37, 0.03)',
              borderRadius: '8px',
              wordBreak: 'break-all'
            }}>
              {error}
            </div>
            <button onClick={handleReset} className="glass-btn glass-btn-primary">
              <RotateCcw size={16} />
              Re-initialize Form
            </button>
          </div>
        )}

        {/* State 4: Results */}
        {status === 'done' && (
          <div className="flex-col gap-lg" style={{ animation: 'fadeIn 0.3s ease both' }}>
            <ParameterBar 
              constraints={activeConstraints} 
              onSubmit={handleSearchSubmit} 
              isLoading={isLoading} 
            />
            {results.length === 0 ? (
              <div className="glass-card flex-col align-center gap-md" style={{ padding: '2.5rem 2rem', textAlign: 'center', borderTop: '4px solid #e0a150' }}>
                <div style={{
                  background: 'rgba(217, 119, 6, 0.1)',
                  border: '1px solid rgba(217, 119, 6, 0.2)',
                  borderRadius: '50%',
                  width: '56px',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e0a150',
                  margin: '0 auto 0.25rem auto'
                }}>
                  <AlertTriangle size={28} />
                </div>
                
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>No Matching Adventures Found</h2>
                
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  maxWidth: '500px',
                  margin: '0 auto'
                }}>
                  We couldn't find any activities matching your exact preferences under the current weather forecast.
                </p>

                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '400px', margin: '1.5rem auto 0 auto' }}>
                  <button onClick={handleProceedInclement} className="glass-btn glass-btn-primary" style={{ width: '100%' }}>
                    Proceed with Inclement Weather Options
                  </button>
                  
                  <div style={{ margin: '0.75rem 0 0.25rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ height: '1px', background: 'rgba(255,255,255,0.08)', flex: 1 }}></span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Or, modify preferences</span>
                    <span style={{ height: '1px', background: 'rgba(255,255,255,0.08)', flex: 1 }}></span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button onClick={() => handleQuickModify('location')} className="glass-btn glass-btn-outline" style={{ fontSize: '0.78rem', padding: '0.55rem 0.75rem', justifyContent: 'center' }}>
                      Edit Location
                    </button>
                    <button onClick={() => handleQuickModify('date')} className="glass-btn glass-btn-outline" style={{ fontSize: '0.78rem', padding: '0.55rem 0.75rem', justifyContent: 'center' }}>
                      Change Date
                    </button>
                    <button onClick={() => handleQuickModify('activities')} className="glass-btn glass-btn-outline" style={{ fontSize: '0.78rem', padding: '0.55rem 0.75rem', justifyContent: 'center' }}>
                      Edit Activities
                    </button>
                    <button onClick={() => handleQuickModify('drive')} className="glass-btn glass-btn-outline" style={{ fontSize: '0.78rem', padding: '0.55rem 0.75rem', justifyContent: 'center' }}>
                      Adjust Drive Time
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header row with reset button */}
                <div className="row justify-between align-center">
                  <div className="flex-col">
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Found {results.length} recommendations for you
                    </span>
                  </div>
                  <button onClick={handleReset} className="glass-btn glass-btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>
                    <RotateCcw size={12} />
                    Reset Plan
                  </button>
                </div>

                {/* General Conditions Explanation */}
                {generalExplanation && (
                  <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-moss)' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '8px', fontWeight: 700 }}>Weather & Regional Outlook</h3>
                    {(() => {
                      const lines = generalExplanation.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                      if (lines.some(l => l.startsWith('-') || l.startsWith('*') || l.startsWith('•') || /^\d+\./.test(l))) {
                        return (
                          <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {lines.map((line, idx) => {
                              const cleanLine = line.replace(/^[-*•\s\d.]+\s*/, '');
                              return <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.45 }}>{cleanLine}</li>;
                            })}
                          </ul>
                        );
                      }
                      return <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>{generalExplanation}</p>;
                    })()}
                  </div>
                )}

                {/* Simplified Ranked Cards */}
                <div className="flex-col gap-md">
                  {results.map((activity, idx) => (
                    <ResultCard
                      key={idx}
                      activity={activity}
                      rank={idx + 1}
                      onSelect={(act) => setSelectedActivity(act)}
                    />
                  ))}
                </div>

                {/* Chat Refinement Section */}
                <RefinementSection 
                  constraints={activeConstraints} 
                  results={results} 
                  explanation={generalExplanation} 
                  onUpdateResults={(newResults, newExplanation, newMetadata) => {
                    setResults(newResults);
                    if (newExplanation) setGeneralExplanation(newExplanation);
                    if (newMetadata) setGroundingMetadata(newMetadata);
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal Overlay */}
      {selectedActivity && (
        <DetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          generalAttribution={groundingMetadata}
          onUpdateActivity={(updatedAct) => {
            setSelectedActivity(updatedAct);
            setResults(prev => prev.map(act => act.name === updatedAct.name ? updatedAct : act));
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

// Subcomponent wrapper for refinement chat so it resets fresh when search criteria change
function RefinementSection({ constraints, results, explanation, onUpdateResults }) {
  const { messages, sendMessage, isStreaming, error } = useRefinement(constraints, results, explanation, onUpdateResults);
  return (
    <ChatInterface
      messages={messages}
      sendMessage={sendMessage}
      isStreaming={isStreaming}
      error={error}
    />
  );
}

export default App;
