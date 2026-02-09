
import { GoogleGenAI } from "@google/genai";

// Cache for the AI instance
let genAIInstance: any = null;

const getAIInstance = () => {
  if (genAIInstance) return genAIInstance;

  // Exhaustive check for the API key across different environments
  const env = (import.meta as any).env || {};
  const procEnv = (window as any).process?.env || {};

  const apiKey = env.VITE_GEMINI_API_KEY ||
    env.GEMINI_API_KEY ||
    procEnv.VITE_GEMINI_API_KEY ||
    procEnv.GEMINI_API_KEY ||
    (window as any).VITE_GEMINI_API_KEY ||
    "";

  if (!apiKey || apiKey.length < 10) {
    console.error("AI_CORE: API Key is missing or invalid. Found length:", apiKey?.length);
    return null;
  }

  try {
    genAIInstance = new GoogleGenAI(apiKey);
    return genAIInstance;
  } catch (e) {
    console.error("AI_CORE: Initialization failed", e);
    return null;
  }
};


export const getMarketAnalysis = async (userPrompt: string, dashboardContext: any) => {
  if (!dashboardContext) return "AI_CORE: Waiting for system state synchronization...";

  const now = new Date();
  const dateStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  // Prepare context data
  const tickers = dashboardContext.tickers || [];
  const macro = dashboardContext.macro || [];
  const strategy = dashboardContext.today_strategy || {};

  const contextSummary = `
Current Time: ${dateStr} (Shanghai Time)
Market Data:
${tickers.map((t: any) => `- ${t.ticker}: ${t.last_price} (${t.change_percent.toFixed(2)}%)`).join('\n')}

Macro Indicators:
${macro.map((m: any) => `- ${m.indicator_name}: ${m.value} ${m.unit || ''}`).join('\n')}

Strategy & FedWatch:
- Pivot: ${strategy.pivot_points?.p || 'N/A'}
- FedWatch: ${JSON.stringify(strategy.fedwatch || {})}
  `;

  try {
    const ai = getAIInstance();
    if (!ai) return "AI_CORE: Neural link disabled. 请检查 Vercel 环境变量名是否以 'VITE_' 开头 (例如: VITE_GEMINI_API_KEY)。修改后请重新部署项目。";
    // Use the model name from the previous working version if gemini-2.0 fails 
    // or stick to a safer version
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
      systemInstruction: `You are AI_CORE (Agent v5.1), a specialized AI Investment Agent for Professional Gold Traders. 
      
      CRITICAL OPERATIONAL STEPS:
      1. DATA VERIFICATION: Before responding, silently verify if the provided market data has internal conflicts. 
      2. CONTEXTUAL AWARENESS: Use the provided context (Time: ${dateStr}, Market State: ${contextSummary}).
      3. PERSONA: You are elite, cynical but objective, focused on Institutional Flows and Macro Policy.
      4. CHINESE MARKET FOCUS: Always provide specific implications for Chinese investors, specifically domestic Gold ETFs (518880, 159934).
      5. NO GENERIC ADVICE.
      
      RESPONSE FORMAT:
      - Use professional trading terminology.
      - Keep it under 250 words.
      - If data verification fails, start with '[DATA_CAUTION]'.`
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI_CORE ERROR: Neural core unresponsive. Please verify API configuration.";
  }
};
