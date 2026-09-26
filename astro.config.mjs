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
  const slug = new URL(url).pathname.match(/^\/proyectos\/([^/]+)\/?$/)?.[1];
  return slug
    ? [`src/case-studies/${slug}.md`, 'src/pages/proyectos/[slug].astro']
    : ['src/pages/index.astro', 'src/components', 'src/layouts', 'src/styles'];
};

// https://astro.build/config
export default defineConfig({
  site: 'https://giuliano-espejo.vercel.app',
  integrations: [
    sitemap({
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
