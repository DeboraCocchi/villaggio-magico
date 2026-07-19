import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',

  resolve: {
    alias: {
      '@game':       resolve(__dirname, 'src/game'),
      '@components': resolve(__dirname, 'src/components'),
      '@store':      resolve(__dirname, 'src/store'),
      '@api':        resolve(__dirname, 'src/api'),
      '@data':       resolve(__dirname, 'src/data'),
    },
  },

  server: {
    port: 5173,
    open: true,
    host: true, 
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
