import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure environment variables are available
    'process.env': process.env,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external connections for Codespaces
    strictPort: true, // Ensure the exact port is used
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Use explicit IPv4 address
        changeOrigin: true,
        secure: false, // Allow insecure connections for local development
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
    // HMR configuration for Codespaces
    hmr: false, // Disable HMR to prevent refreshing issues in Codespaces
  },
  // Suppress console errors for connection refused
  logLevel: 'warn',
}) 