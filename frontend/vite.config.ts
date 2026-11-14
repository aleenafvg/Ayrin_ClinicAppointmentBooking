import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      '/doctors': 'http://localhost:3000',
      '/appointments': 'http://localhost:3000',
      '/reports': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
