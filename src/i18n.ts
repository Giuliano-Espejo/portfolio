// Two languages: Spanish at the root, English under /en. Components take a `lang` prop and keep their
// own copy for both languages next to the markup; this module only holds what they share.
export type Lang = 'es' | 'en';

export const LANGS: Lang[] = ['es', 'en'];

export const langFromLocale = (locale?: string): Lang => (locale === 'en' ? 'en' : 'es');

/** Prefix a site path for the given language: '/proyectos/x' → '/en/proyectos/x', '/#proyectos' → '/en/#proyectos' */
export const localize = (path: string, lang: Lang): string => {
  if (lang === 'es') return path;
  if (path === '/') return '/en/';
  return path.startsWith('/#') ? `/en/${path.slice(1)}` : `/en${path}`;
};

/** The same page in the other language (for the ES/EN toggle and hreflang) */
export const pathIn = (pathname: string, lang: Lang): string => {
  const base = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  return localize(base, lang);
};

/** BCP 47 tags for <html lang>, og:locale and inLanguage */
export const htmlLang: Record<Lang, string> = { es: 'es-AR', en: 'en-US' };
export const ogLocale: Record<Lang, string> = { es: 'es_AR', en: 'en_US' };

/** CV file per language */
export const cvFile: Record<Lang, string> = { es: '/Giuliano_Espejo_CV.pdf', en: '/Giuliano_Espejo_CV_EN.pdf' };
