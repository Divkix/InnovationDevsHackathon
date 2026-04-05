import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    headers: {
      // Required for WebAssembly threads (SharedArrayBuffer)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  // TensorFlow.js optimizations
  optimizeDeps: {
    include: ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgl'],
    exclude: ['@tensorflow/tfjs-backend-wasm'] // Let TF.js lazy-load WASM
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true, // Required for TF.js CommonJS modules
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate TF.js into its own chunk for better caching
          'tensorflow': ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgl']
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
  },
})
