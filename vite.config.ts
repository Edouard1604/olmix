import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@shared': resolve(__dirname, 'shared') },
  },
  server: { port: 5273, strictPort: true },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    target: 'chrome120',
  },
});
