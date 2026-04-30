import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post('/api/gemini', async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      const userApiKey = req.headers['x-api-key'];
      const apiKey = userApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Missing API Key" });
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
    } catch (error: any) {
      console.error("Server API Error:", error);
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
