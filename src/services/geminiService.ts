import { GoogleGenAI, Type } from "@google/genai";
import { Transcript } from "../types";

// 【修正箇所】
// Create React Appでは、環境変数は "REACT_APP_" というプレフィックス（接頭辞）が必須です。
// 元の "API_KEY" から "REACT_APP_GEMINI_API_KEY" に変更しました。
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

export const summarizeTranscripts = async (transcripts: Transcript[]): Promise<string> => {
  if (!API_KEY) {
    console.error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY in .env file.");
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
      // ※注意: gemini-2.5-flash が存在しない場合は gemini-1.5-flash に変更してください
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
      // ※注意: gemini-2.5-flash が存在しない場合は gemini-1.5-flash に変更してください
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

    // response.text() はメソッドとして呼び出す必要がある場合があります（SDKのバージョンによります）
    const responseText = response.text;
    if (!responseText) return true;

    const result = JSON.parse(responseText);
    return result.isSafe;
  } catch (error) {
    console.error("Safety Check Error:", error);
    return true; // Fail open to avoid blocking users on API error
  }
};