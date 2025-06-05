import React from 'react';
import { LogEntry } from '../types';

interface ObservabilityLogDisplayProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const ObservabilityLogDisplay: React.FC<ObservabilityLogDisplayProps> = ({ logs, onClearLogs }) => {
  return (
    <div>
      {logs.length > 0 && (
        <button
          onClick={onClearLogs}
          className="mb-3 px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-xs font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800"
          aria-label="Clear observability logs"
        >
          Clear Logs
        </button>
      )}
      {logs.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No analysis actions logged yet.</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {logs.map(log => (
            <div 
              key={log.id} 
              className={`p-3 rounded-md border 
                ${log.isError 
                  ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/50' 
                  : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/50'
                }`}
            >
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{log.timestamp.toLocaleTimeString()}</span>
                <span 
                  className={`font-semibold 
                    ${log.isError 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-500' // Changed dark:text-green-400 to dark:text-green-500
                    }`}
                >
                  {log.task}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200"><strong>Query:</strong> {log.promptSummary}</p>
              <p 
                className={`text-sm 
                  ${log.isError 
                    ? 'text-red-700 dark:text-red-300' 
                    : 'text-slate-700 dark:text-slate-200'
                  }`}
              >
                <strong>Response:</strong> {log.responseSummary}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};