import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // MapLibre вдига собствен web worker. Ако Vite го пре-бъндълне в dev,
  // URL-ът на worker-а се чупи („Worker failed to load“), затова го изключваме
  // от pre-bundling и караме worker-ите да са ES модули.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  worker: { format: 'es' },

  build: {
    rollupOptions: {
      output: {
        // Картовият стек е тежък — отделя се, за да не влачи първоначалния bundle.
        manualChunks: {
          maplibre: ['maplibre-gl', 'pmtiles'],
          deck: ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/geo-layers', '@deck.gl/mapbox'],
          charts: ['recharts'],
          leaflet: ['leaflet', 'react-leaflet'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },

  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true }
    }
  }
});
