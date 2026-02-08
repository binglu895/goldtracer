
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMarketAnalysis = async (userPrompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: `You are AI_CORE, the intelligence engine for GOLDTRACER PRO. 
        You specialize in gold markets (XAU/USD), macroeconomics, and institutional flow analysis.
        Respond in a professional, concise, and structured manner. Use markdown for lists or bold text.
        Always consider the context of Gold as a safe-haven asset.`,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with AI_CORE. Please check your connectivity.";
  }
};
