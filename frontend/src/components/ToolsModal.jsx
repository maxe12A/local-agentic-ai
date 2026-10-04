import React from 'react';
import {
  X,
  Wrench,
  Calculator,
  FileText,
  FilePlus,
  CloudSun,
  Globe,
  Clock,
  Code2,
} from 'lucide-react';

const ICON_MAP = {
  calculate: Calculator,
  get_current_time: Clock,
  read_file: FileText,
  write_file: FilePlus,
  get_weather: CloudSun,
  web_search: Globe,
};

export default function ToolsModal({ isOpen, onClose, tools = [] }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-icon">
              <Wrench size={18} />
            </div>
            <div>
              <h3>Agent Tools & Capabilities</h3>
              <p className="modal-subtitle">
                Registered LangChain tools available to the autonomous agent
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
          <div className="tools-modal-grid">
            {tools.map((tool) => {
              const Icon = ICON_MAP[tool.name] || Wrench;
              const props = tool.parameters?.properties || {};
              const required = tool.parameters?.required || [];

              return (
                <div key={tool.name} className="tool-detail-card">
                  <div className="tool-detail-header">
                    <div className="tool-detail-icon-wrap">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4>{tool.displayName || tool.name}</h4>
                      <span className="tool-detail-sysname">
                        function: <code>{tool.name}</code>
                      </span>
                    </div>
                  </div>

                  <p className="tool-detail-desc">{tool.description}</p>

                  <div className="tool-params-section">
                    <span className="tool-params-title">
                      <Code2 size={13} /> Parameters
                    </span>
                    {Object.keys(props).length === 0 ? (
                      <span className="no-params">None required</span>
                    ) : (
                      <div className="params-list">
                        {Object.entries(props).map(([propName, propDef]) => (
                          <div key={propName} className="param-item">
                            <div className="param-item-top">
                              <span className="param-name">{propName}</span>
                              <span className="param-type">{propDef.type}</span>
                              {required.includes(propName) && (
                                <span className="param-required">required</span>
                              )}
                            </div>
                            {propDef.description && (
                              <p className="param-desc">{propDef.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
