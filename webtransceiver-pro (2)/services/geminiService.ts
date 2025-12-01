import { GoogleGenAI, Type } from "@google/genai";
import { Transcript } from "../types";

const API_KEY = process.env.API_KEY || '';

export const summarizeTranscripts = async (transcripts: Transcript[]): Promise<string> => {
  if (!API_KEY) {
    return "API Key not found. Unable to summarize.";
  }

  if (transcripts.length === 0) {
    return "No transcripts to summarize.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    // Format transcripts for the prompt
    const conversationText = transcripts
      .map(t => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.userName}: ${t.text}`)
      .join('\n');

    const prompt = `
      You are a communication officer summarizing a radio log.
      Analyze the following transceiver logs and provide a concise summary of the conversation in Japanese.
      Identify key decisions, action items, or reported statuses.

      --- LOGS START ---
      ${conversationText}
      --- LOGS END ---
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Failed to generate summary.";
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "An error occurred while generating the summary.";
  }
};

export const checkContentSafety = async (text: string): Promise<boolean> => {
  if (!API_KEY) return true; // Skip check if API key is missing (development mode)
  if (!text.trim()) return false;

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const prompt = `
      Evaluate if the following text contains inappropriate content (sexual, hate speech, discrimination, extreme profanity) in Japanese or English.
      Text: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSafe: { 
              type: Type.BOOLEAN,
              description: "True if the text is safe and appropriate. False if it contains inappropriate content."
            },
          },
        },
      },
    });

    if (!response.text) return true;
    const result = JSON.parse(response.text);
    return result.isSafe;
  } catch (error) {
    console.error("Safety Check Error:", error);
    return true; // Fail open to avoid blocking users on API error
  }
};