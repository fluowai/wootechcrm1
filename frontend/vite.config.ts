import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:10000',
        changeOrigin: true,
        ws: true,
      },
      '/lp': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
    },
  },
});
