
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { InputControls } from './components/InputControls';
import { ResponseDisplay } from './components/ResponseDisplay';
import { ObservabilityLogDisplay } from './components/ObservabilityLogDisplay';
import { SettingsModal } from './components/SettingsModal';
import { analyzeText } from './services/geminiService';
import { AnalysisTask, AiResponseData, LogEntry, ThemeMode } from './types';
import { TASK_DESCRIPTIONS, DEFAULT_GEMINI_MODEL, GEMINI_MODELS_LIST } from './constants';

// Import PDF.js and Mammoth
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.3.31/build/pdf.worker.js';

const App: React.FC = () => {
  const [documentText, setDocumentText] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<AnalysisTask>(AnalysisTask.QUERY_DOCUMENT);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<AiResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [isDocumentLoading, setIsDocumentLoading] = useState<boolean>(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  // Settings State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  // API Key is now handled by process.env.API_KEY in geminiService
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>(() => localStorage.getItem('selectedGeminiModel') || DEFAULT_GEMINI_MODEL);
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('theme') as ThemeMode) || 'system');

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      if (theme === 'dark' || (theme === 'system' && mediaQuery.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    updateTheme(); // Initial theme application
    localStorage.setItem('theme', theme);

    // Listen for system theme changes if 'system' is selected
    if (theme === 'system') {
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('selectedGeminiModel', selectedGeminiModel);
  }, [selectedGeminiModel]);

  const addLogEntry = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setLogs(prevLogs => [{ ...entry, id: Date.now().toString(), timestamp: new Date() }, ...prevLogs.slice(0, 9)]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const handleFileUpload = useCallback(async (file: File | null) => {
    if (!file) {
      setDocumentError("No file selected.");
      setIsDocumentLoading(false);
      setDocumentText(''); // Clear previous document text
      return;
    }

    setIsDocumentLoading(true);
    setDocumentError(null);
    setDocumentText(''); // Clear previous document text before loading new one

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setDocumentError(`Error: ${file.name} is too large (Max 5MB).`);
      setIsDocumentLoading(false);
      return;
    }

    try {
      let textContent = '';
      if (file.type === 'text/plain') {
        textContent = await file.text();
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let filePageText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const tokenizedText = await page.getTextContent();
          filePageText += tokenizedText.items.map(item => (item as any).str).join(' ') + '\n';
        }
        textContent = filePageText.trim();
      } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        textContent = result.value;
      } else {
        setDocumentError(`Error: ${file.name} - Unsupported file type.`);
        setIsDocumentLoading(false);
        return;
      }
      
      setDocumentText(textContent);
      setDocumentError(`Successfully loaded: ${file.name}.`);

    } catch (e: any) {
      console.error(`File processing error for ${file.name}:`, e);
      let errorMessage = `Error: ${file.name} - Failed to process.`;
      if (e.message?.includes("Setting up fake worker failed")) {
        errorMessage += ' (PDF processing component failed to load. Please try again or use a different PDF.)';
      } else if (e.message) {
        errorMessage += ` (${e.message})`;
      }
      setDocumentError(errorMessage);
    } finally {
      setIsDocumentLoading(false);
    }
  }, []);

  const handleUrlFetch = useCallback(async (url: string) => {
    setIsDocumentLoading(true);
    setDocumentError(null);
    setDocumentText(''); 
    if (!url.match(/^https?:\/\//)) {
        setDocumentError("Invalid URL. Please include http:// or https://");
        setIsDocumentLoading(false);
        return;
    }
    try {
      const response = await fetch(url); 
      if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("text/plain") || contentType.includes("text/html"))) {
        const text = await response.text();
        if (contentType.includes("text/html")) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");
            const articleNode = doc.querySelector('article') || doc.querySelector('main') || doc.body;
            let extractedText = "";
            const selectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'article', 'section'];
            articleNode.querySelectorAll(selectors.join(', ')).forEach(el => { extractedText += (el.textContent || "") + "\n"; });
            if (!extractedText.trim()) extractedText = articleNode.textContent || "";
            setDocumentText(extractedText.replace(/\s\s+/g, ' ').trim());
            setDocumentError("Note: HTML content fetched. Text extraction may be imperfect. For best results, copy/paste directly.");
        } else {
            setDocumentText(text);
            setDocumentError(null);
        }
      } else {
         throw new Error(`Unsupported content type: ${contentType || 'unknown'}.`);
      }
    } catch (e: any) {
      console.error("URL Fetch error:", e);
      setDocumentError(`Failed to load from URL: ${e.message}. Often due to CORS. Copy/paste recommended.`);
    } finally {
      setIsDocumentLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    // API Key check is removed as it's now assumed to be in process.env
    if (!query && (selectedTask !== AnalysisTask.SUMMARIZE_DOCUMENT && selectedTask !== AnalysisTask.THEMATIC_CONTENT_ANALYSIS)) {
      setError("Query is required for this task.");
      return;
    }
    if (!documentText && (selectedTask === AnalysisTask.FACT_EXTRACTION || selectedTask === AnalysisTask.QUERY_DOCUMENT || selectedTask === AnalysisTask.THEMATIC_CONTENT_ANALYSIS || (selectedTask === AnalysisTask.SUMMARIZE_DOCUMENT && !query))) {
         setError("Document text is required for this task.");
         return;
    }

    setIsLoading(true);
    setError(null);
    setAiResponse(null);
    const currentPromptSummary = selectedTask === AnalysisTask.WEB_ASSISTED_INSIGHT ? query : `${query || 'N/A'} (doc: ${documentText.substring(0,50)}...)`;

    try {
      // userApiKey is no longer passed; geminiService will use process.env.API_KEY
      const response = await analyzeText(documentText, query, selectedTask, selectedGeminiModel);
      setAiResponse(response);
      addLogEntry({ task: selectedTask, promptSummary: currentPromptSummary, responseSummary: response.text.substring(0, 100) + '...', isError: false });
    } catch (e: any) {
      let errorMessage = "An error occurred during analysis.";
      if (e.message) {
        errorMessage = e.message;
      }
      // Check if error message indicates API key issue, though it should be set via process.env
      if (errorMessage.toLowerCase().includes("api key not valid") || 
          errorMessage.toLowerCase().includes("api_key_invalid") ||
          errorMessage.toLowerCase().includes("api key is not set") || // Generic message if process.env.API_KEY is missing
          errorMessage.toLowerCase().includes("api key for gemini is not provided")) {
         errorMessage = "Gemini API Key is missing or invalid in the application environment. Please ensure it is configured correctly.";
      }
      setError(errorMessage);
      addLogEntry({ task: selectedTask, promptSummary: currentPromptSummary, responseSummary: errorMessage, isError: true });
      console.error("Error during analysis:", e);
    } finally {
      setIsLoading(false);
    }
  }, [documentText, query, selectedTask, addLogEntry, selectedGeminiModel]);

  const currentTaskDescription = TASK_DESCRIPTIONS[selectedTask.toUpperCase().replace(/\s+/g, '_').replace(/[()]/g, '')] || "Select a task to see its description.";

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <Header onSettingsClick={() => setIsSettingsModalOpen(true)} />
      <main className="flex-grow container mx-auto px-4 py-8 space-y-8">
        {isSettingsModalOpen && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            currentModel={selectedGeminiModel}
            onSetModel={setSelectedGeminiModel}
            models={GEMINI_MODELS_LIST}
            currentTheme={theme}
            onSetTheme={setTheme}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div id="input-controls-section" className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg space-y-6 transition-colors duration-300">
            <h2 className="text-2xl font-semibold text-blue-700 dark:text-blue-400 border-b dark:border-slate-700 pb-2">Input & Controls</h2>
            <InputControls
              documentText={documentText}
              setDocumentText={setDocumentText}
              query={query}
              setQuery={setQuery}
              selectedTask={selectedTask}
              setSelectedTask={setSelectedTask}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onFileUpload={handleFileUpload}
              onUrlFetch={handleUrlFetch}
              isDocumentLoading={isDocumentLoading} 
              documentError={documentError} 
            />
             <div className="mt-4 p-3 bg-blue-50 dark:bg-slate-700/60 border border-blue-200 dark:border-slate-600 rounded-md transition-colors duration-300">
              <h4 className="font-semibold text-sm text-blue-600 dark:text-blue-400">Task Guidance:</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{currentTaskDescription}</p>
            </div>
          </div>

          <div id="analysis-result-print-area" className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg space-y-4 transition-colors duration-300">
            <h2 className="text-2xl font-semibold text-green-700 dark:text-green-400 border-b dark:border-slate-700 pb-2">Analysis Result</h2>
            <ResponseDisplay
              response={aiResponse}
              isLoading={isLoading} 
              error={error} 
              task={selectedTask}
              theme={theme}
            />
          </div>
        </div>

        <div id="observability-log-section" className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg transition-colors duration-300">
           <div className="flex justify-between items-center border-b dark:border-slate-700 pb-2 mb-4">
             <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Observability Log</h2>
           </div>
          <ObservabilityLogDisplay logs={logs} onClearLogs={clearLogs} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
