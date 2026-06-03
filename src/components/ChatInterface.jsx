import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import Attribution from './Attribution.jsx';

// Simple lightweight markdown formatter to keep bundle size small and loading speed instant
function formatMarkdown(text) {
  if (!text) return '';
  
  let formatted = text
    // Escaping HTML characters
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold text (**bold**)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Bullet points
    .replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>')
    // Bullet points nested under ul
    .replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>')
    // Headers
    .replace(/^### (.*?)$/gm, '<h4 style="margin: 0.5rem 0 0.25rem 0; font-size:0.95rem; text-transform:uppercase;">$1</h4>')
    .replace(/^## (.*?)$/gm, '<h3 style="margin: 0.75rem 0 0.35rem 0; font-size:1.1rem; text-transform:uppercase;">$1</h3>')
    // Line breaks
    .replace(/\n/g, '<br />');

  // Fix nested double <ul> tags
  formatted = formatted.replace(/<\/ul>\s*<ul>/g, '');

  return formatted;
}

const CHIPS = [
  "Closer option?",
  "Easier trail?",
  "Dog-friendly alternatives?",
  "Avoid the highway?"
];

export default function ChatInterface({ messages, sendMessage, isStreaming, error }) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const chatEndRef = useRef(null);
  const isFirstRender = useRef(true);

  // Auto-scroll to bottom of chat, but skip on initial mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  const handleChipClick = (chipText) => {
    if (isStreaming) return;
    sendMessage(chipText);
  };

  return (
    <div className="glass-card flex-col gap-md">
      {/* Collapsible Header */}
      <div 
        className="row justify-between align-center" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          cursor: 'pointer',
          paddingBottom: isOpen ? '0.75rem' : '0', 
          borderBottom: isOpen ? '1px solid var(--border-muted)' : 'none',
          transition: 'padding 0.2s ease'
        }}
      >
        <div className="row align-center gap-sm">
          <MessageSquare size={16} color="var(--accent-moss)" />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
            Refine Your Rally
          </h3>
        </div>
        <button 
          type="button" 
          className="glass-btn glass-btn-outline" 
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px' }}
        >
          <span style={{ marginRight: '4px' }}>{isOpen ? 'Close Chat' : 'Chat & Refine'}</span>
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.2s ease both' }}>
          {/* Messages Feed */}
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={idx} 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignItems: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  {/* Message Bubble */}
                  <div 
                    style={{
                      background: isUser ? 'var(--accent-moss)' : 'rgba(255, 255, 255, 0.05)',
                      color: isUser ? '#ffffff' : 'var(--text-primary)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      fontSize: '0.9rem',
                      lineHeight: '1.45',
                      boxShadow: isUser ? 'none' : '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    {isUser ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} 
                        style={{ wordBreak: 'break-word' }}
                      />
                    )}
                    
                    {msg.isStreaming && (
                      <span 
                        style={{
                          display: 'inline-block',
                          width: '6px',
                          height: '14px',
                          background: 'currentColor',
                          marginLeft: '4px',
                          animation: 'pulse-dot 1s infinite'
                        }}
                      />
                    )}
                  </div>

                  {/* Citations immediately below model bubble */}
                  {!isUser && msg.groundingMetadata && (
                    <div style={{ width: '100%' }}>
                      <Attribution groundingMetadata={msg.groundingMetadata} />
                    </div>
                  )}
                </div>
              );
            })}
            {error && (
              <div 
                style={{
                  alignSelf: 'center',
                  color: '#d93025',
                  fontSize: '0.8rem',
                  border: '1px solid rgba(217, 48, 37, 0.15)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  background: 'rgba(217, 48, 37, 0.03)'
                }}
              >
                Error: {error}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isStreaming}
                onClick={() => handleChipClick(chip)}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                  opacity: isStreaming ? 0.5 : 1
                }}
              >
                <CornerDownRight size={10} color="var(--accent-moss)" />
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Input form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              disabled={isStreaming}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isStreaming ? "System generating response..." : "Refine your options..."}
              className="glass-input"
              style={{ flexGrow: 1 }}
            />
            <button 
              type="submit" 
              className="glass-btn glass-btn-primary" 
              disabled={isStreaming || !input.trim()}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
