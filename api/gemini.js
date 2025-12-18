
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { model, contents, config, userApiKey } = req.body;
    
    // Prioritize the API key provided by the user in the UI
    const apiKey = userApiKey || process.env.API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "Missing API Key. Vui lòng nhập API Key ở góc trên bên trái." });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const result = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config
    });

    const audioPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (audioPart) {
      return res.status(200).json({ audio: audioPart.inlineData.data });
    }

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
