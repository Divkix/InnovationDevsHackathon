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
  // ONNX Runtime Web optimizations
  optimizeDeps: {
    include: ['onnxruntime-web'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true, // Required for ONNX CommonJS modules
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate ONNX into its own chunk for better caching
          'onnx': ['onnxruntime-web']
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
