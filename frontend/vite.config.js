import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Em desenvolvimento, o Vite (porta 5173) repassa /api para o backend (porta 3001).
const backend = process.env.VITE_BACKEND || 'http://localhost:3001';

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5173,
    proxy: { '/api': { target: backend, changeOrigin: false } },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
});
