import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  User,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  Terminal,
} from 'lucide-react';
import AgentActivity from './AgentActivity.jsx';

export default function ChatMessage({ message, isStreaming = false, currentStatus = '' }) {
  const isUser = message.role === 'user';
  const [copiedMessage, setCopiedMessage] = useState(false);

  const copyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  if (isUser) {
    return (
      <div className="chat-row user-row">
        <div className="message-bubble user-bubble">
          <div className="message-content">{message.content}</div>
          <div className="message-timestamp">
            {message.timestamp
              ? new Date(message.timestamp * 1000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </div>
        </div>
        <div className="avatar user-avatar">
          <User size={16} />
        </div>
      </div>
    );
  }

  // Agent Message
  const hasTools = message.tools && message.tools.length > 0;
  const isError = Boolean(message.error);

  return (
    <div className={`chat-row agent-row ${isError ? 'agent-error' : ''}`}>
      <div className="avatar agent-avatar">
        <Bot size={17} />
      </div>

      <div className="agent-bubble-container">
        {/* Agent Name Tag & Status Bar */}
        <div className="agent-meta-header">
          <span className="agent-title">Agent</span>
          <span className="agent-model-tag">qwen3:4b</span>

          {isStreaming && (
            <div className="live-status-pill">
              <Loader2 size={12} className="spin-icon" />
              <span>{currentStatus || 'Agent is working...'}</span>
            </div>
          )}
        </div>

        {/* Live / Completed Agent Activity Section */}
        {hasTools && (
          <AgentActivity
            tools={message.tools}
            isThinking={isStreaming}
            activeStatus={currentStatus}
          />
        )}

        {/* Interim status indicator if waiting for tools or thinking and no content yet */}
        {isStreaming && !message.content && !hasTools && (
          <div className="thinking-card">
            <div className="thinking-indicator">
              <span className="thinking-dot dot-1" />
              <span className="thinking-dot dot-2" />
              <span className="thinking-dot dot-3" />
            </div>
            <span className="thinking-text">
              {currentStatus || 'Agent is thinking...'}
            </span>
          </div>
        )}

        {/* Error message */}
        {isError && (
          <div className="error-banner">
            <AlertTriangle size={16} className="error-icon" />
            <div className="error-content">
              <strong>Execution Error:</strong>
              <p>{message.error}</p>
            </div>
          </div>
        )}

        {/* Final Agent Response Markdown */}
        {message.content && (
          <div className="message-bubble agent-bubble">
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    return inline ? (
                      <code className="inline-code" {...props}>
                        {children}
                      </code>
                    ) : (
                      <div className="code-block-wrapper">
                        <div className="code-block-header">
                          <span className="code-lang">
                            {(className || '').replace('language-', '') || 'code'}
                          </span>
                          <button
                            type="button"
                            className="code-copy-btn"
                            onClick={() =>
                              navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
                            }
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <pre className="code-block-pre">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            <div className="bubble-footer">
              <button
                type="button"
                className="action-icon-btn"
                title="Copy response"
                onClick={() => copyText(message.content)}
              >
                {copiedMessage ? <Check size={13} /> : <Copy size={13} />}
              </button>
              {message.timestamp && (
                <span className="message-timestamp">
                  {new Date(message.timestamp * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
