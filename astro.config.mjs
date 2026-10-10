// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';

// Last commit date of the files behind a URL, so search engines know when a page really changed
const lastCommitDate = (paths) => {
  try {
    const out = execSync(`git log -1 --format=%cI -- ${paths.join(' ')}`, { encoding: 'utf8' }).trim();
    return out ? new Date(out) : new Date();
  } catch {
    return new Date();
  }
};

const sourcesFor = (url) => {
  const path = new URL(url).pathname;
  const en = path.startsWith('/en/') || path === '/en';
  const slug = path.match(/^(?:\/en)?\/proyectos\/([^/]+)\/?$/)?.[1];
  return slug
    ? [`src/case-studies/${en ? 'en/' : ''}${slug}.md`, 'src/components/CaseStudyPage.astro']
    : ['src/pages', 'src/components', 'src/layouts', 'src/styles', 'src/i18n.ts'];
};

// https://astro.build/config
export default defineConfig({
  site: 'https://giuliano-espejo.vercel.app',
  // Spanish at the root, English under /en (same pages, translated)
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      // Adds hreflang alternates between each Spanish page and its English twin
      i18n: { defaultLocale: 'es', locales: { es: 'es-AR', en: 'en-US' } },
      serialize(item) {
        item.lastmod = lastCommitDate(sourcesFor(item.url)).toISOString();
        return item;
      },
    }),
  ],
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
