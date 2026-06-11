import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase.js';
import { simulateMockRefinementStream } from '../utils/mockTelemetry.js';

export function useRefinement(initialConstraints, initialResults, generalExplanation, onUpdateResults) {
  // Formats initial query and results into standard chat history
  const buildInitialMessages = () => {
    if (!initialResults || initialResults.length === 0) return [];

    const constraintsText = `I am planning an adventure. Here are my parameters:
- Starting Location: ${initialConstraints.startLocation}
- Time Window: ${initialConstraints.timeWindow}
- Activity Preferences: ${Array.isArray(initialConstraints.activities) ? initialConstraints.activities.join(', ') : initialConstraints.activities}
- Max Driving: ${initialConstraints.maxDriveTime}
- Experience Level: ${initialConstraints.experienceLevel}
${initialConstraints.notes ? `- Notes: ${initialConstraints.notes}` : ''}`;

    const resultsText = `I have analyzed your constraints and live conditions. Here are the top 2-3 optimal options I selected:

${initialResults.map((r, idx) => `
**#${idx + 1}: ${r.name}** (${r.location})
- Match Reason: ${r.matchReason}
- Difficulty Level: ${r.difficulty}
- Driving Time: ${r.driveTime} (${r.distance})
`).join('')}

*Overview & Conditions:*
${generalExplanation}`;

    return [
      { role: 'user', content: constraintsText },
      { role: 'model', content: resultsText }
    ];
  };

  const [messages, setMessages] = useState(() => buildInitialMessages());
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    setError(null);
    setIsStreaming(true);

    const newUserMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    // Append streaming model response placeholder
    const streamingPlaceholder = { role: 'model', content: '', isStreaming: true };
    setMessages(prev => [...prev, streamingPlaceholder]);

    try {
      const refineFn = httpsCallable(functions, 'refineAdventure');
      // Use client history context (excludes the placeholder)
      const result = await refineFn({
        history: updatedMessages,
        message: text,
        constraints: initialConstraints
      });
      const data = result.data;
      
      if (data.results && data.results.length > 0 && onUpdateResults) {
        onUpdateResults(data.results, data.generalExplanation, data.groundingMetadata);
      }
      
      setMessages(prev => {
        const list = [...prev];
        list[list.length - 1] = {
          role: 'model',
          content: data.text,
          groundingMetadata: data.groundingMetadata || null
        };
        return list;
      });
    } catch (err) {
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

      setError(verboseError);
      // Remove placeholder
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }, [messages, initialConstraints, onUpdateResults]);

  return {
    messages,
    sendMessage,
    isStreaming,
    error
  };
}
