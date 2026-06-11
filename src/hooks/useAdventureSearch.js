import { useState, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase.js';

const wrapWithAbort = (promise, signal) => {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('The user aborted a request.', 'AbortError'));
      return;
    }
    const abortHandler = () => {
      reject(new DOMException('The user aborted a request.', 'AbortError'));
    };
    signal.addEventListener('abort', abortHandler);
    promise.then(
      (res) => {
        signal.removeEventListener('abort', abortHandler);
        resolve(res);
      },
      (err) => {
        signal.removeEventListener('abort', abortHandler);
        reject(err);
      }
    );
  });
};

export function useAdventureSearch() {
  const [results, setResults] = useState([]);
  const [generalExplanation, setGeneralExplanation] = useState('');
  const [noResultsExplanation, setNoResultsExplanation] = useState('');
  const [groundingMetadata, setGroundingMetadata] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'analyzing' | 'querying' | 'routing' | 'done' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
    setStatusMessage('');
    setResults([]);
    setGeneralExplanation('');
    setNoResultsExplanation('');
    setGroundingMetadata(null);
    setError(null);
  }, []);

  const search = useCallback(async (constraints) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setStatus('analyzing');
    setStatusMessage('Analyzing constraints...');
    setError(null);
    setResults([]);
    setGeneralExplanation('');
    setNoResultsExplanation('');
    setGroundingMetadata(null);

    try {
      const searchFn = httpsCallable(functions, 'searchAdventures');
      
      let stream;
      if (typeof searchFn.stream === 'function') {
        const response = await wrapWithAbort(searchFn.stream(constraints), signal);
        stream = response.stream;
      }

      if (!stream) {
        // Fallback for environments where stream is undefined
        console.warn("Callable streaming not supported. Waiting for complete response.");
        const result = await wrapWithAbort(searchFn(constraints), signal);
        const data = result.data;
        
        if (signal.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }

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
      const iterator = stream[Symbol.asyncIterator]();
      while (true) {
        if (signal.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }
        const nextPromise = iterator.next();
        const { value: chunk, done } = await wrapWithAbort(nextPromise, signal);
        if (done) break;

        if (signal.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError');
        }

        const data = chunk;
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

      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Search request was aborted by the user.");
        return;
      }

      let verboseError = err.message || err.toString();
      if (err.code) {
        verboseError = `[${err.code}] ${verboseError}`;
      }
      if (err.details) {
        const detailsStr = typeof err.details === 'object' ? JSON.stringify(err.details, null, 2) : err.details;
        verboseError += `\n\nDetails:\n${detailsStr}`;
      }
      if (import.meta.env.DEV && (err.message?.includes('Failed to fetch') || err.message?.includes('internal') || err.message?.includes('Failed to get App Check token'))) {
        verboseError += '\n\nTroubleshooting Tip (Local Dev): Ensure that your Firebase Local Emulator Suite is running (`npx firebase emulators:start`) and check that your API keys / App Check settings are configured correctly.';
      }

      setStatus('error');
      setError(verboseError);
      setStatusMessage('');
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
    cancel,
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
