import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import InputPanel from './components/InputPanel.jsx';
import LoadingState from './components/LoadingState.jsx';
import ResultCard from './components/ResultCard.jsx';
import DetailModal from './components/DetailModal.jsx';
import ChatInterface from './components/ChatInterface.jsx';
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

  const handleSearchSubmit = (constraints) => {
    setActiveConstraints(constraints);
    search(constraints);
  };

  const handleReset = () => {
    setActiveConstraints(null);
    setSelectedActivity(null);
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
            <InputPanel onSubmit={handleSearchSubmit} initialConstraints={activeConstraints} />
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
            {results.length === 0 ? (
              <div className="glass-card flex-col align-center gap-md" style={{ padding: '3rem 2rem', textAlign: 'center', borderTop: '4px solid #e0a150' }}>
                <div style={{
                  background: 'rgba(217, 119, 6, 0.1)',
                  border: '1px solid rgba(217, 119, 6, 0.2)',
                  borderRadius: '50%',
                  width: '64px',
                  height: '64px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e0a150',
                  margin: '0 auto 0.5rem auto'
                }}>
                  <AlertTriangle size={32} />
                </div>
                
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>No Matching Adventures Found</h2>
                
                <p style={{
                  fontSize: '0.92rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  maxWidth: '500px',
                  margin: '0 auto'
                }}>
                  {noResultsExplanation || "We couldn't find any activities matching your exact constraints and weather conditions. Some activities may be out of season."}
                </p>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={handleReset} className="glass-btn glass-btn-primary">
                    <RotateCcw size={16} />
                    Modify Search Options
                  </button>
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
          constraints={activeConstraints}
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
