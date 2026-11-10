import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Local API (server/). Must match the server's PORT/HOST defaults. */
const API_DEV_TARGET = 'http://127.0.0.1:3001';

const proxy = {
  // The client always calls same-origin `/api/...`; in dev Vite forwards it to
  // the server, so no CORS is needed. In production a reverse proxy does the same.
  '/api': { target: API_DEV_TARGET, changeOrigin: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Project-specific ports so this app never collides with other local Vite apps (5173/4173).
  server: { port: 5180, strictPort: true, proxy },
  preview: { port: 4180, strictPort: true, proxy },
  build: {
    target: 'es2022',
    // Images are pre-optimised by `npm run images`; never inline them as base64.
    assetsInlineLimit: 0,
  },
});
