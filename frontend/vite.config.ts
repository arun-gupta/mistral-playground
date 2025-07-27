import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Use explicit IPv4 address
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🔌 Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('📡 Proxying:', req.method, req.url);
          });
        },
      },
    },
    // Disable Vite's ping mechanism to prevent connection refused errors
    hmr: {
      overlay: false, // Disable error overlay for network errors
    },
  },
  // Suppress console errors for connection refused
  logLevel: 'warn',
}) 