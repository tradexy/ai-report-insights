
import React, { useState } from 'react';
import { AnalysisTask } from '../types';

interface InputControlsProps {
  documentText: string;
  setDocumentText: (text: string) => void;
  query: string;
  setQuery: (query: string) => void;
  selectedTask: AnalysisTask;
  setSelectedTask: (task: AnalysisTask) => void;
  onSubmit: () => void;
  isLoading: boolean; // Main analysis loading
  onFileUpload: (file: File | null) => Promise<void>; // Reverted to accept single File | null
  onUrlFetch: (url: string) => Promise<void>;
  isDocumentLoading: boolean; // Document specific loading
  documentError: string | null; // Document specific error
}

const DocumentLoader: React.FC<{
  onFileUpload: (file: File | null) => Promise<void>; // Reverted
  onUrlFetch: (url: string) => Promise<void>;
  isLoading: boolean; 
  error: string | null; 
  disabled: boolean; 
}> = ({ onFileUpload, onUrlFetch, isLoading, error, disabled }) => {
  const [urlInput, setUrlInput] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null; // Get the single file or null
    await onFileUpload(file);
    event.target.value = ''; // Reset file input
  };

  const handleUrlLoadClick = async () => {
    if (urlInput.trim()) {
      await onUrlFetch(urlInput);
    }
  };

  return (
    <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30 shadow-sm">
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Load Document Source</h3>
      
      <div className="space-y-1">
        <label htmlFor="fileUpload" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Upload File (.txt, .pdf, .docx)
        </label>
        <input
          type="file"
          id="fileUpload"
          // multiple attribute removed
          accept=".txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          aria-describedby="file-upload-help"
          className="block w-full text-sm text-slate-500 dark:text-slate-400
            file:mr-3 file:py-1.5 file:px-3
            file:rounded-md file:border-0
            file:text-xs file:font-semibold
            file:bg-sky-50 file:text-sky-700
            hover:file:bg-sky-100
            dark:file:bg-sky-700 dark:file:text-sky-100 dark:hover:file:bg-sky-600
            disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || disabled}
        />
        <p id="file-upload-help" className="mt-1 text-xs text-slate-500 dark:text-slate-400">Max 5MB. Supported: .txt, .pdf, .docx. For other types or issues, please copy/paste content below.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="urlFetch" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Load from URL
        </label>
        <div className="flex space-x-2">
          <input
            type="url"
            id="urlFetch"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/article (may be blocked)"
            aria-describedby="url-fetch-help"
            className="flex-grow p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            disabled={isLoading || disabled}
          />
          <button
            onClick={handleUrlLoadClick}
            disabled={isLoading || !urlInput.trim() || disabled}
            className="px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading && !error ? ( 
                 <>
                 <svg className="animate-spin -ml-0.5 mr-1.5 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>Loading
                  </>
            ) : 'Load'}
          </button>
        </div>
        <p id="url-fetch-help" className="mt-1 text-xs text-slate-500 dark:text-slate-400">Note: Direct URL fetching is often blocked by websites (CORS). If so, please copy/paste content.</p>
      </div>

      {isLoading && <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-2">
            <svg className="animate-spin mr-1.5 h-3 w-3 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>Processing document...</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-2" role="alert">{error}</p>}
    </div>
  );
};


const DocumentInput: React.FC<{value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, disabled?: boolean, task: AnalysisTask}> = ({ value, onChange, disabled, task }) => {
  const isDocRequired = task === AnalysisTask.FACT_EXTRACTION || task === AnalysisTask.QUERY_DOCUMENT || task === AnalysisTask.SUMMARIZE_DOCUMENT || task === AnalysisTask.THEMATIC_CONTENT_ANALYSIS;
  let placeholderText = task === AnalysisTask.WEB_ASSISTED_INSIGHT ? "Optional: Provide additional context for web search..." : "Paste document text here, or load from above (e.g., earnings report, news article)...";
  if (value) {
      placeholderText = "Document content loaded. You can edit it here if needed."
  }
  return (
    <div>
      <label htmlFor="documentText" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        Document Text / Content {isDocRequired && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id="documentText"
        value={value}
        onChange={onChange}
        placeholder={placeholderText}
        rows={10}
        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out disabled:bg-slate-50 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-sm bg-white dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        disabled={disabled}
        aria-label="Document text input area"
      />
    </div>
  );
};

const QueryInput: React.FC<{value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled?: boolean, task: AnalysisTask}> = ({ value, onChange, disabled, task }) => {
  let placeholderText = "Enter your query or instructions here...";
  let labelText = "Query / Instructions";
  let isQueryRequired = true;


  if (task === AnalysisTask.FACT_EXTRACTION) {
    placeholderText = "e.g., Revenue, Net Profit, CEO Name";
    labelText = "Facts to Extract (comma-separated)";
  } else if (task === AnalysisTask.QUERY_DOCUMENT) {
    placeholderText = "e.g., What are the main risks mentioned?";
    labelText = "Question about the document";
  } else if (task === AnalysisTask.SUMMARIZE_DOCUMENT) {
    placeholderText = "Optional: e.g., Focus on financial performance";
    labelText = "Summarization Focus (optional)";
    isQueryRequired = false; 
  } else if (task === AnalysisTask.WEB_ASSISTED_INSIGHT) { // Renamed
    placeholderText = "e.g., Latest trends in renewable energy?";
    labelText = "Web-Assisted Insight Query";
  } else if (task === AnalysisTask.THEMATIC_CONTENT_ANALYSIS) {
    placeholderText = "Optional: e.g., Focus on themes related to technology or sentiment";
    labelText = "Theme Guidance (optional)";
    isQueryRequired = false;
  }
  
  return (
    <div>
      <label htmlFor="query" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {labelText} {isQueryRequired && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        id="query"
        value={value}
        onChange={onChange}
        placeholder={placeholderText}
        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out disabled:bg-slate-50 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-sm bg-white dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        disabled={disabled}
        aria-label="Query input"
      />
    </div>
  );
};


export const InputControls: React.FC<InputControlsProps> = ({
  documentText,
  setDocumentText,
  query,
  setQuery,
  selectedTask,
  setSelectedTask,
  onSubmit,
  isLoading, 
  onFileUpload,
  onUrlFetch,
  isDocumentLoading, 
  documentError
}) => {
  const handleTaskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTask(e.target.value as AnalysisTask);
  };

  const handleDocumentTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocumentText(e.target.value);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };
  
  const globallyDisabled = isLoading; // API key is assumed to be set via process.env

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="analysisTask" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Analysis Task <span className="text-red-500">*</span>
        </label>
        <select
          id="analysisTask"
          value={selectedTask}
          onChange={handleTaskChange}
          className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-700/50"
          disabled={globallyDisabled || isDocumentLoading}
          aria-label="Select Analysis Task"
        >
          {Object.values(AnalysisTask).map(task => (
            <option key={task} value={task}>{task}</option>
          ))}
        </select>
      </div>

      <DocumentLoader
        onFileUpload={onFileUpload}
        onUrlFetch={onUrlFetch}
        isLoading={isDocumentLoading}
        error={documentError}
        disabled={globallyDisabled} 
      />

      <DocumentInput 
        value={documentText} 
        onChange={handleDocumentTextChange} 
        disabled={globallyDisabled || isDocumentLoading} 
        task={selectedTask}
      />
      <QueryInput 
        value={query} 
        onChange={handleQueryChange} 
        disabled={globallyDisabled || isDocumentLoading} 
        task={selectedTask}
      />

      <button
        onClick={onSubmit}
        disabled={globallyDisabled || isDocumentLoading} 
        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white 
                   bg-blue-600 hover:bg-blue-700 dark:bg-sky-700 dark:hover:bg-sky-600
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 
                   transition duration-150 ease-in-out 
                   disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        aria-live="polite"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing...
          </>
        ) : (
          'Analyze'
        )}
      </button>
      {/* API Key missing message removed, assumed to be handled by environment */}
    </div>
  );
};
