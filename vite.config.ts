import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { AI_SITE_MANIFEST } from './src/data/aiSiteManifest';

const aiManifestJson = JSON.stringify(AI_SITE_MANIFEST).replace(/</g, '\\u003c');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-ai-manifest',
      transformIndexHtml(html) {
        return html.replace(
          '</body>',
          `<script type="application/json" id="portfolio-ai-manifest">${aiManifestJson}</script></body>`,
        );
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    sourcemap: false,
  },
});
