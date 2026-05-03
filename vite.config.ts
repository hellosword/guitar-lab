import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

function readGitInfo(command: string, fallback: string): string {
  try {
    const value = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return value || fallback;
  } catch {
    return fallback;
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isPwaBuild = mode === 'pwa';
  const gitBranch = readGitInfo('git branch --show-current', 'dev');
  const gitCommit = readGitInfo('git rev-parse --short HEAD', 'unknown');

  return {
    define: {
      __GIT_BRANCH__: JSON.stringify(gitBranch),
      __GIT_COMMIT__: JSON.stringify(gitCommit),
    },
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
