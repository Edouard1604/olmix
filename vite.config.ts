import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const { version } = createRequire(import.meta.url)('./package.json');

export default defineConfig({
  plugins: [react()],
  // Affichee dans l'onglet Diagnostic ; cote bureau, Electron fournit la
  // version via `app.getVersion()`, indisponible dans un navigateur.
  define: { __VERSION_APP__: JSON.stringify(version) },
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
