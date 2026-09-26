// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://giuliano-espejo.vercel.app',
  integrations: [sitemap()],
  markdown: {
    // Mermaid blocks stay as plain <pre> so the case study page can render them as diagrams
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid', 'math'],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
