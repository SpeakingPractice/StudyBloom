import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API requests to Vercel/Local API if needed during local dev
    // Note: To test API locally properly, use `vercel dev` instead of `npm run dev`
  }
});