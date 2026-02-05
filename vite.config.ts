import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@jsquash/jpeg', '@jsquash/oxipng', '@jsquash/resize'],
  },
  worker: {
    format: 'es',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
      },
      manifest: {
        name: 'WirthMagePWA',
        short_name: 'WirthMagePWA',
        description: 'CardWirth用画像コンバータPWA版',
        theme_color: '#44cccc',
        background_color: '#ffffff',
        icons: [
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
