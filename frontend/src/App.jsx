import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Menu,
  X,
  AlertOctagon,
  RefreshCw,
  Terminal,
  Activity,
  Cpu,
} from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import ChatMessage from './components/ChatMessage.jsx';
import ToolsModal from './components/ToolsModal.jsx';
import ModelModal from './components/ModelModal.jsx';

const SUGGESTED_PROMPTS = [
  { label: 'Calculate 25 * 40', text: 'Calculate 25 * 40' },
  { label: 'Weather in Tokyo', text: 'What is the current weather in Tokyo?' },
  { label: 'Current UTC Time', text: 'What is the current UTC time?' },
  {
    label: 'Search Python 3.13',
    text: 'Search DuckDuckGo for new features in Python 3.13',
  },
  {
    label: 'Write to note.txt',
    text: 'Write "Autonomous agentic AI running locally with LangChain and Qwen3." to note.txt',
  },
  { label: 'Read note.txt', text: 'Read the contents of the file note.txt' },
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const [sessionId, setSessionId] = useState(() => 'sess_' + Date.now());

  const [health, setHealth] = useState(null);
  const [toolsList, setToolsList] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  const wsRef = useRef(null);
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // ------------------------------------------------------------
  // HEALTH & TOOLS FETCHING
  // ------------------------------------------------------------

  const fetchHealthAndTools = useCallback(async () => {
    try {
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealth(hData);
      } else {
        setHealth((prev) => ({
          ...prev,
          backend: 'offline',
          ollama: { connected: false },
        }));
      }
    } catch {
      setHealth((prev) => ({
        ...prev,
        backend: 'offline',
        ollama: { connected: false },
      }));
    }

    try {
      const toolsRes = await fetch('/api/tools');
      if (toolsRes.ok) {
        const tData = await toolsRes.json();
        setToolsList(tData.tools || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchHealthAndTools();
    const timer = setInterval(fetchHealthAndTools, 6000);
    return () => clearInterval(timer);
  }, [fetchHealthAndTools]);

  // ------------------------------------------------------------
  // WEBSOCKET SETUP & STREAMING
  // ------------------------------------------------------------

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use window.location.host so Vite proxy (/ws) handles it seamlessly
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
      // Send ping immediately
      ws.send(JSON.stringify({ type: 'ping' }));
    };

    ws.onclose = () => {
      setWsConnected(false);
      // Reconnect after 3 seconds
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleWsEvent(payload);
      } catch (err) {
        console.error('Error parsing WebSocket frame:', err);
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket]);

  // Handle Real-Time Events
  const handleWsEvent = (event) => {
    const { type, data, final_answer, message: errorMsg } = event;

    if (type === 'pong' || type === 'reset_ack') {
      return;
    }

    if (type === 'status') {
      const statusText = data?.message || 'Agent is working...';
      setCurrentStatus(statusText);
      return;
    }

    if (type === 'step_start') {
      // Step counter
      return;
    }

    if (type === 'tool_start') {
      const toolName = data.name;
      const toolArgs = data.args;
      const toolId = data.id;
      const timestamp = data.timestamp || Date.now() / 1000;

      setCurrentStatus(`Calling ${toolName}...`);

      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx < 0 || copy[lastIdx].role !== 'agent') return prev;

        const currentAgentMsg = { ...copy[lastIdx] };
        const existingTools = currentAgentMsg.tools ? [...currentAgentMsg.tools] : [];

        // Check if tool already exists
        const exists = existingTools.findIndex((t) => t.id === toolId);
        if (exists === -1) {
          existingTools.push({
            id: toolId,
            name: toolName,
            args: toolArgs,
            status: 'running',
            timestamp,
          });
        }
        currentAgentMsg.tools = existingTools;
        copy[lastIdx] = currentAgentMsg;
        return copy;
      });
      return;
    }

    if (type === 'tool_running') {
      const toolId = data.id;
      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx < 0 || copy[lastIdx].role !== 'agent') return prev;

        const currentAgentMsg = { ...copy[lastIdx] };
        const existingTools = currentAgentMsg.tools ? [...currentAgentMsg.tools] : [];
        const idx = existingTools.findIndex((t) => t.id === toolId);
        if (idx !== -1) {
          existingTools[idx] = { ...existingTools[idx], status: 'running' };
        }
        currentAgentMsg.tools = existingTools;
        copy[lastIdx] = currentAgentMsg;
        return copy;
      });
      return;
    }

    if (type === 'tool_result') {
      const { id, result, duration, status: toolStatus } = data;
      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx < 0 || copy[lastIdx].role !== 'agent') return prev;

        const currentAgentMsg = { ...copy[lastIdx] };
        const existingTools = currentAgentMsg.tools ? [...currentAgentMsg.tools] : [];
        const idx = existingTools.findIndex((t) => t.id === id);
        if (idx !== -1) {
          existingTools[idx] = {
            ...existingTools[idx],
            result,
            duration: duration ?? existingTools[idx].duration,
            status: toolStatus || 'completed',
          };
        }
        currentAgentMsg.tools = existingTools;
        copy[lastIdx] = currentAgentMsg;
        return copy;
      });
      return;
    }

    if (type === 'final_answer') {
      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx < 0 || copy[lastIdx].role !== 'agent') return prev;

        const currentAgentMsg = { ...copy[lastIdx] };
        currentAgentMsg.content = final_answer || data || '';
        copy[lastIdx] = currentAgentMsg;
        return copy;
      });
      return;
    }

    if (type === 'done') {
      setIsGenerating(false);
      setCurrentStatus('');
      if (final_answer) {
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (lastIdx >= 0 && copy[lastIdx].role === 'agent') {
            copy[lastIdx] = {
              ...copy[lastIdx],
              content: final_answer,
            };
          }
          return copy;
        });
      }
      return;
    }

    if (type === 'error') {
      setIsGenerating(false);
      setCurrentStatus('');
      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx >= 0 && copy[lastIdx].role === 'agent') {
          copy[lastIdx] = {
            ...copy[lastIdx],
            error: errorMsg || 'An unexpected error occurred.',
          };
        } else {
          copy.push({
            role: 'agent',
            content: '',
            error: errorMsg || 'An error occurred.',
            timestamp: Date.now() / 1000,
          });
        }
        return copy;
      });
    }
  };

  // ------------------------------------------------------------
  // SEND MESSAGE
  // ------------------------------------------------------------

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isGenerating) return;

    setInputValue('');
    setIsGenerating(true);
    setCurrentStatus('Agent is starting...');

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now() / 1000,
    };

    const initialAgentMessage = {
      role: 'agent',
      content: '',
      tools: [],
      error: null,
      timestamp: Date.now() / 1000,
    };

    setMessages((prev) => [...prev, userMessage, initialAgentMessage]);

    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          content: text,
          session_id: sessionId,
        })
      );
    } else {
      // Fallback to HTTP POST endpoint
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, session_id: sessionId }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'HTTP chat request failed.');
        }

        const data = await response.json();
        // Process events
        if (data.events) {
          data.events.forEach((ev) => {
            handleWsEvent({ type: ev.event, data: ev.data });
          });
        }
        handleWsEvent({ type: 'done', final_answer: data.response });
      } catch (err) {
        handleWsEvent({ type: 'error', message: err.message });
      }
    }
  };

  // ------------------------------------------------------------
  // ACTIONS: CLEAR / NEW CHAT
  // ------------------------------------------------------------

  const handleNewChat = async () => {
    const newSession = 'sess_' + Date.now();
    setSessionId(newSession);
    setMessages([]);
    setIsGenerating(false);
    setCurrentStatus('');

    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: newSession }),
      });
    } catch {
      // Ignore
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'reset', session_id: newSession })
      );
    }
  };

  const handleClearConversation = async () => {
    setMessages([]);
    setIsGenerating(false);
    setCurrentStatus('');

    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      // Ignore
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'reset', session_id: sessionId })
      );
    }
  };

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStatus]);

  const isOllamaOnline = Boolean(health?.ollama?.connected);
  const isBackendOnline = health?.backend === 'connected';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        health={health}
        toolsList={toolsList}
        onNewChat={handleNewChat}
        onClearConversation={handleClearConversation}
        onOpenToolsModal={() => setIsToolsModalOpen(true)}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Chat Canvas */}
      <main className="main-content">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="navbar-left">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="navbar-title-group">
              <span className="navbar-app-title">🤖 LOCAL AGENTIC AI</span>
              <span className="navbar-tag">v1.0 Local</span>
            </div>
          </div>

          <div className="navbar-right">
            <div className="nav-badges">
              <span
                className={`nav-status-badge ${
                  isBackendOnline ? 'badge-ok' : 'badge-err'
                }`}
              >
                <span className="dot" />
                {isBackendOnline ? 'Backend Connected' : 'Backend Offline'}
              </span>

              <span
                className={`nav-status-badge ${
                  isOllamaOnline ? 'badge-ok' : 'badge-err'
                }`}
              >
                <span className="dot" />
                {isOllamaOnline ? 'Ollama Connected' : 'Ollama Offline'}
              </span>

              <span
                className="nav-model-pill"
                onClick={() => setIsModelModalOpen(true)}
                title="Model settings"
              >
                <Cpu size={13} />
                <span>{health?.agent?.model || 'qwen3:4b'}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Offline Alerts */}
        {!isBackendOnline && (
          <div className="system-warning-banner banner-red">
            <AlertOctagon size={17} />
            <span>
              <strong>Backend Offline:</strong> Unable to connect to FastAPI
              backend on <code>localhost:8000</code>. Ensure the server is
              running.
            </span>
          </div>
        )}

        {isBackendOnline && !isOllamaOnline && (
          <div className="system-warning-banner banner-amber">
            <AlertOctagon size={17} />
            <span>
              <strong>Ollama Offline:</strong> Unable to connect to Ollama. Make
              sure Ollama is running on your machine (<code>ollama serve</code>).
            </span>
          </div>
        )}

        {/* Chat Messages Scroll Container */}
        <div className="chat-scroll-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-brand-icon">
                <Bot size={40} />
              </div>
              <h2>Local Agentic AI</h2>
              <p className="empty-description">
                Powered by <strong>LangChain</strong> and local{' '}
                <strong>Qwen3:4b</strong> via <strong>Ollama</strong>. Ask
                questions, run math equations, search the web, manage files, or
                inspect real-time tool decisions.
              </p>

              <div className="suggested-prompts-section">
                <span className="suggested-prompts-label">
                  <Sparkles size={14} /> Try asking the agent:
                </span>
                <div className="prompts-grid">
                  {SUGGESTED_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendMessage(p.text)}
                    >
                      <span className="chip-label">{p.label}</span>
                      <span className="chip-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, index) => {
                const isLastAgentMsg =
                  msg.role === 'agent' && index === messages.length - 1;
                return (
                  <ChatMessage
                    key={index}
                    message={msg}
                    isStreaming={isLastAgentMsg && isGenerating}
                    currentStatus={isLastAgentMsg ? currentStatus : ''}
                  />
                );
              })}
              <div ref={chatBottomRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="chat-input-area">
          <form
            className="input-box-container"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              className="chat-textarea"
              placeholder="Ask your local agent... (e.g. Calculate 25 * 40, check weather, search web)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isGenerating}
            />

            <button
              type="submit"
              className={`send-button ${
                inputValue.trim() && !isGenerating ? 'send-active' : ''
              }`}
              disabled={!inputValue.trim() || isGenerating}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>

          <div className="input-hint-row">
            <span>
              Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new
              line
            </span>
            <span className="privacy-badge">🔒 100% Local Inference</span>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ToolsModal
        isOpen={isToolsModalOpen}
        onClose={() => setIsToolsModalOpen(false)}
        tools={toolsList}
      />

      <ModelModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        health={health}
      />
    </div>
  );
}
