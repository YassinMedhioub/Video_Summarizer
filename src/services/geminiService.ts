import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const analyzeVideo = async (
  base64Data: string, 
  mimeType: string
): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      transcript: {
        type: Type.STRING,
        description: "The full verbatim transcript of the video audio.",
      },
      summary: {
        type: Type.STRING,
        description: "A concise, abstractive summary of the video content.",
      },
      keyPoints: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3 to 5 key takeaways or points from the video.",
      },
      sentiment: {
        type: Type.STRING,
        enum: ["Positive", "Neutral", "Negative"],
        description: "The overall sentiment of the content.",
      },
    },
    required: ["transcript", "summary", "keyPoints", "sentiment"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Analyze this video. Generate a transcript, summary, key points, and sentiment.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from Gemini.");
    }

    return JSON.parse(resultText) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};
