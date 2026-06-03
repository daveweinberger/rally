import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase.js';
import { getMockRecommendations } from '../utils/mockTelemetry.js';

export function useAdventureSearch() {
  const [results, setResults] = useState([]);
  const [generalExplanation, setGeneralExplanation] = useState('');
  const [noResultsExplanation, setNoResultsExplanation] = useState('');
  const [groundingMetadata, setGroundingMetadata] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'analyzing' | 'querying' | 'routing' | 'done' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);

  const search = useCallback(async (constraints) => {
    setStatus('analyzing');
    setStatusMessage('Analyzing constraints...');
    setError(null);
    setResults([]);
    setGeneralExplanation('');
    setNoResultsExplanation('');
    setGroundingMetadata(null);

    try {
      const searchFn = httpsCallable(functions, 'searchAdventures');
      const response = searchFn(constraints);
      const stream = response.stream;

      if (!stream) {
        // Fallback for environments where stream is undefined
        console.warn("Callable streaming not supported. Waiting for complete response.");
        const result = await response;
        const data = result.data;
        
        if (data.status === 'done') {
          setResults(data.results || []);
          setGeneralExplanation(data.generalExplanation || '');
          setNoResultsExplanation(data.noResultsExplanation || '');
          setGroundingMetadata(data.groundingMetadata || null);
          setStatus('done');
          setStatusMessage('');
        } else if (data.status === 'error') {
          throw new Error(data.message);
        } else {
          // If the backend returned a flat object in non-streaming mode
          setResults(data.results || []);
          setGeneralExplanation(data.generalExplanation || '');
          setNoResultsExplanation(data.noResultsExplanation || '');
          setGroundingMetadata(data.groundingMetadata || null);
          setStatus('done');
          setStatusMessage('');
        }
        return;
      }

      // Read chunks from the stream
      for await (const chunk of stream) {
        const data = chunk.data;
        console.log("Frontend received stream chunk:", data);
        
        if (data.status === 'analyzing' || data.status === 'querying' || data.status === 'routing') {
          setStatus(data.status);
          setStatusMessage(data.message);
        } else if (data.status === 'done') {
          setResults(data.results || []);
          setGeneralExplanation(data.generalExplanation || '');
          setNoResultsExplanation(data.noResultsExplanation || '');
          setGroundingMetadata(data.groundingMetadata || null);
          setStatus('done');
          setStatusMessage('');
        } else if (data.status === 'error') {
          throw new Error(data.message);
        }
      }
    } catch (err) {
      console.error("Search adventure stream failed:", err);
      
      // Fallback to local mock telemetry during dev if server is down (e.g. Connection Refused / ERR_CONNECTION_REFUSED)
      if (import.meta.env.DEV) {
        console.warn("Firebase Emulator offline. Falling back to client-side mock telemetry mode.");
        
        setStatus('analyzing');
        setStatusMessage('Analyzing constraints [STANDALONE MODE]...');
        await new Promise(r => setTimeout(r, 800));
        
        setStatus('querying');
        setStatusMessage('Simulating Gemini (Maps + Search Grounding) [STANDALONE MODE]...');
        await new Promise(r => setTimeout(r, 1200));
        
        setStatus('routing');
        setStatusMessage('Simulating Routes API travel timelines [STANDALONE MODE]...');
        await new Promise(r => setTimeout(r, 800));
        
        const mockResponse = getMockRecommendations(constraints);
        setResults(mockResponse.results);
        setGeneralExplanation(mockResponse.generalExplanation);
        setNoResultsExplanation(mockResponse.noResultsExplanation || '');
        setGroundingMetadata(mockResponse.groundingMetadata);
        setStatus('done');
        setStatusMessage('');
        return;
      }

      setStatus('error');
      setError(err.message || 'An unexpected error occurred during search.');
      setStatusMessage('');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setStatusMessage('');
    setResults([]);
    setGeneralExplanation('');
    setNoResultsExplanation('');
    setGroundingMetadata(null);
    setError(null);
  }, []);

  return {
    search,
    reset,
    results,
    setResults,
    setGeneralExplanation,
    setGroundingMetadata,
    generalExplanation,
    noResultsExplanation,
    groundingMetadata,
    status,
    statusMessage,
    error,
    isLoading: status !== 'idle' && status !== 'done' && status !== 'error'
  };
}
