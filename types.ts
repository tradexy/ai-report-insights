
export enum AnalysisTask {
  FACT_EXTRACTION = 'Fact Extraction (from provided text)',
  QUERY_DOCUMENT = 'Query Provided Text',
  SUMMARIZE_DOCUMENT = 'Summarize Provided Text',
  WEB_ASSISTED_INSIGHT = 'Web-Assisted Insight', // Renamed from MARKET_INSIGHT_WEB
  THEMATIC_CONTENT_ANALYSIS = 'Thematic Content Analysis',
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: GroundingChunkWeb;
}

export interface ThemeRelationship {
  source: string; // Theme name
  target: string; // Theme name
  strength: number; // A score from 0 to 1 indicating relationship strength in document
}

export interface AiResponseData {
  text: string;
  // This can now hold facts from FACT_EXTRACTION or themes from THEMATIC_CONTENT_ANALYSIS
  extractedFacts?: Record<string, string | number | boolean | null>; // For themes, value is prominence
  themeRelationships?: ThemeRelationship[]; // For THEMATIC_CONTENT_ANALYSIS
  sourceChunks?: GroundingChunk[];
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  task: AnalysisTask | string;
  promptSummary: string; // A summary or the query itself
  responseSummary: string;
  isError: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';