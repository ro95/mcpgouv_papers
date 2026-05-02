const STOP_WORDS = new Set([
  'sas', 'sasu', 'sarl', 'eurl', 'sa', 'snc', 'sci', 'scop', 'scm', 'ets',
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9 -]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function guessDomains(nomRaisonSociale: string): string[] {
  const slug = slugify(nomRaisonSociale);
  if (!slug) return [];

  const compact = slug.replace(/-/g, '');
  const candidates = new Set<string>();

  candidates.add(`${slug}.fr`);
  candidates.add(`${compact}.fr`);
  candidates.add(`${slug}.com`);
  candidates.add(`${compact}.com`);

  return [...candidates];
}
