import type { Book } from './types';

export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Title without subtitle / series info, normalized. */
export function normalizeTitle(title: string): string {
  const main = title.split(/[:\-–—.]\s/)[0] ?? title;
  return normalizeText(main).replace(/^(el|la|los|las|the|un|una|a|an|l|il|le)\s+/, '');
}

function authorKey(authors: string[]): string {
  const first = authors[0];
  if (!first) return '';
  const parts = normalizeText(first).split(' ').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export function bookKey(b: Pick<Book, 'title' | 'authors'>): string {
  return `${normalizeTitle(b.title)}|${authorKey(b.authors)}`;
}

export function isSameBook(a: Book, b: Book): boolean {
  if (a.id === b.id) return true;
  if (a.isbn && b.isbn && a.isbn === b.isbn) return true;
  const ka = bookKey(a);
  const kb = bookKey(b);
  if (ka === kb) return true;
  // Same title and one side has no author info.
  const [ta, aa] = ka.split('|');
  const [tb, ab] = kb.split('|');
  return ta === tb && (!aa || !ab);
}

export function findDuplicate(candidate: Book, pool: readonly Book[]): Book | undefined {
  return pool.find((b) => isSameBook(candidate, b));
}
