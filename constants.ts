
export const APP_TITLE = "AI Report Insights"; // Renamed

export const GEMINI_MODELS_LIST = [
  'gemini-2.5-flash-preview-04-17',
  // Add other compatible Gemini models here if needed in the future
  // 'gemini-pro', // Example, ensure compatibility before adding
];

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-preview-04-17';

export const TASK_DESCRIPTIONS: Record<string, string> = {
  FACT_EXTRACTION: "Input a document and specify facts to extract (e.g., 'Revenue, Net Profit, CEO'). AI will return JSON of facts and their values, which can be charted.",
  QUERY_DOCUMENT: "Input a document and ask a specific question about its content.",
  SUMMARIZE_DOCUMENT: "Input a document to get a summary. Optionally, specify a focus for the summary in the query field.",
  WEB_ASSISTED_INSIGHT: "Ask a question requiring up-to-date information. The AI will use Google Search. Document input is optional context.", // Updated description
  THEMATIC_CONTENT_ANALYSIS: "Input a document. AI will identify key themes/topics and their estimated prominence. Results are returned as JSON and can be charted. Query input is optional for guidance."
};