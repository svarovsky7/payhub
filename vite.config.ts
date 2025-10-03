import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500, // Увеличиваем лимит для больших vendor библиотек
    rollupOptions: {
      output: {
        manualChunks: {
          // Разделяем vendor библиотеки на отдельные чанки
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
