
// @google/genai guidelines: Use GoogleGenAI from @google/genai
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { model, contents, config } = req.body;
    
    // Ưu tiên lấy Key từ Header x-api-key, nếu không có mới dùng env
    const userApiKey = req.headers['x-api-key'];
    const apiKey = userApiKey || process.env.API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "Configuration Error: Missing API Key. Please provide one in the header or server env." });
    }

    // @google/genai guidelines: Initialize with named parameter
    const ai = new GoogleGenAI({ apiKey });
    
    // @google/genai guidelines: Use ai.models.generateContent directly
    const result = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config
    });

    // Handle multimodal outputs like audio from TTS
    const audioPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (audioPart) {
      return res.status(200).json({ audio: audioPart.inlineData.data });
    }

    // @google/genai guidelines: Use result.text property directly
    return res.status(200).json({ text: result.text });
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    const message = error.message || "";
    if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("too many requests")) {
      return res.status(429).json({ error: "Quota Exceeded", details: message });
    }
    const status = error.status || 500;
    return res.status(status).json({ error: message });
  }
}
