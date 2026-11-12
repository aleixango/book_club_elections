import type { Book } from '../domain/types';
import { isSameBook } from '../domain/dedupe';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string | undefined;

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

interface OpenLibraryDoc {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  number_of_pages_median?: number;
}

const https = (u?: string) => u?.replace(/^http:/, 'https:').replace('&edge=curl', '');

function stripHtml(s?: string): string | undefined {
  if (!s) return undefined;
  const doc = new DOMParser().parseFromString(s, 'text/html');
  return doc.body.textContent?.trim() || undefined;
}

function pickIsbn(ids?: { type: string; identifier: string }[]): string | undefined {
  return ids?.find((i) => i.type === 'ISBN_13')?.identifier ?? ids?.find((i) => i.type === 'ISBN_10')?.identifier;
}

function fromGoogle(v: GoogleVolume): Book | null {
  const info = v.volumeInfo;
  if (!info.title) return null;
  const isbn = pickIsbn(info.industryIdentifiers);
  const thumb = https(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail);
  return {
    id: `gb:${v.id}`,
    title: info.title,
    authors: info.authors ?? [],
    cover: thumb
      ? `https://books.google.com/books/content?id=${encodeURIComponent(v.id)}&printsec=frontcover&img=1&zoom=1&fife=w400-h600`
      : undefined,
    coverAlt: thumb ?? (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : undefined),
    description: stripHtml(info.description),
    pages: info.pageCount || undefined,
    year: info.publishedDate?.slice(0, 4),
    isbn,
    source: 'google',
  };
}

function fromOpenLibrary(d: OpenLibraryDoc): Book | null {
  if (!d.title) return null;
  const isbn = d.isbn?.find((i) => i.length === 13) ?? d.isbn?.[0];
  return {
    id: `ol:${d.key}`,
    title: d.title,
    authors: d.author_name ?? [],
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : undefined,
    coverAlt: isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : undefined,
    pages: d.number_of_pages_median || undefined,
    year: d.first_publish_year ? String(d.first_publish_year) : undefined,
    isbn,
    source: 'openlibrary',
  };
}

async function searchGoogle(q: string, signal: AbortSignal): Promise<Book[]> {
  const params = new URLSearchParams({ q, maxResults: '16', printType: 'books' });
  if (GOOGLE_KEY) params.set('key', GOOGLE_KEY);
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal });
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items ?? []).map(fromGoogle).filter((b): b is Book => b !== null);
}

async function searchOpenLibrary(q: string, signal: AbortSignal): Promise<Book[]> {
  const params = new URLSearchParams({
    q,
    limit: '12',
    fields: 'key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median',
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, { signal });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
  return (data.docs ?? []).map(fromOpenLibrary).filter((b): b is Book => b !== null);
}

function merge(primary: Book[], secondary: Book[]): Book[] {
  const out: Book[] = [];
  for (const b of [...primary, ...secondary]) {
    const existing = out.find((o) => isSameBook(o, b));
    if (!existing) out.push(b);
    else {
      // Fill gaps (cover, description) from the other source.
      existing.cover ??= b.cover;
      existing.coverAlt ??= b.cover ?? b.coverAlt;
      existing.description ??= b.description;
      existing.pages ??= b.pages;
      existing.isbn ??= b.isbn;
    }
  }
  // Books with a cover first, preserving relevance otherwise.
  return out.sort((a, b) => Number(!!b.cover) - Number(!!a.cover)).slice(0, 18);
}

export class SearchError extends Error {}

/** Searches Google Books and Open Library in parallel and merges the results. */
export async function searchBooks(query: string, signal: AbortSignal): Promise<Book[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const [g, o] = await Promise.allSettled([searchGoogle(q, signal), searchOpenLibrary(q, signal)]);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  if (g.status === 'rejected' && o.status === 'rejected') {
    throw new SearchError(navigator.onLine ? 'No s’ha pogut fer la cerca. Torna-ho a provar.' : 'Sense connexió a internet.');
  }
  return merge(g.status === 'fulfilled' ? g.value : [], o.status === 'fulfilled' ? o.value : []);
}

/** Fetches a richer description for an Open Library work (lazy, for the detail sheet). */
export async function fetchDescription(book: Book, signal?: AbortSignal): Promise<string | undefined> {
  if (book.description || book.source !== 'openlibrary') return book.description;
  try {
    const res = await fetch(`https://openlibrary.org${book.id.slice(3)}.json`, { signal });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { description?: string | { value: string } };
    const d = data.description;
    return typeof d === 'string' ? d : d?.value;
  } catch {
    return undefined;
  }
}
