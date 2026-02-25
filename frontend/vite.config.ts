import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: ['edu-resource-frontend.onrender.com'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mermaid': ['mermaid'],
          'vendor-syntax': ['react-syntax-highlighter'],
          'vendor-markdown': ['katex', 'react-markdown'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-ui': ['framer-motion', '@headlessui/react', '@heroicons/react'],
        },
      },
    },
  },
})
