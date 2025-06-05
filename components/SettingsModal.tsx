
import React, { useState, useEffect } from 'react';
import { ThemeMode } from '../types';
import { DEFAULT_GEMINI_MODEL } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  onSetModel: (model: string) => void;
  models: string[];
  currentTheme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentModel,
  onSetModel,
  models,
  currentTheme,
  onSetTheme,
}) => {
  const [selectedModelInput, setSelectedModelInput] = useState(currentModel);

  useEffect(() => {
    setSelectedModelInput(currentModel); // Sync with prop changes
  }, [currentModel]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelInput(e.target.value);
    onSetModel(e.target.value);
  };
  
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
    >
      <div 
        className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-lg space-y-6 transform transition-all"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex justify-between items-center border-b dark:border-slate-700 pb-3">
          <h2 id="settings-modal-title" className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* API Configuration Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">API Configuration</h3>
          
          <div>
            <label htmlFor="llmProvider" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              LLM Provider
            </label>
            <select
              id="llmProvider"
              value="Gemini" // Hardcoded for now
              disabled // Hardcoded for now
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed"
            >
              <option value="Gemini">Google Gemini</option>
            </select>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Currently, only Google Gemini is supported. API Key is configured via environment variable (<code>process.env.API_KEY</code>).</p>
          </div>

          <div>
            <label htmlFor="geminiModel" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Gemini Model
            </label>
            <select
              id="geminiModel"
              value={selectedModelInput}
              onChange={handleModelChange}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
            >
              {models.length === 0 && <option value={DEFAULT_GEMINI_MODEL}>{DEFAULT_GEMINI_MODEL} (Default)</option>}
              {models.map(modelName => (
                <option key={modelName} value={modelName}>{modelName}</option>
              ))}
            </select>
          </div>
          {/* API Key input and save/clear buttons removed */}
        </section>

        {/* Appearance Section */}
        <section className="space-y-3 pt-4 border-t dark:border-slate-700">
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">Appearance</h3>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Theme
            </label>
            <div className="flex space-x-2 rounded-md" role="group">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onSetTheme(mode)}
                  className={`px-4 py-2 text-sm font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800
                    ${currentTheme === mode 
                      ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500' 
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  aria-pressed={currentTheme === mode}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="pt-4 border-t dark:border-slate-700 text-right">
            <button
                onClick={onClose}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};
