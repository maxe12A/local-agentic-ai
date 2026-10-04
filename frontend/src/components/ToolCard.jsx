import React, { useState } from 'react';
import {
  Wrench,
  Calculator,
  FileText,
  FilePlus,
  CloudSun,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

const TOOL_ICONS = {
  calculate: Calculator,
  get_current_time: Clock,
  read_file: FileText,
  write_file: FilePlus,
  get_weather: CloudSun,
  web_search: Globe,
};

export default function ToolCard({ tool }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);

  const IconComponent = TOOL_ICONS[tool.name] || Wrench;
  const isRunning = tool.status === 'running';
  const isFailed = tool.status === 'failed';
  const isCompleted = tool.status === 'completed';

  const formatArgs = (args) => {
    if (!args) return '';
    if (typeof args === 'string') return args;
    if (typeof args === 'object') {
      // If single string property like expression or query, show cleanly
      const keys = Object.keys(args);
      if (keys.length === 1 && typeof args[keys[0]] === 'string') {
        return args[keys[0]];
      }
      return JSON.stringify(args, null, 2);
    }
    return String(args);
  };

  const copyToClipboard = (text, setCopied) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedInput = formatArgs(tool.args);
  const formattedOutput = tool.result ? String(tool.result) : '';

  return (
    <div
      className={`tool-card ${isRunning ? 'tool-running' : ''} ${
        isFailed ? 'tool-failed' : ''
      } ${isCompleted ? 'tool-completed' : ''}`}
    >
      {/* Collapsed Header */}
      <div
        className="tool-card-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
      >
        <div className="tool-header-left">
          <div className="tool-icon-wrapper">
            <IconComponent size={16} className="tool-icon" />
          </div>
          <span className="tool-name">{tool.name}</span>

          {tool.duration !== undefined && tool.duration !== null && (
            <span className="tool-duration-tag">
              {Number(tool.duration).toFixed(2)}s
            </span>
          )}
        </div>

        <div className="tool-header-right">
          {isRunning && (
            <span className="status-badge status-running">
              <Loader2 size={13} className="spin-icon" />
              Running...
            </span>
          )}

          {isCompleted && (
            <span className="status-badge status-completed">
              <CheckCircle2 size={13} />
              Completed
            </span>
          )}

          {isFailed && (
            <span className="status-badge status-failed">
              <AlertCircle size={13} />
              Failed
            </span>
          )}

          <button
            type="button"
            className="expand-btn"
            aria-label={expanded ? 'Collapse tool call' : 'Expand tool call'}
          >
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>
      </div>

      {/* Expanded Body */}
      {expanded && (
        <div className="tool-card-body">
          <div className="tool-field">
            <div className="tool-field-header">
              <span className="field-label">Input</span>
              <button
                type="button"
                className="copy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(formattedInput, setCopiedInput);
                }}
              >
                {copiedInput ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedInput ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="tool-code-box">{formattedInput || 'None'}</pre>
          </div>

          {(formattedOutput || isFailed) && (
            <div className="tool-field">
              <div className="tool-field-header">
                <span className="field-label">
                  {isFailed ? 'Error Output' : 'Result'}
                </span>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(formattedOutput, setCopiedResult);
                  }}
                >
                  {copiedResult ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedResult ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre
                className={`tool-code-box ${
                  isFailed ? 'error-text' : 'result-text'
                }`}
              >
                {formattedOutput || (isFailed ? 'Execution failed' : '')}
              </pre>
            </div>
          )}

          {tool.timestamp && (
            <div className="tool-footer-meta">
              <span>Timestamp: {new Date(tool.timestamp * 1000).toLocaleTimeString()}</span>
              {tool.id && <span className="tool-id-tag">ID: {tool.id.slice(0, 14)}...</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
