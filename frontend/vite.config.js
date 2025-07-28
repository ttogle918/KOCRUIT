import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';
import commonjs from 'vite-plugin-commonjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    commonjs(),
    react(), 
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Kocruit - AI 면접 시스템',
        short_name: 'Kocruit',
        description: 'AI 기반 스마트 면접 관리 시스템',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#42a5f5',
        orientation: 'portrait-primary',
        scope: '/',
        lang: 'ko',
        icons: [
          {
            src: '/Logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/Logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['business', 'productivity'],
        shortcuts: [
          {
            name: '면접 진행',
            short_name: '면접',
            description: '면접 진행 페이지로 이동',
            url: '/interview-progress',
            icons: [
              {
                src: '/Logo.png',
                sizes: '192x192'
              }
            ]
          }
        ]
      },
      devOptions: {
        enabled: false, // 개발 중에는 PWA 비활성화
        type: 'module'
      },
      workbox: {
        // Workbox 로그 레벨 조정
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        // 개발 중 로그 최소화
        verbose: false
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
    },
    // WebSocket 프록시 설정
    ws: {
      proxy: {
        '/api': {
          target: 'ws://localhost:8000',
          ws: true
        }
      }
    }
  },
})


