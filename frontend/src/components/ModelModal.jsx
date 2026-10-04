import React from 'react';
import {
  X,
  Cpu,
  ShieldCheck,
  Zap,
  Server,
  Terminal,
  CheckCircle2,
} from 'lucide-react';

export default function ModelModal({ isOpen, onClose, health }) {
  if (!isOpen) return null;

  const ollama = health?.ollama || {};
  const modelName = health?.agent?.model || 'qwen3:4b';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-icon">
              <Cpu size={18} />
            </div>
            <div>
              <h3>Model & Inference Information</h3>
              <p className="modal-subtitle">
                Configuration and local execution environment
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="model-info-grid">
            <div className="model-info-row">
              <span className="info-label">Active Model</span>
              <span className="info-value highlight-cyan">{modelName}</span>
            </div>

            <div className="model-info-row">
              <span className="info-label">Inference Runtime</span>
              <span className="info-value">Ollama Local Daemon</span>
            </div>

            <div className="model-info-row">
              <span className="info-label">Ollama Host</span>
              <span className="info-value code-font">
                {ollama.url || 'http://localhost:11434'}
              </span>
            </div>

            <div className="model-info-row">
              <span className="info-label">Connection Status</span>
              <span
                className={`info-value ${
                  ollama.connected ? 'text-emerald' : 'text-rose'
                }`}
              >
                {ollama.connected ? '● Connected & Ready' : '○ Offline'}
              </span>
            </div>

            <div className="model-info-row">
              <span className="info-label">Agent Framework</span>
              <span className="info-value">LangChain (ChatOllama)</span>
            </div>

            <div className="model-info-row">
              <span className="info-label">Agent Architecture</span>
              <span className="info-value">Tool-Calling Loop (agent.py)</span>
            </div>
          </div>

          <div className="security-notice-box">
            <div className="security-notice-header">
              <ShieldCheck size={18} className="shield-icon" />
              <span>100% Local & Private Execution</span>
            </div>
            <p className="security-notice-p">
              All agent reasoning, tool invocations, and user messages are
              executed entirely on your local machine using Ollama and local
              Python runtime. No prompts or data are sent to OpenAI, Anthropic,
              Google, or any cloud API.
            </p>
          </div>

          {ollama.models && ollama.models.length > 0 && (
            <div className="available-models-box">
              <span className="available-title">Installed Ollama Models</span>
              <div className="model-tags">
                {ollama.models.map((m) => (
                  <span
                    key={m}
                    className={`model-tag ${
                      m.includes(modelName) ? 'active-model-tag' : ''
                    }`}
                  >
                    {m} {m.includes(modelName) ? ' (Active)' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="modal-btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
