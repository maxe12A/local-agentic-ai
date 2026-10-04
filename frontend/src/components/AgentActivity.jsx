import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import ToolCard from './ToolCard.jsx';

export default function AgentActivity({ tools = [], isThinking = false, activeStatus = '' }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!tools || tools.length === 0) {
    return null;
  }

  const completedCount = tools.filter((t) => t.status === 'completed').length;
  const runningCount = tools.filter((t) => t.status === 'running').length;
  const failedCount = tools.filter((t) => t.status === 'failed').length;

  return (
    <div className="agent-activity-container">
      <div
        className="agent-activity-header"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
      >
        <div className="activity-title-group">
          <Activity size={15} className="activity-icon" />
          <span className="activity-title">Agent Activity</span>
          <span className="activity-count-badge">
            {tools.length} tool {tools.length === 1 ? 'call' : 'calls'}
          </span>

          {runningCount > 0 && (
            <span className="activity-mini-pill running-pill">
              {runningCount} running
            </span>
          )}
          {failedCount > 0 && (
            <span className="activity-mini-pill failed-pill">
              {failedCount} failed
            </span>
          )}
          {completedCount > 0 && runningCount === 0 && (
            <span className="activity-mini-pill completed-pill">
              {completedCount} completed
            </span>
          )}
        </div>

        <button
          type="button"
          className="activity-toggle-btn"
          aria-label={isOpen ? 'Collapse activity' : 'Expand activity'}
        >
          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {isOpen && (
        <div className="agent-activity-list">
          {tools.map((tool, idx) => (
            <ToolCard key={tool.id || `${tool.name}-${idx}`} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
