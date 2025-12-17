import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Handle CORS
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

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API_KEY is not set in environment variables" });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { model, contents, config } = req.body;
    const ai = new GoogleGenAI({ apiKey });
    
    const result = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents,
      config
    });

    return res.status(200).json({ text: result.text });
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return res.status(500).json({ error: error.message });
  }
}