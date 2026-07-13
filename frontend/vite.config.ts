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
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('livekit')) return 'vendor-livekit';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('motion')) return 'vendor-motion';
          if (id.includes('leaflet')) return 'vendor-maps';
          if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) return 'vendor-markdown';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          return undefined;
        },
      },
    },
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
