import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * Điền URL tuyệt đối vào thẻ OG/canonical (crawler của Facebook, Zalo, X cần URL đầy đủ).
 * Ưu tiên VITE_SITE_URL; trên Vercel tự dùng domain production.
 */
function siteUrlPlugin(): Plugin {
  const raw =
    process.env.VITE_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  const siteUrl = raw.replace(/\/$/, '');
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), siteUrlPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
