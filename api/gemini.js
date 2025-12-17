import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. Get Key from Header (User provided)
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: "Missing API Key. Please enter your Google Gemini API Key in the settings." });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { model, contents, config } = req.body;
    
    // Initialize AI with user's key
    const ai = new GoogleGenAI({ apiKey });
    
    const result = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config
    });

    return res.status(200).json({ text: result.text });
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    
    // Handle specific API error codes
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    
    if (message.includes('403') || message.includes('API_KEY_INVALID')) {
        return res.status(403).json({ error: "Invalid API Key. Please check your key in settings." });
    }
    
    if (message.includes('429')) {
        return res.status(429).json({ error: "Rate limit reached. Please wait a minute before trying again." });
    }

    return res.status(status).json({ error: message });
  }
}