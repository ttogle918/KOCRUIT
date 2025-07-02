import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MyApp',
        short_name: 'MyApp',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#42a5f5',
        icons: [
          {
            src: '/Logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/Logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
    },


  },
})


