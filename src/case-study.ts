// Shared by the Spanish and English case study routes: frontmatter shape + static paths with "next mission"
import type { MarkdownInstance } from 'astro';

export interface Item { title: string; text: string }

export interface CaseStudy {
  title: string;
  subtitle: string;
  /** Short meta description for search results (~155 chars) */
  description: string;
  summary: string;
  period: string;
  meta: { label: string; value: string }[];
  stack: string[];
  problems: Item[];
  solutions: Item[];
  decisions: Item[];
  learned: string[];
  roleNote?: string;
  demos?: { label: string; href: string }[];
  demoNote?: string;
  image?: string;
  imageAlt?: string;
  imageUrl?: string;
  stats?: { value: string; label: string }[];
}

export interface NextMission { slug: string; title: string }

/** Order of the missions (same as the home's Proyectos section) — drives "Próxima misión / Next mission" */
const ORDER = ['don-inodoros', 'burgame', 'pasta-fiorella'];

/** getStaticPaths result for one language's case studies (pass the page's import.meta.glob) */
export function casePaths(studies: Record<string, MarkdownInstance<CaseStudy>>) {
  const entries = Object.entries(studies).map(([path, study]) => ({ slug: path.split('/').pop()!.replace(/\.md$/, ''), study }));
  return entries.map(({ slug, study }) => {
    const order = ORDER.includes(slug) ? ORDER : entries.map((e) => e.slug);
    const nextSlug = order[(order.indexOf(slug) + 1) % order.length];
    const next = entries.find((e) => e.slug === nextSlug);
    return {
      params: { slug },
      props: { study, next: next && next.slug !== slug ? { slug: next.slug, title: next.study.frontmatter.title } : undefined },
    };
  });
}
