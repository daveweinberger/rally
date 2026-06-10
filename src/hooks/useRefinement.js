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
      console.error("Adventure chat refinement failed:", err);
      
      // Fallback to client-side simulated chat telemetry during local development
      if (import.meta.env.DEV) {
        console.warn("Firebase Emulator offline. Simulating mock chat refinement client-side.");
        try {
          const finalResult = await simulateMockRefinementStream((chunk) => {
            setMessages(prev => {
              const list = [...prev];
              list[list.length - 1] = {
                ...list[list.length - 1],
                content: list[list.length - 1].content + chunk
              };
              return list;
            });
          });
          
          if (finalResult.results && finalResult.results.length > 0 && onUpdateResults) {
            onUpdateResults(finalResult.results, finalResult.generalExplanation, finalResult.groundingMetadata);
          }
          
          setMessages(prev => {
            const list = [...prev];
            list[list.length - 1] = {
              role: 'model',
              content: finalResult.text,
              groundingMetadata: finalResult.groundingMetadata
            };
            return list;
          });
          setIsStreaming(false);
          return;
        } catch (simErr) {
          console.error("Mock chat simulation failed:", simErr);
        }
      }

      setError(err.message || 'Failed to refine recommendation.');
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
