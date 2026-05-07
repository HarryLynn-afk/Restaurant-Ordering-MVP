import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-app': ['firebase/app', 'firebase/auth'],
          'firebase-data': ['firebase/firestore', 'firebase/storage'],
          'firebase-messaging': ['firebase/messaging'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
