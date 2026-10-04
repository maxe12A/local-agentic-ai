import React from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Wrench,
  Info,
  Calculator,
  FileText,
  CloudSun,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar({
  health,
  toolsList,
  onNewChat,
  onClearConversation,
  onOpenToolsModal,
  onOpenModelModal,
  isOpen = true,
  onCloseMobile,
}) {
  const isOllamaOnline = Boolean(health?.ollama?.connected);
  const isBackendOnline = health?.backend === 'connected';
  const modelName = health?.agent?.model || 'qwen3:4b';
  const framework = health?.agent?.framework || 'LangChain';
  const architecture = health?.agent?.architecture || 'Tool-Calling Agent';

  const defaultToolCategories = [
    {
      name: 'Calculator',
      desc: 'Safe math expressions',
      icon: Calculator,
      color: '#38bdf8',
    },
    {
      name: 'File Operations',
      desc: 'Read & write local files',
      icon: FileText,
      color: '#a855f7',
    },
    {
      name: 'Weather',
      desc: 'Live forecast via wttr.in',
      icon: CloudSun,
      color: '#f59e0b',
    },
    {
      name: 'Web Search',
      desc: 'DuckDuckGo Instant Answers',
      icon: Globe,
      color: '#10b981',
    },
    {
      name: 'Current Time',
      desc: 'UTC and local system time',
      icon: Clock,
      color: '#ec4899',
    },
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-header">
        <div className="brand-logo">
          <div className="brand-icon-box">
            <Bot size={22} className="brand-icon" />
          </div>
          <div className="brand-text">
            <h2>LOCAL AGENTIC AI</h2>
            <span className="brand-subtitle">Autonomous Tool Agent</span>
          </div>
        </div>
      </div>

      <div className="sidebar-content">
        {/* Status Indicators */}
        <div className="sidebar-section">
          <div className="section-label">SYSTEM STATUS</div>
          <div className="status-grid">
            <div
              className={`status-pill ${
                isBackendOnline ? 'status-ok' : 'status-err'
              }`}
            >
              {isBackendOnline ? (
                <CheckCircle2 size={13} className="status-dot-icon" />
              ) : (
                <XCircle size={13} className="status-dot-icon" />
              )}
              <span>{isBackendOnline ? 'Backend Connected' : 'Backend Offline'}</span>
            </div>

            <div
              className={`status-pill ${
                isOllamaOnline ? 'status-ok' : 'status-err'
              }`}
            >
              {isOllamaOnline ? (
                <CheckCircle2 size={13} className="status-dot-icon" />
              ) : (
                <XCircle size={13} className="status-dot-icon" />
              )}
              <span>{isOllamaOnline ? 'Ollama Connected' : 'Ollama Offline'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sidebar-section action-section">
          <button
            type="button"
            className="sidebar-btn btn-primary"
            onClick={onNewChat}
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            className="sidebar-btn btn-secondary"
            onClick={onClearConversation}
          >
            <Trash2 size={15} />
            <span>Clear Conversation</span>
          </button>
        </div>

        {/* Agent Metadata Card */}
        <div className="sidebar-section">
          <div className="section-label">AGENT SPECIFICATIONS</div>
          <div className="specs-card">
            <div className="spec-row">
              <span className="spec-key">
                <Cpu size={13} /> Model
              </span>
              <span className="spec-val highlight-val">{modelName}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">
                <Layers size={13} /> Framework
              </span>
              <span className="spec-val">{framework}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">
                <Wrench size={13} /> Architecture
              </span>
              <span className="spec-val">{architecture}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">
                <ShieldCheck size={13} /> Inference
              </span>
              <span className="spec-val badge-local">100% Local</span>
            </div>
          </div>
        </div>

        {/* Registered Tools List */}
        <div className="sidebar-section">
          <div className="section-label-row">
            <span className="section-label">AVAILABLE TOOLS</span>
            <span className="tools-badge">
              {toolsList?.length || 5} active
            </span>
          </div>

          <div className="tools-list-compact">
            {defaultToolCategories.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.name}
                  className="tool-badge-item"
                  onClick={onOpenToolsModal}
                  role="button"
                  tabIndex={0}
                  title="Click to view tool documentation"
                >
                  <div
                    className="tool-mini-icon"
                    style={{ backgroundColor: `${t.color}20`, color: t.color }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="tool-badge-info">
                    <span className="tool-badge-name">{t.name}</span>
                    <span className="tool-badge-desc">{t.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info Buttons */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="footer-nav-btn"
          onClick={onOpenToolsModal}
        >
          <Wrench size={15} />
          <span>Show Tools</span>
        </button>

        <button
          type="button"
          className="footer-nav-btn"
          onClick={onOpenModelModal}
        >
          <Info size={15} />
          <span>Model Information</span>
        </button>
      </div>
    </aside>
  );
}
