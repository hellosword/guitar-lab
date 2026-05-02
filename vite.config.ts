import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isPwaBuild = mode === 'pwa';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: isPwaBuild ? 'auto' : false,
        // 本地预览默认不保留 PWA 缓存；仅 build:pwa 生成正式离线缓存。
        selfDestroying: !isPwaBuild,
        manifest: {
          name: 'Guitar Lab',
          short_name: 'GuitarLab',
          description: '吉他指板记忆训练与节奏练习',
          theme_color: '#1a1a2e',
          background_color: '#1a1a2e',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
  };
});
