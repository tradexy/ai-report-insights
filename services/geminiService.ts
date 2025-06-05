
import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters, GenerateContentConfig } from "@google/genai";
import { AnalysisTask, AiResponseData, GroundingChunk, ThemeRelationship } from '../types';

const constructPrompt = (documentText: string, query: string, task: AnalysisTask): string => {
  switch (task) {
    case AnalysisTask.FACT_EXTRACTION:
      return `You are an AI Insights Assistant.
Your task is to extract specific facts from the provided text based on the user's query.
The user's query specifies the facts to extract (comma-separated list). For example, if the query is "Revenue, EPS, CEO Name", extract these three items.
Respond ONLY with a valid JSON object. The keys of the JSON object should be the fact names requested in the query, and the values should be the extracted information (string, number, or boolean).
If a fact cannot be found in the text, use "N/A" or null as its value. Do not add any explanatory text, comments, or markdown formatting outside the JSON object.

User Query for facts: "${query}"

Document Text:
"""
${documentText}
"""

Valid JSON Output:`;
    case AnalysisTask.QUERY_DOCUMENT:
      return `You are an AI Insights Assistant.
Based on the provided document text, answer the following query comprehensively but concisely.
Focus on providing actionable insights where possible.

User Query: "${query}"

Document Text:
"""
${documentText}
"""

Analysis:`;
    case AnalysisTask.SUMMARIZE_DOCUMENT:
      return `You are an AI Insights Assistant.
Summarize the key actionable insights from the following document text.
The summary should be concise and highlight the most important information.
${query ? `The user has provided a specific focus for this summary: "${query}". Please tailor your summary accordingly.` : 'Provide a general summary.'}

Document Text:
"""
${documentText}
"""

Summary:`;
    case AnalysisTask.WEB_ASSISTED_INSIGHT: // Renamed
      return `You are an AI Insights Assistant.
Answer the following query using your knowledge and information from Google Search.
Provide a concise and actionable insight. If available, cite your sources based on the search results.

User Query: "${query}"
${documentText ? `Additional Context Provided by User (use if relevant):\n"""\n${documentText}\n"""` : ''}

Analysis (citing sources if applicable from search results):`;
    case AnalysisTask.THEMATIC_CONTENT_ANALYSIS:
      return `You are an AI Insights Assistant.
Your task is to perform a thematic content analysis on the provided document text.
1.  Identify the top 5-10 key themes, topics, or prominent concepts discussed.
2.  For each identified theme, estimate its prominence (e.g., a numerical score from 1-10 or frequency count).
3.  Identify significant relationships *between these identified themes* as found *within the document*.
4.  For each relationship, provide a strength score (a number between 0.0 and 1.0, where 1.0 is a very strong relationship). Only include relationships with a strength of 0.5 or higher.

Respond ONLY with a valid JSON object containing two top-level keys: "themes" and "relationships".
-   The "themes" key should have an object as its value, where each key is a theme name (string) and its value is the prominence score (number).
-   The "relationships" key should have an array as its value. Each element in the array should be an object with three keys: "source" (theme name string), "target" (theme name string), and "strength" (numerical strength score between 0.0 and 1.0).

Example JSON output structure:
{
  "themes": {
    "Market Volatility": 8,
    "Interest Rates": 9,
    "Tech Sector Growth": 7
  },
  "relationships": [
    { "source": "Market Volatility", "target": "Interest Rates", "strength": 0.8 },
    { "source": "Interest Rates", "target": "Tech Sector Growth", "strength": 0.6 }
  ]
}

Do not add any explanatory text, comments, or markdown formatting outside this JSON object.
${query ? `User Guidance for themes (optional): "${query}". Consider this guidance when identifying themes and relationships.` : ''}

Document Text:
"""
${documentText}
"""

Valid JSON Output:`;
    default:
      console.warn(`Unknown task in constructPrompt: ${task}`);
      return query;
  }
};

const parseJsonResponse = (jsonString: string): Record<string, any> | null => {
  try {
    let cleanJsonString = jsonString.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanJsonString.match(fenceRegex);
    if (match && match[2]) {
      cleanJsonString = match[2].trim();
    }
    return JSON.parse(cleanJsonString);
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Original string:", jsonString);
    return null;
  }
};

export const analyzeText = async (
  documentText: string,
  query: string,
  task: AnalysisTask,
  modelName: string
): Promise<AiResponseData> => {
  // API Key is now sourced from process.env.API_KEY
  // Ensure process.env.API_KEY is available in the environment where this code runs.
  if (!process.env.API_KEY) {
    throw new Error("API Key for Gemini is not configured in the environment (process.env.API_KEY).");
  }
  if (!modelName) {
    throw new Error("Gemini model name is not provided.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = constructPrompt(documentText, query, task);

  const generationConfig: GenerateContentConfig = {
    temperature: (task === AnalysisTask.FACT_EXTRACTION || task === AnalysisTask.THEMATIC_CONTENT_ANALYSIS) ? 0.2 : 0.5,
    topK: (task === AnalysisTask.FACT_EXTRACTION || task === AnalysisTask.THEMATIC_CONTENT_ANALYSIS) ? 40 : 64,
    topP: 0.9,
  };

  if (task === AnalysisTask.FACT_EXTRACTION || task === AnalysisTask.THEMATIC_CONTENT_ANALYSIS) {
    generationConfig.responseMimeType = "application/json";
  }

  const requestPayload: GenerateContentParameters = {
    model: modelName, // Use the selected model
    contents: prompt,
    config: generationConfig,
  };

  if (task === AnalysisTask.WEB_ASSISTED_INSIGHT) { // Renamed
    // Web search should not have responseMimeType: "application/json"
    const webSearchConfig: GenerateContentConfig = {
        tools: [{ googleSearch: {} }],
        temperature: 0.5, 
        topK: 64,
        topP: 0.9,
    };
    requestPayload.config = webSearchConfig;
  } else if (modelName === 'gemini-2.5-flash-preview-04-17') {
    // For gemini-2.5-flash-preview-04-17, omit thinkingConfig to use default (enabled) for higher quality
  }


  try {
    const response: GenerateContentResponse = await ai.models.generateContent(requestPayload);
    const responseText = response.text; 

    const aiResponseData: AiResponseData = { text: responseText };

    if ((task === AnalysisTask.FACT_EXTRACTION || task === AnalysisTask.THEMATIC_CONTENT_ANALYSIS) && responseText) {
        const parsedJson = parseJsonResponse(responseText);
        if (parsedJson) {
            if (task === AnalysisTask.THEMATIC_CONTENT_ANALYSIS) {
                aiResponseData.extractedFacts = parsedJson.themes || parsedJson;
                if (parsedJson.relationships && Array.isArray(parsedJson.relationships)) {
                    aiResponseData.themeRelationships = parsedJson.relationships as ThemeRelationship[];
                } else {
                    aiResponseData.themeRelationships = [];
                }
            } else { // FACT_EXTRACTION
                aiResponseData.extractedFacts = parsedJson;
            }
        } else {
            aiResponseData.text = `AI Warning: Expected JSON for ${task} but parsing failed. Raw AI output: ${responseText}`;
            console.warn(`Expected JSON for ${task}, but parsing failed. Raw text:`, responseText);
        }
    } else if ((task === AnalysisTask.FACT_EXTRACTION || task === AnalysisTask.THEMATIC_CONTENT_ANALYSIS) && !responseText) {
        aiResponseData.text = `AI Warning: Expected JSON for ${task} but received an empty response from the AI.`;
        console.warn(`Expected JSON for ${task}, but response.text was empty or undefined.`);
    }

    if (task === AnalysisTask.WEB_ASSISTED_INSIGHT && response.candidates?.[0]?.groundingMetadata?.groundingChunks) { // Renamed
       aiResponseData.sourceChunks = response.candidates[0].groundingMetadata.groundingChunks as GroundingChunk[];
    }

    return aiResponseData;

  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    if (error.message && (error.message.toLowerCase().includes("api key not valid") || 
                           error.message.toLowerCase().includes("api_key_invalid") || 
                           error.message.toLowerCase().includes("api key for gemini is not configured"))) {
      throw new Error("The Gemini API key is missing or invalid in the application's environment configuration. Please ensure it is set correctly. Details: " + error.message);
    }
    if (error.message && error.message.includes("400 Bad Request") && task === AnalysisTask.WEB_ASSISTED_INSIGHT) { // Renamed
         if(error.message.includes("application/json is not supported")){
            throw new Error("Google Search tool does not support JSON response type. This is an internal configuration issue. Original error: " + error.message);
         }
    }
     if (error.message && error.message.includes("model is not supported")) {
      throw new Error(`The selected model "${modelName}" is not supported or is invalid. Please choose a different model in Settings. Details: ${error.message}`);
    }
    throw new Error(`Gemini API request failed: ${error.message || 'Unknown error'}`);
  }
};